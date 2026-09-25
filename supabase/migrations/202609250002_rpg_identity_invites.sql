-- Convites curtos permanentes. O codigo legado de 32 caracteres permanece
-- inalterado e aceito, para nao invalidar convites ja distribuidos.
-- Permissoes de mestre/jogador continuam vinculadas ao UUID do Supabase Auth.
begin;

-- A exclusao de uma mesa executa o ON DELETE SET NULL do FK de fichas.
-- O guard antigo interpretava essa atualizacao interna como tentativa do
-- mestre de desvincular a ficha alheia e abortava toda a exclusao com 42501.
-- Fora dessa transicao especifica, a ficha continua pertencendo ao jogador.
create or replace function rpg_private.guard_master_sheet_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'O dono da ficha nao pode ser alterado.' using errcode = '42501';
  end if;
  if auth.uid() is distinct from old.owner_id then
    if new.campaign_id is null and old.campaign_id is not null
       and not exists (select 1 from public.rpg_campaigns c where c.id = old.campaign_id) then
      return new;
    end if;
    if not public.rpg_is_campaign_owner(old.campaign_id)
       or new.campaign_id is distinct from old.campaign_id then
      raise exception 'O mestre pode alterar apenas dados da ficha vinculada a sua mesa.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function rpg_private.guard_master_sheet_update() from public, anon, authenticated;

alter table rpg_private.campaign_invites add column if not exists short_code text;
create unique index if not exists rpg_campaign_invites_short_code_idx
  on rpg_private.campaign_invites(short_code);

-- Os quatro primeiros bytes de um UUID v4 sao aleatorios. Rejeitar a pequena
-- faixa final evita vies de modulo ao converter para um numero de seis digitos.
create or replace function rpg_private.random_six_digit_code()
returns text language plpgsql volatile security definer set search_path = '' as $$
declare v_bytes bytea; v_number bigint;
begin
  loop
    v_bytes := pg_catalog.decode(pg_catalog.substr(
      pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 8), 'hex');
    v_number := pg_catalog.get_byte(v_bytes, 0)::bigint * 16777216
      + pg_catalog.get_byte(v_bytes, 1)::bigint * 65536
      + pg_catalog.get_byte(v_bytes, 2)::bigint * 256
      + pg_catalog.get_byte(v_bytes, 3)::bigint;
    if v_number < 4294000000 then
      return pg_catalog.lpad((v_number % 1000000)::text, 6, '0');
    end if;
  end loop;
end;
$$;
revoke all on function rpg_private.random_six_digit_code() from public, anon, authenticated;

-- Um codigo curto ja emitido nao pode ser trocado. A primeira atribuicao
-- durante a migracao e permitida apenas para linhas legadas ainda sem alias.
create or replace function rpg_private.keep_invite_code()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.code is distinct from old.code
     or (old.short_code is not null and new.short_code is distinct from old.short_code) then
    raise exception 'O codigo da mesa e permanente.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function rpg_private.keep_invite_code() from public, anon, authenticated;

