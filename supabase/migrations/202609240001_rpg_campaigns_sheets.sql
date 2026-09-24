-- Camada persistente do RPG. Execute depois de 202609170001_rpg_auth.sql.
-- A migração é aditiva: não altera contas nem apaga dados anteriores.
begin;

create table if not exists public.rpg_campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists rpg_campaigns_owner_idx on public.rpg_campaigns(owner_id);

-- Só jogadores convidados aparecem aqui. O mestre é owner_id na campanha.
create table if not exists public.rpg_campaign_members (
  campaign_id uuid not null references public.rpg_campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key(campaign_id, user_id)
);
create index if not exists rpg_campaign_members_user_idx on public.rpg_campaign_members(user_id);

-- Definer helpers break RLS recursion. Every answer is scoped to auth.uid().
create or replace function public.rpg_is_campaign_owner(p_campaign_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.rpg_campaigns c
    where c.id = p_campaign_id and c.owner_id = (select auth.uid())
  );
$$;
create or replace function public.rpg_is_campaign_participant(p_campaign_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.rpg_is_campaign_owner(p_campaign_id) or exists (
    select 1 from public.rpg_campaign_members m
    where m.campaign_id = p_campaign_id and m.user_id = (select auth.uid())
  );
$$;
create or replace function public.rpg_can_link_sheet(p_campaign_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_campaign_id is null or exists (
    select 1 from public.rpg_campaign_members m
    join public.rpg_campaigns c on c.id = m.campaign_id
    where m.campaign_id = p_campaign_id
      and m.user_id = (select auth.uid())
      and c.owner_id <> (select auth.uid())
  );
$$;
revoke all on function public.rpg_is_campaign_owner(uuid) from public, anon;
revoke all on function public.rpg_is_campaign_participant(uuid) from public, anon;
revoke all on function public.rpg_can_link_sheet(uuid) from public, anon;
grant execute on function public.rpg_is_campaign_owner(uuid), public.rpg_is_campaign_participant(uuid), public.rpg_can_link_sheet(uuid) to authenticated;

create table if not exists public.rpg_sheets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid references public.rpg_campaigns(id) on delete set null,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rpg_sheet_civil_details_only check (
    jsonb_typeof(details) = 'object'
    and not (details ? 'forms') and not (details ? 'abilities')
    and octet_length(details::text) <= 262144
  )
);
create index if not exists rpg_sheets_owner_idx on public.rpg_sheets(owner_id);
create index if not exists rpg_sheets_campaign_idx on public.rpg_sheets(campaign_id) where campaign_id is not null;
-- Cada participante representa uma ficha ativa por campanha no painel do mestre.
-- Fichas soltas continuam ilimitadas.
create unique index if not exists rpg_sheets_one_per_player_campaign_idx
  on public.rpg_sheets(campaign_id, owner_id) where campaign_id is not null;

create or replace function public.rpg_is_sheet_campaign_owner(p_sheet_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.rpg_sheets s
    join public.rpg_campaigns c on c.id = s.campaign_id
    where s.id = p_sheet_id and c.owner_id = (select auth.uid())
  );
$$;
create or replace function public.rpg_is_sheet_owner(p_sheet_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.rpg_sheets s
    where s.id = p_sheet_id and s.owner_id = (select auth.uid())
  );
$$;
revoke all on function public.rpg_is_sheet_campaign_owner(uuid), public.rpg_is_sheet_owner(uuid) from public, anon;
grant execute on function public.rpg_is_sheet_campaign_owner(uuid), public.rpg_is_sheet_owner(uuid) to authenticated;

-- A ficha civil é editada pelo jogador. Apenas o mestre da campanha vinculada
-- escreve os bônus de transformação e as habilidades.
create table if not exists public.rpg_sheet_master_data (
  sheet_id uuid primary key references public.rpg_sheets(id) on delete cascade,
  forms jsonb not null default '[]'::jsonb check (jsonb_typeof(forms) = 'array' and octet_length(forms::text) <= 65536),
  abilities jsonb not null default '[]'::jsonb check (jsonb_typeof(abilities) = 'array' and octet_length(abilities::text) <= 65536),
  updated_at timestamptz not null default now()
);

-- NPCs, rolagens, inventário e notas privadas da mesa nunca são selecionáveis
-- pelo jogador. Conteúdo compartilhado e chat têm tabelas próprias abaixo.
create table if not exists public.rpg_campaign_master_data (
  campaign_id uuid primary key references public.rpg_campaigns(id) on delete cascade,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 1048576),
  updated_at timestamptz not null default now()
);

