// Isolated PostgreSQL/WASM check; no live Supabase project is contacted.
// node tests/campaign-sql.integration.mjs .preview/backend-check/node_modules/@electric-sql/pglite/dist/index.js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

if (!process.argv[2]) throw new Error('Informe o módulo PGlite para este teste isolado.')
const { PGlite } = await import(pathToFileURL(resolve(process.argv[2])).href)
const db = new PGlite()
const master = '00000000-0000-4000-8000-000000000011'
const player = '00000000-0000-4000-8000-000000000012'
const outsider = '00000000-0000-4000-8000-000000000013'
let assertions = 0
const check = (actual, expected) => { assert.deepEqual(actual, expected); assertions++ }
const rows = async sql => (await db.query(sql)).rows
const denied = async (sql, pattern = /permission denied|row.level security|policy|violates check/i) => {
  await assert.rejects(db.exec(sql), pattern)
  assertions++
}
const as = async id => db.exec(`reset role; select set_config('request.jwt.claim.sub', '${id}', false); set role authenticated;`)

try {
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create schema storage;
    create table auth.users (
      id uuid primary key, email text,
      raw_user_meta_data jsonb default '{}'::jsonb,
      raw_app_meta_data jsonb default '{}'::jsonb
    );
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, storage, public to authenticated, anon, service_role;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id bigint generated always as identity primary key, bucket_id text, name text);
    create function storage.foldername(name text) returns text[] language sql immutable as
      $$ select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)] $$;
    alter table storage.objects enable row level security;
    grant select, insert, update, delete on storage.objects to authenticated;
    grant usage on sequence storage.objects_id_seq to authenticated;
    insert into auth.users(id, email, raw_user_meta_data, raw_app_meta_data) values
      ('${master}', 'master@example.org', '{"display_name":"Mestre"}', '{"provider":"email"}'),
      ('${player}', 'player@example.org', '{"display_name":"Jogadora"}', '{"provider":"email"}'),
      ('${outsider}', 'outsider@example.org', '{"display_name":"Outro"}', '{"provider":"email"}');
  `)
  await db.exec(await readFile(new URL('../supabase/migrations/202609170001_rpg_auth.sql', import.meta.url), 'utf8'))
  await db.exec(await readFile(new URL('../supabase/migrations/202609240001_rpg_campaigns_sheets.sql', import.meta.url), 'utf8'))

  await as(master)
  const campaignId = (await rows(`insert into public.rpg_campaigns(owner_id,name) values ('${master}','Mesa de teste') returning id`))[0].id
  check((await rows(`select count(*)::int as n from public.rpg_campaigns`))[0].n, 1)
  await db.exec(`insert into public.rpg_campaign_master_data(campaign_id,data) values ('${campaignId}','{"secret":"somente mestre"}')`)
  await db.exec(`insert into public.rpg_campaign_notes(campaign_id,title,body,shared) values
    ('${campaignId}','Privada','segredo',false),('${campaignId}','Pública','visível',true)`)
  await db.exec(`insert into public.rpg_campaign_media(campaign_id,title,shared) values
    ('${campaignId}','Imagem privada',false),('${campaignId}','Imagem pública',true)`)
  const code1 = (await rows(`select public.rpg_create_campaign_invite('${campaignId}') as code`))[0].code
  check(/^[a-f0-9]{32}$/.test(code1), true)
  const code2 = (await rows(`select public.rpg_create_campaign_invite('${campaignId}') as code`))[0].code
  check(code1 === code2, false)
  check((await rows(`select count(*)::int as n from public.rpg_campaign_participants('${campaignId}')`))[0].n, 0)
  await denied(`select * from rpg_private.campaign_invites`, /permission denied/i)

  await as(player)
  check(await rows(`select id from public.rpg_campaigns`), [])
  await denied(`select public.rpg_join_campaign_by_code('${code1}')`, /inválido ou expirado/i)
  check((await rows(`select public.rpg_join_campaign_by_code('${code2}') as id`))[0].id, campaignId)
  check((await rows(`select public.rpg_join_campaign_by_code('${code2}') as id`))[0].id, campaignId)
  check((await rows(`select name from public.rpg_campaigns`))[0].name, 'Mesa de teste')
  check(await rows(`select data from public.rpg_campaign_master_data`), [])
  check((await rows(`select title from public.rpg_campaign_notes`)).map(row => row.title), ['Pública'])
  check((await rows(`select title from public.rpg_campaign_media`)).map(row => row.title), ['Imagem pública'])
  await denied(`insert into public.rpg_campaign_members(campaign_id,user_id) values ('${campaignId}','${outsider}')`, /permission denied/i)
  await denied(`insert into public.rpg_campaign_notes(campaign_id,title) values ('${campaignId}','forged')`)
  await denied(`select public.rpg_campaign_participants('${campaignId}')`, /Apenas o mestre/i)
  const sheetId = (await rows(`insert into public.rpg_sheets(owner_id,campaign_id,name,details)
    values ('${player}','${campaignId}','Heroína','{"gender":"Feminino","skills":[]}') returning id`))[0].id
  await denied(`insert into public.rpg_sheets(owner_id,campaign_id,name)
    values ('${player}','${campaignId}','Segunda ficha')`, /duplicate key/i)
  await denied(`insert into public.rpg_sheets(owner_id,campaign_id,name,details)
    values ('${player}','${campaignId}','Trapaça','{"abilities":[{"name":"forged"}]}')`, /rpg_sheet_civil_details_only/i)
  await denied(`insert into public.rpg_sheet_master_data(sheet_id,forms) values ('${sheetId}','[]')`)
  await db.exec(`insert into public.rpg_campaign_messages(campaign_id,author_id,body) values ('${campaignId}','${player}','Olá mesa')`)
  check((await rows(`select author_name, body from public.rpg_campaign_messages`))[0], { author_name: 'Jogadora', body: 'Olá mesa' })
  await denied(`insert into public.rpg_campaign_messages(campaign_id,author_id,body)
    values ('${campaignId}','${master}','forged')`, /Autor inválido/i)

  await as(master)
  check((await rows(`select name from public.rpg_sheets where id='${sheetId}'`))[0].name, 'Heroína')
  check((await rows(`select display_name from public.rpg_campaign_participants('${campaignId}')`))[0].display_name, 'Jogadora')
  check(await rows(`update public.rpg_sheets set name='Mestre alterou' where id='${sheetId}' returning id`), [])
  await db.exec(`insert into public.rpg_sheet_master_data(sheet_id,forms,abilities)
    values ('${sheetId}','[{"id":"kitsune","skills":{"luta":5}}]','[{"name":"Poder"}]')`)
  check((await rows(`select forms->0->>'id' as form from public.rpg_sheet_master_data`))[0].form, 'kitsune')
  const secondCampaign = (await rows(`insert into public.rpg_campaigns(owner_id,name) values ('${master}','Segunda mesa') returning id`))[0].id
  const secondCode = (await rows(`select public.rpg_create_campaign_invite('${secondCampaign}') as code`))[0].code
  await denied(`insert into public.rpg_sheets(owner_id,campaign_id,name) values ('${master}','${campaignId}','Mestre não é jogador')`)

  await as(player)
  check((await rows(`select forms->0->>'id' as form from public.rpg_sheet_master_data`))[0].form, 'kitsune')
  check(await rows(`update public.rpg_sheet_master_data set abilities='[]' where sheet_id='${sheetId}' returning sheet_id`), [])
  await db.exec(`update public.rpg_sheets set name='Heroína civil', details='{"gender":"Feminino","age":"20"}' where id='${sheetId}'`)
  check((await rows(`select name from public.rpg_sheets where id='${sheetId}'`))[0].name, 'Heroína civil')
  await denied(`update public.rpg_sheets set details='{"forms":[]}' where id='${sheetId}'`, /rpg_sheet_civil_details_only/i)
  check((await rows(`select public.rpg_join_campaign_by_code('${secondCode}') as id`))[0].id, secondCampaign)
  await db.exec(`update public.rpg_sheets set campaign_id='${secondCampaign}' where id='${sheetId}'`)
  check(await rows(`select sheet_id from public.rpg_sheet_master_data`), [])

  await as(outsider)
  check(await rows(`select id from public.rpg_campaigns`), [])
  check(await rows(`select id from public.rpg_sheets`), [])
  check(await rows(`select body from public.rpg_campaign_messages`), [])
  await denied(`select public.rpg_create_campaign_invite('${campaignId}')`, /Apenas o mestre/i)
  await denied(`select public.rpg_join_campaign_by_code('bad')`, /Convite inválido/i)
  await db.exec(`reset role; set role anon;`)
  await denied(`select id from public.rpg_campaigns`, /permission denied/i)
  await denied(`select public.rpg_join_campaign_by_code('${secondCode}')`, /permission denied/i)

  console.log(`Campaign SQL integration: ${assertions} assertions passed (isolated PostgreSQL/PGlite; Auth and Storage mocked).`)
} finally {
  await db.close()
}
