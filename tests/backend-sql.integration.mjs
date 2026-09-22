// Run against isolated PostgreSQL/WASM, never a live Supabase project:
// npm install --prefix .preview/backend-check --no-save --ignore-scripts @electric-sql/pglite
// node tests/backend-sql.integration.mjs .preview/backend-check/node_modules/@electric-sql/pglite/dist/index.js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

if (!process.argv[2]) throw new Error('Informe o caminho para o módulo PGlite instalado para este teste isolado.')
const { PGlite } = await import(pathToFileURL(resolve(process.argv[2])).href)
const database = new PGlite()
const userA = '00000000-0000-4000-8000-000000000001'
const userB = '00000000-0000-4000-8000-000000000002'
const oldUser = '00000000-0000-4000-8000-000000000003'
let assertions = 0
const check = (actual, expected) => { assert.deepEqual(actual, expected); assertions++ }
const fail = async (sql, pattern) => { await assert.rejects(database.exec(sql), pattern); assertions++ }
const rows = async sql => (await database.query(sql)).rows

try {
  await database.exec(`
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
    create table storage.buckets (
      id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]
    );
    create table storage.objects (id bigint generated always as identity primary key, bucket_id text, name text);
    create function storage.foldername(name text) returns text[] language sql immutable as
      $$ select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)] $$;
    alter table storage.objects enable row level security;
    grant select, insert, update, delete on storage.objects to authenticated;
    grant usage on sequence storage.objects_id_seq to authenticated;
    insert into auth.users (id, email) values ('${oldUser}', 'existing@example.org');
  `)
  const migration = await readFile(new URL('../supabase/migrations/202609170001_rpg_auth.sql', import.meta.url), 'utf8')
  await database.exec(migration)
  await database.exec(migration)
  check((await rows(`select count(*)::int as n from auth.users`))[0].n, 1)
  check((await rows(`select username from public.rpg_profiles where id = '${oldUser}'`))[0].username, null)

  await database.exec(`
    insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
      ('${userA}', 'private-a@example.org', '{"username":"GaBrIeL", "display_name":"Gabriel", "bio":"Olá"}', '{"provider":"email"}'),
      ('${userB}', 'private-b@example.org', '{"username":"Invalid Discord Name", "name":"Outro jogador"}', '{"provider":"discord"}');
  `)
  check((await rows(`select username from public.rpg_profiles where id = '${userA}'`))[0].username, 'gabriel')
  check((await rows(`select username, display_name from public.rpg_profiles where id = '${userB}'`))[0], { username: null, display_name: 'Outro jogador' })
  await fail(`insert into auth.users (id, raw_user_meta_data) values ('00000000-0000-4000-8000-000000000004', '{"username":"GABRIEL"}')`, /unique/i)
  await fail(`insert into auth.users (id, raw_user_meta_data) values ('00000000-0000-4000-8000-000000000005', '{"username":"bad user"}')`, /rpg_username_format/i)
  check((await rows(`select column_name from information_schema.columns where table_schema = 'public' and table_name = 'rpg_profiles' and (column_name like '%password%' or column_name like '%email%')`)).length, 0)

  await database.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${userA}', false);`)
  check(await rows(`select id from public.rpg_profiles`), [{ id: userA }])
  await database.exec(`update public.rpg_profiles set display_name = 'Meu nome' where id = '${userA}'`)
  check((await rows(`select display_name from public.rpg_profiles`))[0].display_name, 'Meu nome')
  check(await rows(`update public.rpg_profiles set display_name = 'Ataque' where id = '${userB}' returning id`), [])
  await fail(`update public.rpg_profiles set id = '${userB}' where id = '${userA}'`, /permission denied/i)
  await fail(`update public.rpg_profiles set username = 'BAD NAME' where id = '${userA}'`, /rpg_username_format/i)
  await fail(`update public.rpg_profiles set bio = repeat('x', 301) where id = '${userA}'`, /rpg_bio_length/i)
  await fail(`update public.rpg_profiles set avatar_path = '${userB}/photo.png' where id = '${userA}'`, /rpg_avatar_owner_path/i)
  await fail(`select public.rpg_password_login_lookup('gabriel', repeat('a',64), repeat('b',64))`, /permission denied/i)
  await fail(`select * from rpg_private.login_attempts`, /permission denied/i)
  await database.exec(`insert into storage.objects (bucket_id, name) values ('rpg-avatars', '${userA}/photo.png')`)
  await fail(`insert into storage.objects (bucket_id, name) values ('rpg-avatars', '${userB}/photo.png')`, /row.level security/i)
  await database.exec(`reset role; insert into storage.objects (bucket_id, name) values ('rpg-avatars', '${userB}/photo.png'); set role authenticated;`)
  check((await rows(`select name from storage.objects`)).length, 1)
  check(await rows(`delete from storage.objects where name = '${userB}/photo.png' returning name`), [])
  await database.exec(`reset role; set role anon;`)
  await fail(`select * from public.rpg_profiles`, /permission denied/i)
  await fail(`select public.rpg_password_login_lookup('gabriel', repeat('a',64), repeat('b',64))`, /permission denied/i)
  await database.exec(`reset role; set role service_role;`)
  check((await rows(`select public.rpg_password_login_lookup('gabriel', repeat('a',64), repeat('b',64)) as result`))[0].result, { allowed: true, email: 'private-a@example.org' })
  check((await rows(`select public.rpg_password_login_lookup('nonexistent', repeat('c',64), repeat('d',64)) as result`))[0].result, { allowed: true, email: null })
  for (let index = 0; index < 9; index++) await rows(`select public.rpg_password_login_lookup('nonexistent', repeat('c',64), repeat('d',64))`)
  check((await rows(`select public.rpg_password_login_lookup('nonexistent', repeat('c',64), repeat('d',64)) as result`))[0].result, { allowed: false })
  check((await rows(`select public.rpg_password_login_lookup('gabriel', 'invalid', repeat('d',64)) as result`))[0].result, { allowed: false })
  await database.exec(`reset role; update rpg_private.login_attempts set window_start = now() - interval '16 minutes'; set role service_role;`)
  check((await rows(`select public.rpg_password_login_lookup('nonexistent', repeat('c',64), repeat('d',64)) as result`))[0].result, { allowed: true, email: null })
  await database.exec(`reset role; update rpg_private.login_attempts set attempts = 120, window_start = now() where bucket = 'global'; set role service_role;`)
  check((await rows(`select public.rpg_password_login_lookup('gabriel', repeat('e',64), repeat('f',64)) as result`))[0].result, { allowed: false })
  await database.exec(`reset role;`)
  check((await rows(`select public, file_size_limit::int, allowed_mime_types from storage.buckets where id = 'rpg-avatars'`))[0], {
    public: false, file_size_limit: 5242880, allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'],
  })
  console.log(`SQL integration: ${assertions} assertions passed (isolated PostgreSQL/PGlite; Supabase Auth and Storage schemas mocked).`)
} finally {
  await database.close()
}
