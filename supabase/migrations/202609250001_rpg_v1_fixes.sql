-- Complemento aditivo. Não apaga contas, campanhas, fichas ou mensagens existentes.
-- Aplicar depois de 202609240001_rpg_campaigns_sheets.sql.
begin;

-- O PostgREST inclui a chave no UPDATE gerado por UPSERT. A chave continua
-- imutável por trigger, mas o UPDATE do mestre deixa de falhar com 42501.
grant update(campaign_id, data) on public.rpg_campaign_master_data to authenticated;
grant update(sheet_id, forms, abilities) on public.rpg_sheet_master_data to authenticated;
create or replace function rpg_private.keep_upsert_key()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_table_name = 'rpg_campaign_master_data' then
    if new.campaign_id is distinct from old.campaign_id then
      raise exception 'Não é possível mover os dados privados para outra mesa.' using errcode = '42501';
    end if;
  elsif tg_table_name = 'rpg_sheet_master_data' then
    if new.sheet_id is distinct from old.sheet_id then
      raise exception 'Não é possível mover bônus para outra ficha.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function rpg_private.keep_upsert_key() from public, anon, authenticated;
drop trigger if exists rpg_campaign_master_key_fixed on public.rpg_campaign_master_data;
create trigger rpg_campaign_master_key_fixed before update on public.rpg_campaign_master_data
  for each row execute function rpg_private.keep_upsert_key();
drop trigger if exists rpg_sheet_master_key_fixed on public.rpg_sheet_master_data;
create trigger rpg_sheet_master_key_fixed before update on public.rpg_sheet_master_data
  for each row execute function rpg_private.keep_upsert_key();

-- O mestre pode corrigir/vetar nome e dados civis de fichas vinculadas à sua
-- mesa; o vínculo e o dono nunca podem ser trocados por essa permissão.
create or replace function rpg_private.guard_master_sheet_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'O dono da ficha não pode ser alterado.' using errcode = '42501';
  end if;
  if auth.uid() is distinct from old.owner_id then
    if not public.rpg_is_campaign_owner(old.campaign_id) or new.campaign_id is distinct from old.campaign_id then
      raise exception 'O mestre pode alterar apenas dados da ficha vinculada à sua mesa.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function rpg_private.guard_master_sheet_update() from public, anon, authenticated;
drop trigger if exists rpg_master_sheet_update_guard on public.rpg_sheets;
create trigger rpg_master_sheet_update_guard before update on public.rpg_sheets
  for each row execute function rpg_private.guard_master_sheet_update();
drop policy if exists rpg_sheet_update_master on public.rpg_sheets;
create policy rpg_sheet_update_master on public.rpg_sheets for update to authenticated
  using (campaign_id is not null and public.rpg_is_campaign_owner(campaign_id))
  with check (campaign_id is not null and public.rpg_is_campaign_owner(campaign_id));

