-- Execute uma vez no SQL Editor do projeto Supabase existente.
-- Somente objetos rpg_* são criados; não remove tabelas, contas ou dados existentes.
-- Senhas e e-mails pertencem ao Supabase Auth, nunca à tabela de perfis.
begin;

create schema if not exists rpg_private;
revoke all on schema rpg_private from public, anon, authenticated;
grant usage on schema rpg_private to service_role;

create table if not exists public.rpg_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text not null default 'Jogador',
  bio text not null default '',
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rpg_username_format check (
    username is null or username ~ '^[a-z0-9][a-z0-9_.-]{2,31}$'
  ),
  constraint rpg_display_name_length check (char_length(btrim(display_name)) between 1 and 80),
  constraint rpg_bio_length check (char_length(bio) <= 300),
  constraint rpg_avatar_owner_path check (
    avatar_path is null or (
      char_length(avatar_path) <= 240 and
      split_part(avatar_path, '/', 1) = id::text and
      avatar_path !~ '(^|/)\.\.(/|$)'
    )
  )
);

alter table public.rpg_profiles enable row level security;
revoke all on public.rpg_profiles from public, anon, authenticated;
grant select on public.rpg_profiles to authenticated;
grant update (username, display_name, bio, avatar_path) on public.rpg_profiles to authenticated;
grant all on public.rpg_profiles to service_role;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'rpg_profiles' and policyname = 'rpg_profile_read_own') then
    create policy rpg_profile_read_own on public.rpg_profiles for select to authenticated
      using (id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'rpg_profiles' and policyname = 'rpg_profile_update_own') then
    create policy rpg_profile_update_own on public.rpg_profiles for update to authenticated
      using (id = (select auth.uid())) with check (id = (select auth.uid()));
  end if;
end $$;

create or replace function rpg_private.touch_profile()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function rpg_private.touch_profile() from public, anon, authenticated;

create or replace function rpg_private.create_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  selected_username text;
  selected_name text;
begin
  -- OAuth usernames belong to the provider and may not follow our naming rules.
  -- Discord users choose their unique site username after signing in.
  if coalesce(new.raw_app_meta_data ->> 'provider', 'email') = 'email' then
    selected_username := nullif(lower(btrim(new.raw_user_meta_data ->> 'username')), '');
  end if;
  selected_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    selected_username, 'Jogador'
  );
  insert into public.rpg_profiles (id, username, display_name, bio)
  values (
    new.id, selected_username, left(selected_name, 80),
    left(coalesce(new.raw_user_meta_data ->> 'bio', ''), 300)
  ) on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function rpg_private.create_profile() from public, anon, authenticated;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'rpg_profile_created' and tgrelid = 'auth.users'::regclass) then
    create trigger rpg_profile_created after insert on auth.users
      for each row execute function rpg_private.create_profile();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'rpg_profile_updated' and tgrelid = 'public.rpg_profiles'::regclass) then
    create trigger rpg_profile_updated before update on public.rpg_profiles
      for each row execute function rpg_private.touch_profile();
  end if;
end $$;

-- Existing accounts are preserved. They choose a username when they next sign in.
insert into public.rpg_profiles (id, display_name)
select id, left(coalesce(nullif(btrim(raw_user_meta_data ->> 'display_name'), ''), 'Jogador'), 80)
from auth.users on conflict (id) do nothing;

-- Only keyed hashes are stored here, not raw IP addresses or usernames.
create table if not exists rpg_private.login_attempts (
  bucket text primary key,
  window_start timestamptz not null,
  attempts integer not null check (attempts > 0)
);
create index if not exists rpg_login_attempts_expiration on rpg_private.login_attempts (window_start);
alter table rpg_private.login_attempts enable row level security;
revoke all on rpg_private.login_attempts from public, anon, authenticated;

