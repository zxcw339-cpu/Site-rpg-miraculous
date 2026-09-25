-- Um convite valido nao pode zerar o limite de tentativas incorretas.
-- Esta migracao corrige a funcao publicada em 202609250002 sem alterar dados.
begin;

create or replace function public.rpg_join_campaign_by_code(p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_code text; v_campaign uuid; v_count integer;
  v_start timestamptz; v_now timestamptz;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'Entre na sua conta para usar um convite.' using errcode = '42501';
  end if;
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
  -- A contagem so expira com o tempo. Um codigo conhecido, inclusive um
  -- convite de mesa ja acessivel, nao concede novas tentativas de adivinhacao.
  return v_campaign;
end;
$$;
revoke all on function public.rpg_join_campaign_by_code(text) from public, anon;
grant execute on function public.rpg_join_campaign_by_code(text) to authenticated;

commit;