create table if not exists public.rpg_campaign_media (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.rpg_campaigns(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  subtitle text not null default '' check (char_length(subtitle) <= 160),
  description text not null default '' check (char_length(description) <= 5000),
  image_path text check (image_path is null or (char_length(image_path) <= 500 and image_path !~* '^data:')),
  shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists rpg_campaign_media_campaign_idx on public.rpg_campaign_media(campaign_id);

create table if not exists public.rpg_campaign_notes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.rpg_campaigns(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  body text not null default '' check (char_length(body) <= 10000),
  shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists rpg_campaign_notes_campaign_idx on public.rpg_campaign_notes(campaign_id);

create table if not exists public.rpg_campaign_messages (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.rpg_campaigns(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default 'Jogador',
  body text not null check (char_length(btrim(body)) between 1 and 1500),
  created_at timestamptz not null default now()
);
create index if not exists rpg_campaign_messages_campaign_idx on public.rpg_campaign_messages(campaign_id, created_at);

create or replace function rpg_private.touch_campaign_record()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function rpg_private.touch_campaign_record() from public, anon, authenticated;

create or replace function rpg_private.clear_old_sheet_grants()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.campaign_id is distinct from new.campaign_id then
    delete from public.rpg_sheet_master_data where sheet_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function rpg_private.clear_old_sheet_grants() from public, anon, authenticated;

create or replace function rpg_private.set_campaign_message_author()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- The sender cannot forge another player's display name or timestamp.
  if new.author_id is distinct from auth.uid() then
    raise exception 'Autor inválido' using errcode = '42501';
  end if;
  select p.display_name into new.author_name from public.rpg_profiles p where p.id = new.author_id;
  new.author_name := coalesce(new.author_name, 'Jogador');
  new.created_at := now();
  return new;
end;
$$;
revoke all on function rpg_private.set_campaign_message_author() from public, anon, authenticated;

do $$
declare target_table text;
begin
  foreach target_table in array array[
    'rpg_campaigns', 'rpg_sheets', 'rpg_sheet_master_data',
    'rpg_campaign_master_data', 'rpg_campaign_media', 'rpg_campaign_notes'
  ] loop
    if not exists (
      select 1 from pg_trigger where tgname = target_table || '_touched'
        and tgrelid = ('public.' || target_table)::regclass
    ) then
      execute format('create trigger %I before update on public.%I for each row execute function rpg_private.touch_campaign_record()', target_table || '_touched', target_table);
    end if;
  end loop;
  if not exists (select 1 from pg_trigger where tgname = 'rpg_sheet_link_changed' and tgrelid = 'public.rpg_sheets'::regclass) then
    create trigger rpg_sheet_link_changed after update of campaign_id on public.rpg_sheets
      for each row execute function rpg_private.clear_old_sheet_grants();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'rpg_campaign_message_author' and tgrelid = 'public.rpg_campaign_messages'::regclass) then
    create trigger rpg_campaign_message_author before insert on public.rpg_campaign_messages
      for each row execute function rpg_private.set_campaign_message_author();
  end if;
end $$;

alter table public.rpg_campaigns enable row level security;
alter table public.rpg_campaign_members enable row level security;
alter table public.rpg_sheets enable row level security;
alter table public.rpg_sheet_master_data enable row level security;
alter table public.rpg_campaign_master_data enable row level security;
alter table public.rpg_campaign_media enable row level security;
alter table public.rpg_campaign_notes enable row level security;
alter table public.rpg_campaign_messages enable row level security;

revoke all on public.rpg_campaigns, public.rpg_campaign_members, public.rpg_sheets,
  public.rpg_sheet_master_data, public.rpg_campaign_master_data,
  public.rpg_campaign_media, public.rpg_campaign_notes, public.rpg_campaign_messages
  from public, anon, authenticated;
grant select, insert, delete on public.rpg_campaigns to authenticated;
grant update(name) on public.rpg_campaigns to authenticated;
grant select on public.rpg_campaign_members to authenticated;
grant select, insert, delete on public.rpg_sheets to authenticated;
grant update(name, campaign_id, details) on public.rpg_sheets to authenticated;
grant select, insert, delete on public.rpg_sheet_master_data to authenticated;
grant update(forms, abilities) on public.rpg_sheet_master_data to authenticated;
grant select, insert, delete on public.rpg_campaign_master_data to authenticated;
grant update(data) on public.rpg_campaign_master_data to authenticated;
grant select, insert, delete on public.rpg_campaign_media, public.rpg_campaign_notes to authenticated;
grant update(title, subtitle, description, image_path, shared) on public.rpg_campaign_media to authenticated;
grant update(title, body, shared) on public.rpg_campaign_notes to authenticated;
grant select, insert, delete on public.rpg_campaign_messages to authenticated;

create policy rpg_campaign_read_participant on public.rpg_campaigns for select to authenticated
  using (owner_id = (select auth.uid()) or public.rpg_is_campaign_participant(id));
create policy rpg_campaign_insert_owner on public.rpg_campaigns for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy rpg_campaign_update_owner on public.rpg_campaigns for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy rpg_campaign_delete_owner on public.rpg_campaigns for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy rpg_campaign_member_read on public.rpg_campaign_members for select to authenticated
  using (user_id = (select auth.uid()) or public.rpg_is_campaign_owner(campaign_id));

create policy rpg_sheet_read on public.rpg_sheets for select to authenticated
  using (owner_id = (select auth.uid()) or (campaign_id is not null and public.rpg_is_campaign_owner(campaign_id)));
create policy rpg_sheet_insert_owner on public.rpg_sheets for insert to authenticated
  with check (owner_id = (select auth.uid()) and public.rpg_can_link_sheet(campaign_id));
create policy rpg_sheet_update_owner on public.rpg_sheets for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and public.rpg_can_link_sheet(campaign_id));
create policy rpg_sheet_delete_owner on public.rpg_sheets for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy rpg_sheet_master_data_read on public.rpg_sheet_master_data for select to authenticated
  using (public.rpg_is_sheet_owner(sheet_id) or public.rpg_is_sheet_campaign_owner(sheet_id));
create policy rpg_sheet_master_data_insert on public.rpg_sheet_master_data for insert to authenticated
  with check (public.rpg_is_sheet_campaign_owner(sheet_id));
create policy rpg_sheet_master_data_update on public.rpg_sheet_master_data for update to authenticated
  using (public.rpg_is_sheet_campaign_owner(sheet_id)) with check (public.rpg_is_sheet_campaign_owner(sheet_id));
create policy rpg_sheet_master_data_delete on public.rpg_sheet_master_data for delete to authenticated
  using (public.rpg_is_sheet_campaign_owner(sheet_id));

create policy rpg_campaign_master_data_read on public.rpg_campaign_master_data for select to authenticated
  using (public.rpg_is_campaign_owner(campaign_id));
create policy rpg_campaign_master_data_insert on public.rpg_campaign_master_data for insert to authenticated
  with check (public.rpg_is_campaign_owner(campaign_id));
create policy rpg_campaign_master_data_update on public.rpg_campaign_master_data for update to authenticated
  using (public.rpg_is_campaign_owner(campaign_id)) with check (public.rpg_is_campaign_owner(campaign_id));
create policy rpg_campaign_master_data_delete on public.rpg_campaign_master_data for delete to authenticated
  using (public.rpg_is_campaign_owner(campaign_id));

create policy rpg_campaign_media_read on public.rpg_campaign_media for select to authenticated
  using (public.rpg_is_campaign_owner(campaign_id) or (shared and public.rpg_is_campaign_participant(campaign_id)));
create policy rpg_campaign_media_insert on public.rpg_campaign_media for insert to authenticated
  with check (public.rpg_is_campaign_owner(campaign_id));
create policy rpg_campaign_media_update on public.rpg_campaign_media for update to authenticated
  using (public.rpg_is_campaign_owner(campaign_id)) with check (public.rpg_is_campaign_owner(campaign_id));
create policy rpg_campaign_media_delete on public.rpg_campaign_media for delete to authenticated
  using (public.rpg_is_campaign_owner(campaign_id));

create policy rpg_campaign_notes_read on public.rpg_campaign_notes for select to authenticated
  using (public.rpg_is_campaign_owner(campaign_id) or (shared and public.rpg_is_campaign_participant(campaign_id)));
create policy rpg_campaign_notes_insert on public.rpg_campaign_notes for insert to authenticated
  with check (public.rpg_is_campaign_owner(campaign_id));
create policy rpg_campaign_notes_update on public.rpg_campaign_notes for update to authenticated
  using (public.rpg_is_campaign_owner(campaign_id)) with check (public.rpg_is_campaign_owner(campaign_id));
create policy rpg_campaign_notes_delete on public.rpg_campaign_notes for delete to authenticated
  using (public.rpg_is_campaign_owner(campaign_id));

create policy rpg_campaign_messages_read on public.rpg_campaign_messages for select to authenticated
  using (public.rpg_is_campaign_participant(campaign_id));
create policy rpg_campaign_messages_insert on public.rpg_campaign_messages for insert to authenticated
  with check (author_id = (select auth.uid()) and public.rpg_is_campaign_participant(campaign_id));
create policy rpg_campaign_messages_delete on public.rpg_campaign_messages for delete to authenticated
  using (author_id = (select auth.uid()) or public.rpg_is_campaign_owner(campaign_id));

-- Raw invite codes live only in a private schema, never in rows readable by players.
create table if not exists rpg_private.campaign_invites (
  campaign_id uuid primary key references public.rpg_campaigns(id) on delete cascade,
  code text not null unique check (code ~ '^[a-f0-9]{32}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists rpg_campaign_invites_code_idx on rpg_private.campaign_invites(code);
alter table rpg_private.campaign_invites enable row level security;
revoke all on rpg_private.campaign_invites from public, anon, authenticated;

-- Gerar novamente troca o convite anterior. A interface deve mostrar o código
-- retornado imediatamente; ele não pode ser consultado depois por SELECT.
create or replace function public.rpg_create_campaign_invite(p_campaign_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare invite_code text;
begin
  if not public.rpg_is_campaign_owner(p_campaign_id) then
    raise exception 'Apenas o mestre pode criar convites.' using errcode = '42501';
  end if;
  invite_code := replace(gen_random_uuid()::text, '-', '');
  insert into rpg_private.campaign_invites(campaign_id, code, created_at, expires_at)
    values(p_campaign_id, invite_code, now(), now() + interval '30 days')
    on conflict (campaign_id) do update set
      code = excluded.code, created_at = excluded.created_at, expires_at = excluded.expires_at;
  return invite_code;
end;
$$;

create or replace function public.rpg_revoke_campaign_invite(p_campaign_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.rpg_is_campaign_owner(p_campaign_id) then
    raise exception 'Apenas o mestre pode revogar convites.' using errcode = '42501';
  end if;
  delete from rpg_private.campaign_invites where campaign_id = p_campaign_id;
end;
$$;

create or replace function public.rpg_join_campaign_by_code(p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare target_campaign uuid;
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta para usar um convite.' using errcode = '42501';
  end if;
  if p_code is null or lower(btrim(p_code)) !~ '^[a-f0-9]{32}$' then
    raise exception 'Convite inválido ou expirado.' using errcode = '22023';
  end if;
  select i.campaign_id into target_campaign from rpg_private.campaign_invites i
    where i.code = lower(btrim(p_code)) and i.expires_at > now();
  if target_campaign is null then
    raise exception 'Convite inválido ou expirado.' using errcode = '22023';
  end if;
  if public.rpg_is_campaign_owner(target_campaign) then
    raise exception 'Você já é o mestre desta campanha.' using errcode = '22023';
  end if;
  insert into public.rpg_campaign_members(campaign_id, user_id)
    values (target_campaign, auth.uid()) on conflict do nothing;
  return target_campaign;
end;
$$;
revoke all on function public.rpg_create_campaign_invite(uuid), public.rpg_revoke_campaign_invite(uuid), public.rpg_join_campaign_by_code(text) from public, anon;
grant execute on function public.rpg_create_campaign_invite(uuid), public.rpg_revoke_campaign_invite(uuid), public.rpg_join_campaign_by_code(text) to authenticated;

-- Restrict profile lookup to the master; profile RLS remains private elsewhere.
create or replace function public.rpg_campaign_participants(p_campaign_id uuid)
returns table(user_id uuid, display_name text, username text, joined_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.rpg_is_campaign_owner(p_campaign_id) then
    raise exception 'Apenas o mestre pode ver participantes.' using errcode = '42501';
  end if;
  return query
    select m.user_id, p.display_name, p.username, m.joined_at
    from public.rpg_campaign_members m
    join public.rpg_profiles p on p.id = m.user_id
    where m.campaign_id = p_campaign_id
    order by m.joined_at;
end;
$$;
revoke all on function public.rpg_campaign_participants(uuid) from public, anon;
grant execute on function public.rpg_campaign_participants(uuid) to authenticated;

commit;
