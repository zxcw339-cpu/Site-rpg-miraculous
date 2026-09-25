import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './client'
import { loadProfile } from './service'
import type { AccountProfile } from './service'

export function useAccount() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [profileState, setProfileState] = useState<{ userId: string; data: AccountProfile } | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [recovery, setRecovery] = useState(false)
  const userIdRef = useRef<string | undefined>(undefined)
  const userId = session?.user.id
  userIdRef.current = userId

  useEffect(() => {
    if (!supabase) return
    let active = true
    const callbackUrl = new URL(window.location.href)
    const hashParameters = new URLSearchParams(callbackUrl.hash.slice(1))
    const denied = callbackUrl.searchParams.has('error') || hashParameters.has('error')
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      // Do not await Supabase calls here: its Auth lock is still held.
      if (!active) return
      setSession(next)
      setLoading(false)
      if (event === 'PASSWORD_RECOVERY') { setRecovery(true); window.location.hash = '#nova-senha' }
      if (event === 'SIGNED_OUT') { setProfileState(null); setRecovery(false) }
    })
    void supabase.auth.initialize().then(({ error: initializationError }) => {
      // Without the PKCE verifier the SDK leaves a code unconsumed. Do not
      // silently discard it or pretend an older cached session is a new login.
      const unconsumedCode = callbackUrl.searchParams.has('code') && new URL(window.location.href).searchParams.has('code')
      if (active && (initializationError || denied || unconsumedCode)) {
        setError('Não foi possível confirmar o acesso. O link pode ter expirado; solicite outro e abra no mesmo navegador.')
        setLoading(false)
      }
      // Remove auth codes/error details from the address after the SDK consumed them.
      if (active) {
        const cleaned = new URL(window.location.href)
        for (const key of ['code', 'error', 'error_code', 'error_description']) cleaned.searchParams.delete(key)
        if (hashParameters.has('error')) cleaned.hash = '#login'
        window.history.replaceState(null, '', cleaned.pathname + cleaned.search + cleaned.hash)
      }
    }).catch(() => { if (active) { setError('Não foi possível conectar. Confira sua internet e tente novamente.'); setLoading(false) } })
    return () => { active = false; data.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!userId) return
    let active = true
    setError('')
    setProfileLoading(true)
    void loadProfile(userId).then(data => {
      if (active) setProfileState({ userId, data })
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar seu perfil.')
    }).finally(() => { if (active) setProfileLoading(false) })
    return () => { active = false }
  }, [userId, revision])

  const setProfile = useCallback((id: string, data: AccountProfile) => {
    if (userIdRef.current === id) setProfileState({ userId: id, data })
  }, [])
  return {
    session, loading, profileLoading, error, setError, recovery, setRecovery,
    profile: profileState?.userId === userId ? profileState?.data ?? null : null,
    setProfile, retry: () => setRevision(value => value + 1),
  }
}
