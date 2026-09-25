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
const npcId = '00000000-0000-4000-8000-000000000021'
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
  await db.exec(await readFile(new URL('../supabase/migrations/202609250001_rpg_v1_fixes.sql', import.meta.url), 'utf8'))

  await as(master)
  const campaignId = (await rows(`insert into public.rpg_campaigns(owner_id,name) values ('${master}','Mesa de teste') returning id`))[0].id
  check((await rows(`select count(*)::int as n from public.rpg_campaigns`))[0].n, 1)
  check((await rows(`select count(*)::int as n from public.rpg_campaign_logs where campaign_id='${campaignId}' and entity_type='rpg_campaigns'`))[0].n, 1)
  await db.exec(`insert into public.rpg_campaign_master_data(campaign_id,data) values ('${campaignId}','{"secret":"somente mestre"}')`)
  await db.exec(`insert into public.rpg_campaign_notes(campaign_id,title,body,shared) values
    ('${campaignId}','Privada','segredo',false),('${campaignId}','Pública','visível',true)`)
  await db.exec(`insert into public.rpg_campaign_media(campaign_id,title,shared) values
    ('${campaignId}','Imagem privada',false),('${campaignId}','Imagem pública',true)`)
  const code1 = (await rows(`select public.rpg_create_campaign_invite('${campaignId}') as code`))[0].code
  check(/^[a-f0-9]{32}$/.test(code1), true)
  const code2 = (await rows(`select public.rpg_create_campaign_invite('${campaignId}') as code`))[0].code
  check(code1 === code2, true)
  check((await rows(`select count(*)::int as n from public.rpg_campaign_participants('${campaignId}')`))[0].n, 0)
  await denied(`select * from rpg_private.campaign_invites`, /permission denied/i)

  await as(player)
  check(await rows(`select id from public.rpg_campaigns`), [])
  check((await rows(`select public.rpg_join_campaign_by_code('${code1}') as id`))[0].id, campaignId)
  check((await rows(`select public.rpg_join_campaign_by_code('${code2}') as id`))[0].id, campaignId)
  check((await rows(`select public.rpg_join_campaign_by_code('${code2}') as id`))[0].id, campaignId)
  check((await rows(`select name from public.rpg_campaigns`))[0].name, 'Mesa de teste')
  check(await rows(`select data from public.rpg_campaign_master_data`), [])
  check((await rows(`select title from public.rpg_campaign_notes`)).map(row => row.title), ['Pública'])
  check((await rows(`select title from public.rpg_campaign_media`)).map(row => row.title), ['Imagem pública'])
  await denied(`insert into public.rpg_campaign_members(campaign_id,user_id) values ('${campaignId}','${outsider}')`, /permission denied/i)
  await db.exec(`insert into public.rpg_campaign_notes(campaign_id,title,shared) values ('${campaignId}','Nota da jogadora',true)`)
  check((await rows(`select title from public.rpg_campaign_notes where title='Nota da jogadora'`))[0].title, 'Nota da jogadora')
  await denied(`select public.rpg_campaign_participants('${campaignId}')`, /Apenas o mestre/i)
  const sheetId = (await rows(`insert into public.rpg_sheets(owner_id,campaign_id,name,details)
    values ('${player}','${campaignId}','Heroína','{"gender":"Feminino","skills":[]}') returning id`))[0].id
  await db.exec(`insert into storage.objects(bucket_id,name) values
    ('rpg-sheet-images','${player}/${sheetId}/portrait/a.png'),
    ('rpg-avatars','${player}/avatar.png')`)
  check((await rows(`select count(*)::int as n from storage.objects`))[0].n, 2)
  await denied(`insert into public.rpg_sheets(owner_id,campaign_id,name)
    values ('${player}','${campaignId}','Segunda ficha')`, /duplicate key/i)
  await denied(`insert into public.rpg_sheets(owner_id,campaign_id,name,details)
    values ('${player}','${campaignId}','Trapaça','{"abilities":[{"name":"forged"}]}')`, /rpg_sheet_civil_details_only/i)
  await denied(`insert into public.rpg_sheet_master_data(sheet_id,forms) values ('${sheetId}','[]')`)
  await db.exec(`insert into public.rpg_campaign_messages(campaign_id,author_id,body) values ('${campaignId}','${player}','Olá mesa')`)
  check((await rows(`select author_name, body from public.rpg_campaign_messages`))[0], { author_name: 'Jogadora', body: 'Olá mesa' })
  await db.exec(`update public.rpg_profiles set display_name='Jogadora nova' where id='${player}'`)
  check((await rows(`select author_name from public.rpg_campaign_messages_view('${campaignId}')`))[0].author_name, 'Jogadora nova')
  const messageId = (await rows(`select id from public.rpg_campaign_messages`))[0].id
  await db.exec(`update public.rpg_campaign_messages set body='Olá, editado' where id='${messageId}'`)
  check((await rows(`select body, edited_at is not null as edited from public.rpg_campaign_messages where id='${messageId}'`))[0], { body: 'Olá, editado', edited: true })
  await denied(`insert into public.rpg_campaign_messages(campaign_id,author_id,body)
    values ('${campaignId}','${master}','forged')`, /Autor inválido/i)

  await as(master)
  check((await rows(`select count(*)::int as n from storage.objects`))[0].n, 2)
  check((await rows(`select name from public.rpg_sheets where id='${sheetId}'`))[0].name, 'Heroína')
  check((await rows(`select display_name from public.rpg_campaign_participants('${campaignId}')`))[0].display_name, 'Jogadora nova')
  check((await rows(`select count(*)::int as n from public.rpg_campaign_logs where campaign_id='${campaignId}' and entity_type='rpg_campaign_members'`))[0].n, 1)
  check((await rows(`update public.rpg_sheets set name='Mestre alterou' where id='${sheetId}' returning name`))[0].name, 'Mestre alterou')
  check((await rows(`select action from public.rpg_campaign_logs where entity_type='rpg_sheets' and action='master_update'`)).length, 1)
  await db.exec(`insert into public.rpg_sheet_master_data(sheet_id,forms,abilities)
    values ('${sheetId}','[{"id":"kitsune","skills":{"luta":5}}]','[{"name":"Poder"}]')`)
  check((await rows(`select forms->0->>'id' as form from public.rpg_sheet_master_data`))[0].form, 'kitsune')
  await db.exec(`insert into public.rpg_campaign_master_data(campaign_id,data) values ('${campaignId}','{"secret":"editado"}') on conflict(campaign_id) do update set campaign_id=excluded.campaign_id,data=excluded.data`)
  check((await rows(`select data->>'secret' as secret from public.rpg_campaign_master_data`))[0].secret, 'editado')
  const npcImagePath = `${master}/${campaignId}/${npcId}/portrait/a.png`
  await db.exec(`insert into storage.objects(bucket_id,name) values ('rpg-npc-images','${npcImagePath}')`)
  check((await rows(`select name from storage.objects where bucket_id='rpg-npc-images'`))[0].name, npcImagePath)
  await db.exec(`insert into public.rpg_sheet_master_data(sheet_id,forms,abilities) values ('${sheetId}','[]','[]') on conflict(sheet_id) do update set sheet_id=excluded.sheet_id,forms=excluded.forms,abilities=excluded.abilities`)
  check((await rows(`select forms from public.rpg_sheet_master_data`))[0].forms, [])
  const categoryId = (await rows(`insert into public.rpg_campaign_categories(campaign_id,name) values ('${campaignId}','Arquivos') returning id`))[0].id
  await db.exec(`update public.rpg_campaign_notes set category_id='${categoryId}' where title='Nota da jogadora'`)
  check((await rows(`select category_id from public.rpg_campaign_notes where title='Nota da jogadora'`))[0].category_id, categoryId)
  await db.exec(`update public.rpg_campaign_notes set shared=false where title='Nota da jogadora'`)
  const masterRoll = (await rows(`select public.rpg_record_roll('${campaignId}','Teste do mestre',2,20,5,'max') as roll`))[0].roll
  check(masterRoll.dice.length, 2)
  check(masterRoll.result, Math.max(...masterRoll.dice) + 5)
  const secondCampaign = (await rows(`insert into public.rpg_campaigns(owner_id,name) values ('${master}','Segunda mesa') returning id`))[0].id
  const secondCode = (await rows(`select public.rpg_create_campaign_invite('${secondCampaign}') as code`))[0].code
  await denied(`insert into public.rpg_sheets(owner_id,campaign_id,name) values ('${master}','${campaignId}','Mestre não é jogador')`)

  await as(player)
  check(await rows(`select name from storage.objects where bucket_id='rpg-npc-images'`), [])
  await denied(`insert into storage.objects(bucket_id,name) values
    ('rpg-npc-images','${player}/${campaignId}/${npcId}/portrait/forged.png')`)
  await denied(`update public.rpg_campaign_notes set shared=true where title='Nota da jogadora'`, /Somente o mestre pode mudar a visibilidade/i)
  check((await rows(`select shared from public.rpg_campaign_notes where title='Nota da jogadora'`))[0].shared, false)
  check((await rows(`select forms from public.rpg_sheet_master_data`))[0].forms, [])
  check(await rows(`update public.rpg_sheet_master_data set abilities='[]' where sheet_id='${sheetId}' returning sheet_id`), [])
  await db.exec(`update public.rpg_sheets set name='Heroína civil', details='{"gender":"Feminino","age":"20"}' where id='${sheetId}'`)
  check((await rows(`select name from public.rpg_sheets where id='${sheetId}'`))[0].name, 'Heroína civil')
  await denied(`update public.rpg_sheets set details='{"forms":[]}' where id='${sheetId}'`, /rpg_sheet_civil_details_only/i)
  const playerRoll = (await rows(`select public.rpg_record_roll('${campaignId}','Teste player',1,20,0,'sum') as roll`))[0].roll
  check(playerRoll.dice.length, 1)
  check((await rows(`select count(*)::int as n from public.rpg_campaign_rolls where campaign_id='${campaignId}'`))[0].n, 2)
  check(await rows(`select id from public.rpg_campaign_logs`), [])
  check((await rows(`select public.rpg_join_campaign_by_code('${secondCode}') as id`))[0].id, secondCampaign)
  await db.exec(`update public.rpg_sheets set campaign_id='${secondCampaign}' where id='${sheetId}'`)
  check(await rows(`select sheet_id from public.rpg_sheet_master_data`), [])
  await db.exec(`reset role; delete from public.rpg_campaign_members where campaign_id='${campaignId}' and user_id='${player}'`)
  await as(player)
  check(await rows(`select id from public.rpg_campaign_notes where campaign_id='${campaignId}'`), [])
  check(await rows(`update public.rpg_campaign_notes set title='Sem acesso' where campaign_id='${campaignId}' and title='Nota da jogadora' returning id`), [])
  check(await rows(`update public.rpg_campaign_messages set body='Sem acesso' where id='${messageId}' returning id`), [])

  await as(outsider)
  check(await rows(`select id from public.rpg_campaigns`), [])
  check(await rows(`select id from public.rpg_sheets`), [])
  check(await rows(`select body from public.rpg_campaign_messages`), [])
  check(await rows(`select name from storage.objects`), [])
  await denied(`select * from public.rpg_campaign_messages_view('${campaignId}')`, /Acesso negado/i)
  await denied(`select public.rpg_record_roll('${campaignId}','forged',1,20,0,'sum')`, /não participa/i)
  await denied(`select public.rpg_create_campaign_invite('${campaignId}')`, /Apenas o mestre/i)
  await denied(`select public.rpg_join_campaign_by_code('bad')`, /Convite inválido/i)
  await db.exec(`reset role; set role anon;`)
  await denied(`select id from public.rpg_campaigns`, /permission denied/i)
  await denied(`select public.rpg_join_campaign_by_code('${secondCode}')`, /permission denied/i)

  await as(player)
  await db.exec(`delete from public.rpg_sheets where id='${sheetId}'`)
  await db.exec(`delete from storage.objects where name='${player}/${sheetId}/portrait/a.png'`)
  check((await rows(`select count(*)::int as n from storage.objects where name='${player}/${sheetId}/portrait/a.png'`))[0].n, 0)

  await as(master)
  const mediaId = (await rows(`select id from public.rpg_campaign_media where campaign_id='${campaignId}' limit 1`))[0].id
  await db.exec(`insert into storage.objects(bucket_id,name) values ('rpg-campaign-media','${master}/${campaignId}/${mediaId}/a.png')`)
  await db.exec(`delete from public.rpg_campaigns where id='${campaignId}'`)
  await db.exec(`delete from storage.objects where name='${master}/${campaignId}/${mediaId}/a.png'`)
  await db.exec(`delete from storage.objects where name='${npcImagePath}'`)
  check((await rows(`select count(*)::int as n from storage.objects where name='${master}/${campaignId}/${mediaId}/a.png'`))[0].n, 0)
  check((await rows(`select count(*)::int as n from storage.objects where name='${npcImagePath}'`))[0].n, 0)

  console.log(`Campaign SQL integration: ${assertions} assertions passed (isolated PostgreSQL/PGlite; Auth and Storage mocked).`)
} finally {
  await db.close()
}
