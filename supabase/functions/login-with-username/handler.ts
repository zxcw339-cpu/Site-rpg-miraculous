export type LoginConfig = {
  supabaseUrl: string
  serviceRoleKey: string
  anonKey: string
  allowedOrigins: string[]
  rateLimitSecret: string
}

const invalidLogin = 'Nome ou senha incorretos. Confira também se o e-mail foi confirmado.'
const unavailable = 'Não foi possível entrar agora. Tente novamente em instantes.'
const maxBodyBytes = 8192

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const size = Number(request.headers.get('content-length'))
  if (Number.isFinite(size) && size > maxBodyBytes) throw new Error('body-too-large')
  if (!request.body) throw new Error('empty-body')
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maxBodyBytes) {
        await reader.cancel()
        throw new Error('body-too-large')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const combined = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    combined.set(chunk, offset)
    offset += chunk.byteLength
  }
  const parsed: unknown = JSON.parse(new TextDecoder().decode(combined))
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid-body')
  return parsed as Record<string, unknown>
}

async function keyedHash(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const result = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))
  return [...new Uint8Array(result)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

function clientScope(request: Request): string {
  // Never trust the attacker-controlled first entry of an appended proxy chain.
  // Hosted gateway headers can also represent a shared proxy. Treat this bucket
  // as supplemental: independent username and global limits are always enforced.
  // On missing/invalid headers all such clients share one conservative bucket.
  const last = request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim().toLowerCase()
  return last && last.length <= 64 && /^[0-9a-f:.]+$/.test(last) ? last : 'unknown-client'
}

export function createLoginHandler(config: LoginConfig, fetcher: typeof fetch = fetch) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin') ?? ''
    const permittedOrigin = config.allowedOrigins.includes(origin) && /^https?:\/\//.test(origin)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Vary': 'Origin',
      'X-Content-Type-Options': 'nosniff',
      ...(permittedOrigin ? { 'Access-Control-Allow-Origin': origin } : {}),
    }
    const respond = (status: number, payload: object) => new Response(JSON.stringify(payload), { status, headers })

    // CORS is a browser boundary, not authentication or an abuse-prevention mechanism.
    // Non-browser callers can forge Origin; the database rate gates still apply.
    if (!permittedOrigin) return respond(403, { error: 'Origem não permitida.' })
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...headers,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
          'Access-Control-Max-Age': '600',
        },
      })
    }
    if (request.method !== 'POST') return respond(405, { error: 'Método não permitido.' })
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
      return respond(415, { error: 'Envie os dados em JSON.' })
    }
    if (!config.supabaseUrl || !config.serviceRoleKey || !config.anonKey || config.rateLimitSecret.length < 32) {
      return respond(503, { error: unavailable })
    }

    let input: Record<string, unknown>
    try {
      input = await readBody(request)
    } catch {
      return respond(400, { error: 'Dados de acesso inválidos.' })
    }
    const username = typeof input.username === 'string' ? input.username.trim().toLowerCase() : ''
    const password = typeof input.password === 'string' ? input.password : ''
    const captchaToken = typeof input.captchaToken === 'string' ? input.captchaToken : undefined
    if (!/^[a-z0-9][a-z0-9_.-]{2,31}$/.test(username) || password.length < 1 || password.length > 256 || (captchaToken?.length ?? 0) > 4096) {
      return respond(400, { error: 'Dados de acesso inválidos.' })
    }

    try {
      const [ipHash, usernameHash] = await Promise.all([
        keyedHash(config.rateLimitSecret, `ip:${clientScope(request)}`),
        keyedHash(config.rateLimitSecret, `username:${username}`),
      ])
      const base = config.supabaseUrl.replace(/\/$/, '')
      const lookup = await fetcher(`${base}/rest/v1/rpc/rpg_password_login_lookup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.serviceRoleKey,
          'Authorization': `Bearer ${config.serviceRoleKey}`,
        },
        body: JSON.stringify({ p_username: username, p_ip_hash: ipHash, p_username_hash: usernameHash }),
        signal: AbortSignal.timeout(10000),
      })
      if (!lookup.ok) return respond(503, { error: unavailable })
      const resolved: unknown = await lookup.json()
      if (!resolved || typeof resolved !== 'object' || !('allowed' in resolved)) {
        return respond(503, { error: unavailable })
      }
      if (resolved.allowed !== true) {
        headers['Retry-After'] = '900'
        return respond(429, { error: 'Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.' })
      }
      const email = 'email' in resolved && typeof resolved.email === 'string' && resolved.email ? resolved.email : null
      // Unknown usernames take the same upstream authentication path. No response
      // includes the resolved email or distinguishes missing, unconfirmed or wrong-password accounts.
      const authResponse = await fetcher(`${base}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': config.anonKey },
        body: JSON.stringify({
          email: email ?? `${crypto.randomUUID()}@invalid.invalid`,
          password,
          ...(captchaToken ? { gotrue_meta_security: { captcha_token: captchaToken } } : {}),
        }),
        signal: AbortSignal.timeout(15000),
      })
      if (authResponse.status === 429) {
        headers['Retry-After'] = '900'
        return respond(429, { error: 'Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.' })
      }
      if (authResponse.status >= 500) return respond(503, { error: unavailable })
      if (!authResponse.ok || !email) return respond(401, { error: invalidLogin })
      const session: unknown = await authResponse.json()
      if (!session || typeof session !== 'object' || !('access_token' in session) || !('refresh_token' in session) ||
        typeof session.access_token !== 'string' || typeof session.refresh_token !== 'string') {
        return respond(503, { error: unavailable })
      }
      return respond(200, {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        token_type: 'bearer',
        ...('expires_in' in session && typeof session.expires_in === 'number' ? { expires_in: session.expires_in } : {}),
      })
    } catch {
      // Never log request bodies, Auth responses, passwords, emails or tokens.
      return respond(503, { error: unavailable })
    }
  }
}
