export function publicAuthConfig(url = '', key = '') {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.pathname !== '/') return null
    if (!key.startsWith('sb_publishable_')) {
      // Legacy anon JWTs are public too. Reject service_role and arbitrary JWTs.
      const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
      if (payload.role !== 'anon') return null
    }
    return { url: parsed.origin, key }
  } catch { return null }
}

export function appReturnUrl(location: { origin: string; pathname: string }) {
  // Same page works on localhost and under /Site-rpg-miraculous/ on Pages.
  // Never carry an OAuth code, token, hash route or user-supplied return URL.
  return location.origin + location.pathname
}

export function authErrorMessage(error: unknown, fallback = 'Não foi possível concluir. Tente novamente.') {
  const code = (error as { code?: string; status?: number } | null)?.code
  const status = (error as { status?: number } | null)?.status
  if (code === 'invalid_credentials') return 'Nome, e-mail ou senha incorretos. Contas do Discord podem entrar pelo botão Discord.'
  if (code === 'email_not_confirmed') return 'Confirme seu e-mail antes de entrar.'
  if (code === 'weak_password') return 'Escolha uma senha mais forte, com pelo menos 8 caracteres.'
  if (code === 'same_password') return 'Escolha uma senha diferente da atual.'
  if (status === 429 || code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit') return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
  if (code === '23505') return 'Esse nome de usuário já está em uso. Escolha outro.'
  if (code === 'signup_disabled') return 'O cadastro está temporariamente indisponível.'
  if (code === 'email_address_not_authorized') return 'O envio de e-mails ainda está em configuração. Por enquanto, use o Discord.'
  return fallback
}