create or replace function rpg_private.ensure_campaign_short_code(p_campaign_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v_code text; v_short text; v_candidate text; v_exists boolean;
begin
  for attempt in 1..64 loop
    select i.short_code into v_short from rpg_private.campaign_invites i
      where i.campaign_id = p_campaign_id;
    v_exists := found;
    if v_short is not null then return v_short; end if;
    v_candidate := rpg_private.random_six_digit_code();
    begin
      if v_exists then
        update rpg_private.campaign_invites i set short_code = v_candidate
          where i.campaign_id = p_campaign_id and i.short_code is null
          returning i.short_code into v_short;
      else
        insert into rpg_private.campaign_invites(campaign_id, code, short_code)
          values (p_campaign_id,
            pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', ''), v_candidate)
          on conflict (campaign_id) do nothing
          returning short_code into v_short;
      end if;
      if v_short is not null then return v_short; end if;
    exception when unique_violation then
      -- Outro convite ja usa este numero; tenta outro.
      null;
    end;
  end loop;
  raise exception 'Nao foi possivel reservar um codigo de convite.' using errcode = '23505';
end;
$$;
revoke all on function rpg_private.ensure_campaign_short_code(uuid) from public, anon, authenticated;

-- Preenche convites existentes sem mudar o codigo legado ou a mesa.
do $$ declare v_campaign uuid; begin
  for v_campaign in select campaign_id from rpg_private.campaign_invites
    where short_code is null order by campaign_id loop
    perform rpg_private.ensure_campaign_short_code(v_campaign);
  end loop;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint
    where conrelid = 'rpg_private.campaign_invites'::regclass
      and conname = 'rpg_invite_short_code_six_digits') then
    alter table rpg_private.campaign_invites
      add constraint rpg_invite_short_code_six_digits check (short_code ~ '^[0-9]{6}$');
  end if;
end $$;
alter table rpg_private.campaign_invites alter column short_code set not null;

create or replace function public.rpg_create_campaign_invite(p_campaign_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
begin
  if not public.rpg_is_campaign_owner(p_campaign_id) then
    raise exception 'Apenas o mestre pode consultar o codigo da mesa.' using errcode = '42501';
  end if;
  return rpg_private.ensure_campaign_short_code(p_campaign_id);
end;
$$;
revoke all on function public.rpg_create_campaign_invite(uuid) from public, anon;
grant execute on function public.rpg_create_campaign_invite(uuid) to authenticated;

-- Retornos invalidos sao NULL, nao excepcao: uma excecao reverteria a
-- transacao e apagaria a contagem de tentativas da propria chamada.
create table if not exists rpg_private.invite_failures (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  failures integer not null check (failures between 1 and 8)
);
alter table rpg_private.invite_failures enable row level security;
revoke all on rpg_private.invite_failures from public, anon, authenticated;

create or replace function public.rpg_join_campaign_by_code(p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_code text; v_campaign uuid; v_count integer;
  v_start timestamptz; v_now timestamptz;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'Entre na sua conta para usar um convite.' using errcode = '42501';
  end if;
  -- Serializa tentativas concorrentes da mesma conta; codigos curtos nao
  -- devem poder ser adivinhados por rajadas paralelas.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'rpg-invite:' || v_user::text, 831506));
  v_now := pg_catalog.clock_timestamp();
  select f.failures, f.window_start into v_count, v_start
    from rpg_private.invite_failures f where f.user_id = v_user for update;
  if v_count >= 8 and v_start > v_now - interval '15 minutes' then
    return null;
  end if;

  if p_code is not null and pg_catalog.char_length(p_code) <= 64 then
    v_code := pg_catalog.lower(pg_catalog.btrim(p_code));
  end if;
  if v_code ~ '^[0-9]{6}$' then
    select i.campaign_id into v_campaign from rpg_private.campaign_invites i
      where i.short_code = v_code;
  elsif v_code ~ '^[a-f0-9]{32}$' then
    select i.campaign_id into v_campaign from rpg_private.campaign_invites i
      where i.code = v_code;
  end if;

  if v_campaign is null then
    insert into rpg_private.invite_failures as f(user_id, window_start, failures)
      values (v_user, v_now, 1)
      on conflict (user_id) do update set
        window_start = case when f.window_start <= v_now - interval '15 minutes'
          then v_now else f.window_start end,
        failures = case when f.window_start <= v_now - interval '15 minutes'
          then 1 else least(f.failures + 1, 8) end;
    return null;
  end if;
  if public.rpg_is_campaign_owner(v_campaign) then
    raise exception 'Voce ja e o mestre desta campanha.' using errcode = '22023';
  end if;
  insert into public.rpg_campaign_members(campaign_id, user_id)
    values (v_campaign, v_user) on conflict do nothing;
  delete from rpg_private.invite_failures where user_id = v_user;
  return v_campaign;
end;
$$;
revoke all on function public.rpg_join_campaign_by_code(text) from public, anon;
grant execute on function public.rpg_join_campaign_by_code(text) to authenticated;

commit;