-- O convite pertence à mesa e não expira nem muda. Códigos já emitidos são
-- preservados, inclusive os que haviam vencido no esquema anterior.
update rpg_private.campaign_invites set expires_at = 'infinity'::timestamptz;
alter table rpg_private.campaign_invites alter column expires_at set default 'infinity'::timestamptz;
create or replace function public.rpg_create_campaign_invite(p_campaign_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare invite_code text;
begin
  if not public.rpg_is_campaign_owner(p_campaign_id) then
    raise exception 'Apenas o mestre pode consultar o código da mesa.' using errcode = '42501';
  end if;
  insert into rpg_private.campaign_invites(campaign_id, code)
    values (p_campaign_id, replace(gen_random_uuid()::text, '-', ''))
    on conflict (campaign_id) do nothing;
  select code into invite_code from rpg_private.campaign_invites where campaign_id = p_campaign_id;
  return invite_code;
end;
$$;
create or replace function public.rpg_revoke_campaign_invite(p_campaign_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.rpg_is_campaign_owner(p_campaign_id) then
    raise exception 'Apenas o mestre pode consultar o código da mesa.' using errcode = '42501';
  end if;
  raise exception 'O código da mesa é permanente e não pode ser revogado.' using errcode = '22023';
end;
$$;
create or replace function rpg_private.keep_invite_code()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.code is distinct from old.code then
    raise exception 'O código da mesa é permanente.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function rpg_private.keep_invite_code() from public, anon, authenticated;
drop trigger if exists rpg_invite_code_fixed on rpg_private.campaign_invites;
create trigger rpg_invite_code_fixed before update on rpg_private.campaign_invites
  for each row execute function rpg_private.keep_invite_code();

-- Canais do mural criados e organizados pelo mestre.
create table if not exists public.rpg_campaign_categories (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.rpg_campaigns(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text not null default '' check (char_length(description) <= 500),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists rpg_categories_campaign_idx on public.rpg_campaign_categories(campaign_id, sort_order);
alter table public.rpg_campaign_media add column if not exists category_id uuid references public.rpg_campaign_categories(id) on delete set null;
alter table public.rpg_campaign_media add column if not exists media_type text not null default 'image'
  check (media_type in ('image','gif','video','text'));
alter table public.rpg_campaign_media add column if not exists media_url text
  check (media_url is null or (char_length(media_url) <= 2048 and media_url ~* '^https://'));
alter table public.rpg_campaign_media add column if not exists author_id uuid references auth.users(id) on delete set null default auth.uid();
alter table public.rpg_campaign_notes add column if not exists category_id uuid references public.rpg_campaign_categories(id) on delete set null;
alter table public.rpg_campaign_notes add column if not exists author_id uuid references auth.users(id) on delete set null default auth.uid();
create or replace function rpg_private.check_content_category()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.category_id is not null and not exists (
    select 1 from public.rpg_campaign_categories c where c.id = new.category_id and c.campaign_id = new.campaign_id
  ) then
    raise exception 'Categoria não pertence a esta mesa.' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function rpg_private.check_content_category() from public, anon, authenticated;
drop trigger if exists rpg_media_category_guard on public.rpg_campaign_media;
create trigger rpg_media_category_guard before insert or update of category_id,campaign_id on public.rpg_campaign_media
  for each row execute function rpg_private.check_content_category();
drop trigger if exists rpg_note_category_guard on public.rpg_campaign_notes;
create trigger rpg_note_category_guard before insert or update of category_id,campaign_id on public.rpg_campaign_notes
  for each row execute function rpg_private.check_content_category();
grant update(category_id, media_type, media_url) on public.rpg_campaign_media to authenticated;
grant update(category_id) on public.rpg_campaign_notes to authenticated;
drop policy if exists rpg_campaign_media_read on public.rpg_campaign_media;
create policy rpg_campaign_media_read on public.rpg_campaign_media for select to authenticated
  using (public.rpg_is_campaign_owner(campaign_id) or
    (public.rpg_is_campaign_participant(campaign_id) and (author_id = (select auth.uid()) or shared)));
drop policy if exists rpg_campaign_media_insert on public.rpg_campaign_media;
create policy rpg_campaign_media_insert on public.rpg_campaign_media for insert to authenticated
  with check (author_id = (select auth.uid()) and public.rpg_is_campaign_participant(campaign_id));
drop policy if exists rpg_campaign_media_update on public.rpg_campaign_media;
create policy rpg_campaign_media_update on public.rpg_campaign_media for update to authenticated
  using (public.rpg_is_campaign_owner(campaign_id) or
    (author_id = (select auth.uid()) and public.rpg_is_campaign_participant(campaign_id)))
  with check (public.rpg_is_campaign_owner(campaign_id) or
    (author_id = (select auth.uid()) and public.rpg_is_campaign_participant(campaign_id)));
drop policy if exists rpg_campaign_media_delete on public.rpg_campaign_media;
create policy rpg_campaign_media_delete on public.rpg_campaign_media for delete to authenticated
  using (public.rpg_is_campaign_owner(campaign_id) or
    (author_id = (select auth.uid()) and public.rpg_is_campaign_participant(campaign_id)));
drop policy if exists rpg_campaign_notes_read on public.rpg_campaign_notes;
create policy rpg_campaign_notes_read on public.rpg_campaign_notes for select to authenticated
  using (public.rpg_is_campaign_owner(campaign_id) or
    (public.rpg_is_campaign_participant(campaign_id) and (author_id = (select auth.uid()) or shared)));
drop policy if exists rpg_campaign_notes_insert on public.rpg_campaign_notes;
create policy rpg_campaign_notes_insert on public.rpg_campaign_notes for insert to authenticated
  with check (author_id = (select auth.uid()) and public.rpg_is_campaign_participant(campaign_id));
drop policy if exists rpg_campaign_notes_update on public.rpg_campaign_notes;
create policy rpg_campaign_notes_update on public.rpg_campaign_notes for update to authenticated
  using (public.rpg_is_campaign_owner(campaign_id) or
    (author_id = (select auth.uid()) and public.rpg_is_campaign_participant(campaign_id)))
  with check (public.rpg_is_campaign_owner(campaign_id) or
    (author_id = (select auth.uid()) and public.rpg_is_campaign_participant(campaign_id)));
drop policy if exists rpg_campaign_notes_delete on public.rpg_campaign_notes;
create policy rpg_campaign_notes_delete on public.rpg_campaign_notes for delete to authenticated
  using (public.rpg_is_campaign_owner(campaign_id) or
    (author_id = (select auth.uid()) and public.rpg_is_campaign_participant(campaign_id)));

-- O mestre pode vetar uma publicação sem que o autor a torne pública de novo
-- simplesmente editando a própria linha. Somente o mestre muda a visibilidade.
create or replace function rpg_private.guard_community_visibility()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.shared is distinct from old.shared and not public.rpg_is_campaign_owner(old.campaign_id) then
    raise exception 'Somente o mestre pode mudar a visibilidade de uma publicação.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function rpg_private.guard_community_visibility() from public, anon, authenticated;
create trigger rpg_media_visibility_guard before update on public.rpg_campaign_media
  for each row execute function rpg_private.guard_community_visibility();
create trigger rpg_notes_visibility_guard before update on public.rpg_campaign_notes
  for each row execute function rpg_private.guard_community_visibility();

alter table public.rpg_campaign_categories enable row level security;
revoke all on public.rpg_campaign_categories from public, anon, authenticated;
grant select, insert, delete on public.rpg_campaign_categories to authenticated;
grant update(name, description, sort_order) on public.rpg_campaign_categories to authenticated;
create policy rpg_category_read on public.rpg_campaign_categories for select to authenticated
  using (public.rpg_is_campaign_participant(campaign_id));
create policy rpg_category_insert on public.rpg_campaign_categories for insert to authenticated
  with check (public.rpg_is_campaign_owner(campaign_id));
create policy rpg_category_update on public.rpg_campaign_categories for update to authenticated
  using (public.rpg_is_campaign_owner(campaign_id)) with check (public.rpg_is_campaign_owner(campaign_id));
create policy rpg_category_delete on public.rpg_campaign_categories for delete to authenticated
  using (public.rpg_is_campaign_owner(campaign_id));
create trigger rpg_campaign_categories_touched before update on public.rpg_campaign_categories
  for each row execute function rpg_private.touch_campaign_record();

-- As mensagens continuam uma linha por mensagem, ligadas por author_id.
-- Nome/foto são consultados do perfil ATUAL, sem depender do nome congelado.
alter table public.rpg_campaign_messages add column if not exists edited_at timestamptz;
grant update(body) on public.rpg_campaign_messages to authenticated;
drop policy if exists rpg_campaign_messages_update on public.rpg_campaign_messages;
create policy rpg_campaign_messages_update on public.rpg_campaign_messages for update to authenticated
  using (public.rpg_is_campaign_owner(campaign_id) or
    (author_id = (select auth.uid()) and public.rpg_is_campaign_participant(campaign_id)))
  with check (public.rpg_is_campaign_owner(campaign_id) or
    (author_id = (select auth.uid()) and public.rpg_is_campaign_participant(campaign_id)));
drop policy if exists rpg_campaign_messages_delete on public.rpg_campaign_messages;
create policy rpg_campaign_messages_delete on public.rpg_campaign_messages for delete to authenticated
  using (public.rpg_is_campaign_owner(campaign_id) or
    (author_id = (select auth.uid()) and public.rpg_is_campaign_participant(campaign_id)));
create or replace function rpg_private.guard_message_edit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.author_id is distinct from old.author_id or new.campaign_id is distinct from old.campaign_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Autor, mesa e data da mensagem são imutáveis.' using errcode = '42501';
  end if;
  new.edited_at := now();
  return new;
end;
$$;
revoke all on function rpg_private.guard_message_edit() from public, anon, authenticated;
drop trigger if exists rpg_message_edit_guard on public.rpg_campaign_messages;
create trigger rpg_message_edit_guard before update on public.rpg_campaign_messages
  for each row execute function rpg_private.guard_message_edit();
create or replace function public.rpg_campaign_messages_view(p_campaign_id uuid)
returns table(id uuid, author_id uuid, author_name text, avatar_path text, body text, created_at timestamptz, edited_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.rpg_is_campaign_participant(p_campaign_id) then
    raise exception 'Acesso negado à comunidade.' using errcode = '42501';
  end if;
  return query select m.id, m.author_id, coalesce(p.display_name, m.author_name, 'Jogador'),
    p.avatar_path, m.body, m.created_at, m.edited_at
    from (select recent.* from public.rpg_campaign_messages recent
      where recent.campaign_id = p_campaign_id order by recent.created_at desc, recent.id desc limit 200) m
    left join public.rpg_profiles p on p.id = m.author_id
    order by m.created_at, m.id;
end;
$$;
revoke all on function public.rpg_campaign_messages_view(uuid) from public, anon;
grant execute on function public.rpg_campaign_messages_view(uuid) to authenticated;

-- Histórico verificável: a rolagem é calculada no banco, não aceita resultado
-- arbitrário enviado pelo navegador.
create table if not exists public.rpg_campaign_rolls (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.rpg_campaigns(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 1 and 120),
  expression text not null check (char_length(expression) <= 80),
  dice jsonb not null check (jsonb_typeof(dice) = 'array'),
  result integer not null,
  created_at timestamptz not null default now()
);
create index if not exists rpg_rolls_campaign_idx on public.rpg_campaign_rolls(campaign_id, created_at desc);
alter table public.rpg_campaign_rolls enable row level security;
revoke all on public.rpg_campaign_rolls from public, anon, authenticated;
grant select on public.rpg_campaign_rolls to authenticated;
create policy rpg_roll_read on public.rpg_campaign_rolls for select to authenticated
  using (public.rpg_is_campaign_participant(campaign_id));
create or replace function public.rpg_record_roll(p_campaign_id uuid, p_label text, p_count integer,
  p_sides integer, p_bonus integer default 0, p_mode text default 'sum')
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare v_dice integer[] := '{}'; v_value integer; v_result integer := 0; v_id uuid; v_created_at timestamptz;
begin
  if not public.rpg_is_campaign_participant(p_campaign_id) then
    raise exception 'Você não participa desta mesa.' using errcode = '42501';
  end if;
  if p_label is null or char_length(btrim(p_label)) not between 1 and 120
     or p_count not between 1 and 30 or p_sides not in (4,6,8,10,12,20,100)
     or p_bonus not between -1000 and 1000 or p_mode not in ('sum','max') then
    raise exception 'Rolagem inválida.' using errcode = '22023';
  end if;
  for i in 1..p_count loop
    v_value := floor(random() * p_sides)::integer + 1;
    v_dice := array_append(v_dice, v_value);
    if p_mode = 'max' then v_result := greatest(v_result, v_value);
    else v_result := v_result + v_value; end if;
  end loop;
  v_result := v_result + p_bonus;
  insert into public.rpg_campaign_rolls(campaign_id, author_id, label, expression, dice, result)
    values (p_campaign_id, auth.uid(), btrim(p_label),
      p_count::text || 'd' || p_sides::text || case when p_bonus >= 0 then '+' else '' end || p_bonus::text,
      to_jsonb(v_dice), v_result) returning id, created_at into v_id, v_created_at;
  return jsonb_build_object('id',v_id,'campaign_id',p_campaign_id,'author_id',auth.uid(),
    'label',btrim(p_label),'expression',p_count::text || 'd' || p_sides::text ||
      case when p_bonus >= 0 then '+' else '' end || p_bonus::text,
    'dice',to_jsonb(v_dice),'result',v_result,'created_at',v_created_at);
end;
$$;
revoke all on function public.rpg_record_roll(uuid,text,integer,integer,integer,text) from public, anon;
grant execute on function public.rpg_record_roll(uuid,text,integer,integer,integer,text) to authenticated;

-- Log da mesa: só o mestre consulta; participantes não podem forjar entradas.
create table if not exists public.rpg_campaign_logs (
  id bigint generated always as identity primary key,
  campaign_id uuid not null references public.rpg_campaigns(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists rpg_logs_campaign_idx on public.rpg_campaign_logs(campaign_id, created_at desc);
alter table public.rpg_campaign_logs enable row level security;
revoke all on public.rpg_campaign_logs from public, anon, authenticated;
grant select on public.rpg_campaign_logs to authenticated;
create policy rpg_logs_read_master on public.rpg_campaign_logs for select to authenticated
  using (public.rpg_is_campaign_owner(campaign_id));
create or replace function rpg_private.audit_game_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_row jsonb; v_campaign uuid; v_id uuid; v_action text;
begin
  v_row := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  if tg_table_name = 'rpg_campaigns' then
    v_campaign := (v_row->>'id')::uuid;
    v_id := v_campaign;
  elsif tg_table_name = 'rpg_sheet_master_data' then
    select s.campaign_id into v_campaign from public.rpg_sheets s where s.id = (v_row->>'sheet_id')::uuid;
    v_id := (v_row->>'sheet_id')::uuid;
  elsif tg_table_name = 'rpg_sheets' then
    v_campaign := nullif(v_row->>'campaign_id','')::uuid;
    v_id := (v_row->>'id')::uuid;
  else
    v_campaign := (v_row->>'campaign_id')::uuid;
    v_id := coalesce(nullif(v_row->>'id','')::uuid, nullif(v_row->>'campaign_id','')::uuid);
  end if;
  if v_campaign is null or auth.uid() is null or not exists (
    select 1 from public.rpg_campaigns c where c.id = v_campaign
  ) then return coalesce(new, old); end if;
  v_action := lower(tg_op);
  if tg_table_name = 'rpg_sheets' and tg_op = 'UPDATE'
     and auth.uid() is distinct from (v_row->>'owner_id')::uuid then v_action := 'master_update'; end if;
  insert into public.rpg_campaign_logs(campaign_id,actor_id,action,entity_type,entity_id,details)
    values (v_campaign, auth.uid(), v_action, tg_table_name, v_id,
      jsonb_build_object('name', coalesce(v_row->>'name',v_row->>'title',v_row->>'label','')));
  return coalesce(new, old);
end;
$$;
revoke all on function rpg_private.audit_game_change() from public, anon, authenticated;
do $$ declare table_name text; begin
  foreach table_name in array array['rpg_campaigns','rpg_campaign_members',
    'rpg_sheets','rpg_sheet_master_data','rpg_campaign_master_data',
    'rpg_campaign_categories','rpg_campaign_media','rpg_campaign_notes','rpg_campaign_messages','rpg_campaign_rolls'] loop
    execute format('drop trigger if exists %I on public.%I', table_name || '_audit', table_name);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function rpg_private.audit_game_change()',
      table_name || '_audit', table_name);
  end loop;
end $$;

-- Armazenamento privado. Paths são vinculados ao ID da ficha ou da mídia.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('rpg-sheet-images','rpg-sheet-images',false,5242880,array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('rpg-campaign-media','rpg-campaign-media',false,20971520,array['image/png','image/jpeg','image/webp','image/gif','video/mp4','video/webm'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('rpg-npc-images','rpg-npc-images',false,5242880,array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
create or replace function public.rpg_can_access_sheet_image(p_sheet_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.rpg_sheets s where s.id::text = p_sheet_id
    and (s.owner_id = (select auth.uid()) or public.rpg_is_campaign_owner(s.campaign_id)));
$$;
create or replace function public.rpg_can_access_campaign_media(p_campaign_id text, p_media_id text, p_write boolean)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.rpg_campaigns c where c.id::text = p_campaign_id
    and (c.owner_id = (select auth.uid()) or exists (
      select 1 from public.rpg_campaign_media m where m.id::text = p_media_id
        and m.campaign_id = c.id and
          (case when p_write then m.author_id = (select auth.uid()) and public.rpg_is_campaign_participant(c.id)
            else public.rpg_is_campaign_participant(c.id) and
              (m.author_id = (select auth.uid()) or m.shared) end))));
$$;
create or replace function public.rpg_can_view_avatar(p_owner_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_owner_id = (select auth.uid())::text or exists (
    select 1 from public.rpg_campaigns c
    where (c.owner_id::text = p_owner_id or exists (
      select 1 from public.rpg_campaign_members m where m.campaign_id = c.id and m.user_id::text = p_owner_id))
      and (c.owner_id = (select auth.uid()) or exists (
        select 1 from public.rpg_campaign_members me where me.campaign_id = c.id and me.user_id = (select auth.uid())))
  );
$$;
create or replace function public.rpg_can_access_npc_image(p_owner_id text, p_campaign_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_owner_id = (select auth.uid())::text and exists (
    select 1 from public.rpg_campaigns c
    where c.id::text = p_campaign_id and c.owner_id = (select auth.uid())
  );
$$;
revoke all on function public.rpg_can_access_sheet_image(text), public.rpg_can_access_campaign_media(text,text,boolean),
  public.rpg_can_view_avatar(text), public.rpg_can_access_npc_image(text,text) from public, anon;
grant execute on function public.rpg_can_access_sheet_image(text), public.rpg_can_access_campaign_media(text,text,boolean),
  public.rpg_can_view_avatar(text), public.rpg_can_access_npc_image(text,text) to authenticated;
create policy rpg_sheet_images_read on storage.objects for select to authenticated
  using (bucket_id = 'rpg-sheet-images' and (
    public.rpg_can_access_sheet_image((storage.foldername(name))[2])
    or (storage.foldername(name))[1] = (select auth.uid())::text));
create policy rpg_sheet_images_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'rpg-sheet-images' and public.rpg_can_access_sheet_image((storage.foldername(name))[2]));
create policy rpg_sheet_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'rpg-sheet-images' and (
    public.rpg_can_access_sheet_image((storage.foldername(name))[2])
    or (storage.foldername(name))[1] = (select auth.uid())::text));
create policy rpg_media_files_read on storage.objects for select to authenticated
  using (bucket_id = 'rpg-campaign-media' and (
    public.rpg_can_access_campaign_media((storage.foldername(name))[2],(storage.foldername(name))[3],false)
    or (storage.foldername(name))[1] = (select auth.uid())::text));
create policy rpg_media_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'rpg-campaign-media' and public.rpg_can_access_campaign_media((storage.foldername(name))[2],(storage.foldername(name))[3],true));
create policy rpg_media_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'rpg-campaign-media' and (
    public.rpg_can_access_campaign_media((storage.foldername(name))[2],(storage.foldername(name))[3],true)
    or (storage.foldername(name))[1] = (select auth.uid())::text));
create policy rpg_npc_images_read on storage.objects for select to authenticated
  using (bucket_id = 'rpg-npc-images' and (
    public.rpg_can_access_npc_image((storage.foldername(name))[1],(storage.foldername(name))[2])
    or (storage.foldername(name))[1] = (select auth.uid())::text));
create policy rpg_npc_images_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'rpg-npc-images'
    and public.rpg_can_access_npc_image((storage.foldername(name))[1],(storage.foldername(name))[2])
    and (storage.foldername(name))[3] is not null
    and (storage.foldername(name))[4] in ('portrait','appearance'));
create policy rpg_npc_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'rpg-npc-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy rpg_avatar_read_campaign_member on storage.objects for select to authenticated
  using (bucket_id = 'rpg-avatars' and public.rpg_can_view_avatar((storage.foldername(name))[1]));

-- Habilita notificações Realtime quando a publicação padrão existir. RLS da
-- tabela continua valendo no recebimento dos eventos.
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'rpg_campaign_messages') then
      alter publication supabase_realtime add table public.rpg_campaign_messages;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'rpg_campaign_media') then
      alter publication supabase_realtime add table public.rpg_campaign_media;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'rpg_campaign_notes') then
      alter publication supabase_realtime add table public.rpg_campaign_notes;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'rpg_campaign_categories') then
      alter publication supabase_realtime add table public.rpg_campaign_categories;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'rpg_campaign_rolls') then
      alter publication supabase_realtime add table public.rpg_campaign_rolls;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'rpg_campaign_master_data') then
      alter publication supabase_realtime add table public.rpg_campaign_master_data;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'rpg_sheets') then
      alter publication supabase_realtime add table public.rpg_sheets;
    end if;
  end if;
end $$;

commit;
