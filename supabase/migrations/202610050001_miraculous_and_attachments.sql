-- Regras visíveis aos participantes; somente o mestre pode alterá-las.
begin;
create table if not exists public.rpg_campaign_miraculous (
  campaign_id uuid primary key references public.rpg_campaigns(id) on delete cascade,
  rules jsonb not null default '{"customForms":[],"disabledFormIds":[],"sheetDisabledFormIds":{}}'::jsonb
    check (jsonb_typeof(rules) = 'object' and rules ?& array['customForms','disabledFormIds','sheetDisabledFormIds'] and octet_length(rules::text) <= 100000
      and jsonb_typeof(rules->'customForms') = 'array'
      and jsonb_array_length(rules->'customForms') <= 64
      and jsonb_typeof(rules->'disabledFormIds') = 'array'
      and jsonb_typeof(rules->'sheetDisabledFormIds') = 'object'),
  updated_at timestamptz not null default now()
);
alter table public.rpg_campaign_miraculous enable row level security;
revoke all on public.rpg_campaign_miraculous from anon, authenticated;
grant select, insert, delete on public.rpg_campaign_miraculous to authenticated;
grant update(campaign_id, rules) on public.rpg_campaign_miraculous to authenticated;
drop policy if exists rpg_miraculous_read on public.rpg_campaign_miraculous;
create policy rpg_miraculous_read on public.rpg_campaign_miraculous for select to authenticated
  using (public.rpg_is_campaign_owner(campaign_id) or public.rpg_is_campaign_participant(campaign_id));
drop policy if exists rpg_miraculous_insert on public.rpg_campaign_miraculous;
create policy rpg_miraculous_insert on public.rpg_campaign_miraculous for insert to authenticated
  with check (public.rpg_is_campaign_owner(campaign_id));
drop policy if exists rpg_miraculous_update on public.rpg_campaign_miraculous;
create policy rpg_miraculous_update on public.rpg_campaign_miraculous for update to authenticated
  using (public.rpg_is_campaign_owner(campaign_id)) with check (public.rpg_is_campaign_owner(campaign_id));
drop policy if exists rpg_miraculous_delete on public.rpg_campaign_miraculous;
create policy rpg_miraculous_delete on public.rpg_campaign_miraculous for delete to authenticated
  using (public.rpg_is_campaign_owner(campaign_id));
create or replace function rpg_private.guard_miraculous_rules()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_form jsonb; v_value jsonb;
begin
  if tg_op = 'UPDATE' and new.campaign_id is distinct from old.campaign_id then
    raise exception 'A mesa das regras é fixa' using errcode = '42501';
  end if;
  for v_form in select value from jsonb_array_elements(new.rules->'customForms') loop
    if jsonb_typeof(v_form) <> 'object' or coalesce(v_form->>'id','') !~ '^custom-[a-z0-9-]{1,73}$'
      or char_length(btrim(coalesce(v_form->>'name',''))) not between 1 and 80
      or char_length(coalesce(v_form->>'concept','')) > 120 then
      raise exception 'Miraculous inválido' using errcode = '23514';
    end if;
  end loop;
  for v_value in select value from jsonb_each(new.rules->'sheetDisabledFormIds') loop
    if jsonb_typeof(v_value) <> 'array' then raise exception 'Veto inválido' using errcode = '23514'; end if;
  end loop;
  return new;
end;
$$;
revoke all on function rpg_private.guard_miraculous_rules() from public, anon, authenticated;
drop trigger if exists rpg_miraculous_guard on public.rpg_campaign_miraculous;
create trigger rpg_miraculous_guard before insert or update on public.rpg_campaign_miraculous
  for each row execute function rpg_private.guard_miraculous_rules();
drop trigger if exists rpg_miraculous_touched on public.rpg_campaign_miraculous;
create trigger rpg_miraculous_touched before update on public.rpg_campaign_miraculous
  for each row execute function rpg_private.touch_campaign_record();
drop trigger if exists rpg_miraculous_audit on public.rpg_campaign_miraculous;
create trigger rpg_miraculous_audit after insert or update or delete on public.rpg_campaign_miraculous
  for each row execute function rpg_private.audit_game_change();

alter table public.rpg_campaign_media add column if not exists attachments jsonb not null default '[]'::jsonb
  check (jsonb_typeof(attachments) = 'array' and jsonb_array_length(attachments) <= 8);
grant update(attachments) on public.rpg_campaign_media to authenticated;
create or replace function rpg_private.guard_media_attachments()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_file jsonb; v_owner uuid;
begin
  select owner_id into v_owner from public.rpg_campaigns where id = new.campaign_id;
  for v_file in select value from jsonb_array_elements(new.attachments) loop
    if coalesce(v_file->>'type','') not in ('image','gif','video')
      or coalesce(v_file->>'id','') = '' or char_length(coalesce(v_file->>'name','')) > 255
      or coalesce(v_file->>'path','') not like v_owner::text || '/' || new.campaign_id::text || '/' || new.id::text || '/%'
      or v_file ? 'url' then
      raise exception 'Anexo inválido ou de outra publicação' using errcode = '23514';
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function rpg_private.guard_media_attachments() from public, anon, authenticated;
drop trigger if exists rpg_media_attachments_guard on public.rpg_campaign_media;
create trigger rpg_media_attachments_guard before insert or update of attachments, campaign_id on public.rpg_campaign_media
  for each row execute function rpg_private.guard_media_attachments();

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') and not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rpg_campaign_miraculous'
  ) then alter publication supabase_realtime add table public.rpg_campaign_miraculous; end if;
end $$;
notify pgrst, 'reload schema';
commit;
