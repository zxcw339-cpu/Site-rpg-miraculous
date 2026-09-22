import { createClient } from '@supabase/supabase-js'
import { publicAuthConfig } from './config'

const config = publicAuthConfig(import.meta.env.VITE_SUPABASE_URL?.trim(), import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim())
export const authConfigured = Boolean(config)
export const discordEnabled = authConfigured && import.meta.env.VITE_DISCORD_ENABLED === 'true'

function canPersistSession() {
  try {
    localStorage.setItem('rpg-storage-check', '1')
    localStorage.removeItem('rpg-storage-check')
    return true
  } catch { return false }
}

export function requireRedirectStorage() {
  if (!canPersistSession()) throw new Error('Permita o armazenamento neste navegador para confirmar seu acesso e tente novamente.')
}

// Use the SDK's shared storage so its cross-tab notifications and API tokens
// always represent the same account. Only tokens/PKCE are saved, never passwords.
// With blocked storage, disable persistence/broadcasts and keep login in memory.
export const supabase = config ? createClient(config.url, config.key, {
  auth: { flowType: 'pkce', persistSession: canPersistSession(), autoRefreshToken: true, detectSessionInUrl: true },
}) : null

export function requireSupabase() {
  if (!supabase) throw new Error('O acesso às contas ainda está em configuração.')
  return supabase
}
