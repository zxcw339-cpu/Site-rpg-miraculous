import { createLoginHandler } from './handler.ts'

Deno.serve(createLoginHandler({
  supabaseUrl: Deno.env.get('SUPABASE_URL') ?? '',
  serviceRoleKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  anonKey: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  allowedOrigins: (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map(value => value.trim()).filter(Boolean),
  rateLimitSecret: Deno.env.get('LOGIN_RATE_LIMIT_SECRET') ?? '',
}))
