export type RegistrationOutcome =
  | { kind: 'authenticated' }
  | { kind: 'confirmation'; message: string }
  | { kind: 'existing'; message: string }
  | { kind: 'unknown'; message: string }

type SignUpResponse = {
  session: object | null
  user: { identities?: readonly unknown[] } | null
}

// With email confirmations enabled, Supabase deliberately returns an obfuscated
// user for an address that already belongs to an account. It has no identities
// and receives no new confirmation email. Never call that a successful signup.
export function registrationOutcome({ session, user }: SignUpResponse): RegistrationOutcome {
  if (session) return { kind: 'authenticated' }
  if (user && Array.isArray(user.identities)) {
    if (user.identities.length > 0) return {
      kind: 'confirmation',
      message: 'Confira seu e-mail e abra o link de confirmação neste navegador. Depois você poderá entrar e verá a página de boas-vindas.',
    }
    return {
      kind: 'existing',
      message: 'Nenhuma conta nova foi criada. Esse e-mail já pode estar ligado a uma conta do Discord. Entre com Discord ou use “Esqueci minha senha”. Para usar o mesmo perfil com nome ou e-mail e senha, entre pelo Discord e defina uma senha em seu perfil.',
    }
  }
  return {
    kind: 'unknown',
    message: 'Não foi possível confirmar a criação da conta. Confira seu e-mail. Se não receber um link, entre pelo Discord ou recupere sua senha.',
  }
}
