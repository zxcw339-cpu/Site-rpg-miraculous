import assert from 'node:assert/strict'
import test from 'node:test'
import { createLoginHandler } from '../supabase/functions/login-with-username/handler.ts'
import type { LoginConfig } from '../supabase/functions/login-with-username/handler.ts'

const config: LoginConfig = {
  supabaseUrl: 'https://project.supabase.co', serviceRoleKey: 'server-only', anonKey: 'public-key',
  allowedOrigins: ['https://example.github.io'], rateLimitSecret: 'test-only-secret-never-deploy-this-123',
}
const request = (body: unknown, extra: Record<string, string> = {}) => new Request('https://project.supabase.co/functions/v1/login-with-username', {
  method: 'POST', headers: { Origin: config.allowedOrigins[0], 'Content-Type': 'application/json', ...extra }, body: JSON.stringify(body),
})

test('username login blocks unwanted origins and malformed bodies before contacting Supabase', async () => {
  const handler = createLoginHandler(config, async () => { throw new Error('must not fetch') })
  assert.equal((await handler(request({ username: 'player', password: 'valid password' }, { Origin: 'https://other.example' }))).status, 403)
  assert.equal((await handler(request({ username: 'player', password: 'x'.repeat(257) }))).status, 400)
  assert.equal((await handler(request({ username: 'player', password: 'x'.repeat(9000) }))).status, 400)
  assert.equal((await handler(request({ username: '../admin', password: 'secret' }))).status, 400)
})

test('username login fails closed when missing configuration or rate gate is unavailable', async () => {
  let contacted = false
  const absentConfig = createLoginHandler({ ...config, rateLimitSecret: '' }, async () => { contacted = true; throw new Error('unexpected') })
  assert.equal((await absentConfig(request({ username: 'player', password: 'secret' }))).status, 503)
  assert.equal(contacted, false)
  const gateDown = createLoginHandler(config, async () => new Response('unavailable', { status: 500 }))
  assert.equal((await gateDown(request({ username: 'player', password: 'secret' }))).status, 503)
})

test('rate limit rejection never attempts password authentication', async () => {
  let calls = 0
  const handler = createLoginHandler(config, async () => { calls++; return Response.json({ allowed: false }) })
  const result = await handler(request({ username: 'player', password: 'secret' }))
  assert.equal(result.status, 429)
  assert.equal(calls, 1)
  assert.equal(result.headers.get('Retry-After'), '900')
})

test('successful login sends normalized username and keyed hashes, returns only session tokens', async () => {
  const calls: { url: string; init: RequestInit }[] = []
  const handler = createLoginHandler(config, async (url, init) => {
    calls.push({ url: String(url), init: init! })
    return calls.length === 1
      ? Response.json({ allowed: true, email: 'private@example.org' })
      : Response.json({ access_token: 'access', refresh_token: 'refresh', expires_in: 3600, user: { email: 'private@example.org' }, provider_token: 'never-expose' })
  })
  const result = await handler(request({ username: '  GaBrIeL  ', password: ' secret ', captchaToken: 'captcha' }, { 'x-forwarded-for': 'spoofed, 127.0.0.1' }))
  assert.equal(result.status, 200)
  assert.deepEqual(await result.json(), { access_token: 'access', refresh_token: 'refresh', token_type: 'bearer', expires_in: 3600 })
  assert.equal(result.headers.get('Cache-Control'), 'no-store')
  const lookupBody = JSON.parse(String(calls[0].init.body))
  assert.equal(lookupBody.p_username, 'gabriel')
  assert.match(lookupBody.p_ip_hash, /^[a-f0-9]{64}$/)
  assert.match(lookupBody.p_username_hash, /^[a-f0-9]{64}$/)
  assert.equal(JSON.stringify(lookupBody).includes('password'), false)
  assert.deepEqual(JSON.parse(String(calls[1].init.body)), { email: 'private@example.org', password: ' secret ', gotrue_meta_security: { captcha_token: 'captcha' } })
  assert.equal(new Headers(calls[1].init.headers).get('apikey'), config.anonKey)
})

test('unknown and incorrect-password users receive identical neutral errors with no email', async () => {
  const run = async (email: string | null) => {
    let calls = 0
    const handler = createLoginHandler(config, async () => ++calls === 1
      ? Response.json({ allowed: true, email })
      : Response.json({ error: email ? 'email_not_confirmed' : 'user_not_found' }, { status: 400 }))
    const result = await handler(request({ username: 'player', password: 'secret' }))
    assert.equal(result.status, 401)
    assert.equal(calls, 2)
    return result.text()
  }
  assert.equal(await run(null), await run('private@example.org'))
})

test('forged leading IP chain cannot change the additional client bucket', async () => {
  const hashes: string[] = []
  const handler = createLoginHandler(config, async (_url, init) => {
    hashes.push(JSON.parse(String(init!.body)).p_ip_hash)
    return Response.json({ allowed: false })
  })
  await handler(request({ username: 'player', password: 'secret' }, { 'x-forwarded-for': '1.2.3.4, 10.0.0.5' }))
  await handler(request({ username: 'player', password: 'secret' }, { 'x-forwarded-for': '9.8.7.6, 10.0.0.5' }))
  assert.equal(hashes[0], hashes[1])
})
