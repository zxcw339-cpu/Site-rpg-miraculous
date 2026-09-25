import assert from 'node:assert/strict'
import { test } from 'node:test'
import { appReturnUrl, authErrorMessage, publicAuthConfig } from '../src/auth/config.ts'

test('only public Supabase keys and HTTPS project URLs are accepted', () => {
  assert.equal(publicAuthConfig('', ''), null)
  assert.equal(publicAuthConfig('https://example.supabase.co', 'sb_secret_not-for-browser'), null)
  assert.equal(publicAuthConfig('http://example.supabase.co', 'sb_publishable_test'), null)
  assert.equal(publicAuthConfig('https://user:pass@example.supabase.co', 'sb_publishable_test'), null)
  const jwt = (role: string) => `header.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`
  assert.equal(publicAuthConfig('https://example.supabase.co', jwt('service_role')), null)
  assert.ok(publicAuthConfig('https://example.supabase.co', jwt('anon')))
  assert.ok(publicAuthConfig('https://example.supabase.co', 'sb_publishable_test'))
})

test('callbacks preserve Pages subdirectory without leaking parameters or hash routes', () => {
  assert.equal(appReturnUrl(new URL('https://example.github.io/rpg/?code=secret#fichas')), 'https://example.github.io/rpg/')
  assert.equal(appReturnUrl(new URL('http://127.0.0.1:5173/#login')), 'http://127.0.0.1:5173/')
})

test('auth errors never repeat raw database, credentials or provider details', () => {
  assert.equal(authErrorMessage({ message: 'secret email@example.com', code: 'unknown' }), 'Não foi possível concluir. Tente novamente.')
  assert.match(authErrorMessage({ code: 'invalid_credentials' }), /incorretos/)
  assert.match(authErrorMessage({ status: 429 }), /Muitas tentativas/)
  assert.match(authErrorMessage({ code: '23505' }), /nome de usuário/)
  assert.match(authErrorMessage({ code: 'user_already_exists' }), /Discord/)
})