create or replace function rpg_private.consume_login_attempt(p_bucket text, p_limit integer, p_window interval)
returns boolean language plpgsql security definer set search_path = '' as $$
declare used integer;
begin
  insert into rpg_private.login_attempts as existing (bucket, window_start, attempts)
  values (p_bucket, clock_timestamp(), 1)
  on conflict (bucket) do update set
    attempts = case when existing.window_start <= clock_timestamp() - p_window then 1 else least(existing.attempts + 1, p_limit + 1) end,
    window_start = case when existing.window_start <= clock_timestamp() - p_window then clock_timestamp() else existing.window_start end
  returning attempts into used;
  return used <= p_limit;
end;
$$;
revoke all on function rpg_private.consume_login_attempt(text, integer, interval) from public, anon, authenticated;

create or replace function rpg_private.password_login_lookup(p_username text, p_ip_hash text, p_username_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  allowed_global boolean;
  allowed_ip boolean;
  allowed_username boolean;
  login_email text;
begin
  if p_username is null or p_username !~ '^[a-z0-9][a-z0-9_.-]{2,31}$'
     or p_ip_hash is null or p_ip_hash !~ '^[a-f0-9]{64}$'
     or p_username_hash is null or p_username_hash !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('allowed', false);
  end if;
  delete from rpg_private.login_attempts where window_start < now() - interval '1 day';
  -- Global cap also bounds abuse when a proxy obscures client IPs.
  -- Counters increment even for unknown usernames and failed passwords.
  allowed_global := rpg_private.consume_login_attempt('global', 120, interval '1 minute');
  if not allowed_global then return jsonb_build_object('allowed', false); end if;
  allowed_ip := rpg_private.consume_login_attempt('ip:' || p_ip_hash, 30, interval '15 minutes');
  if not allowed_ip then return jsonb_build_object('allowed', false); end if;
  allowed_username := rpg_private.consume_login_attempt('user:' || p_username_hash, 10, interval '15 minutes');
  if not allowed_username then return jsonb_build_object('allowed', false); end if;

  select u.email into login_email
  from public.rpg_profiles p join auth.users u on u.id = p.id
  where p.username = p_username;
  return jsonb_build_object('allowed', true, 'email', login_email);
end;
$$;
revoke all on function rpg_private.password_login_lookup(text, text, text) from public, anon, authenticated;
grant execute on function rpg_private.password_login_lookup(text, text, text) to service_role;

-- Public API wrapper runs with the caller's privileges, never elevated privileges.
-- Only the server-side Edge Function's service role can call the private lookup.
create or replace function public.rpg_password_login_lookup(p_username text, p_ip_hash text, p_username_hash text)
returns jsonb language sql security invoker set search_path = '' as $$
  select rpg_private.password_login_lookup(p_username, p_ip_hash, p_username_hash);
$$;
revoke all on function public.rpg_password_login_lookup(text, text, text) from public, anon, authenticated;
grant execute on function public.rpg_password_login_lookup(text, text, text) to service_role;

-- Private profile photos. Existing buckets are left untouched on a name collision.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('rpg-avatars', 'rpg-avatars', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

do $$ begin
  if not exists (select 1 from storage.buckets where id = 'rpg-avatars' and public = false and file_size_limit = 5242880 and allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']) then
    raise exception 'O bucket rpg-avatars já existe com outra configuração. Revise-o antes de aplicar este SQL.';
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'rpg_avatar_read_own') then
    create policy rpg_avatar_read_own on storage.objects for select to authenticated
      using (bucket_id = 'rpg-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'rpg_avatar_insert_own') then
    create policy rpg_avatar_insert_own on storage.objects for insert to authenticated
      with check (bucket_id = 'rpg-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'rpg_avatar_update_own') then
    create policy rpg_avatar_update_own on storage.objects for update to authenticated
      using (bucket_id = 'rpg-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
      with check (bucket_id = 'rpg-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'rpg_avatar_delete_own') then
    create policy rpg_avatar_delete_own on storage.objects for delete to authenticated
      using (bucket_id = 'rpg-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
  end if;
end $$;

commit;
