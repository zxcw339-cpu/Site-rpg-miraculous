import { requireRedirectStorage, requireSupabase } from './client'
import { appReturnUrl, authErrorMessage } from './config'

export interface AccountProfile {
  name: string
  username: string | null
  bio: string
  photoUrl?: string
  avatarPath?: string
}

export async function signIn(identifier: string, password: string) {
  const client = requireSupabase()
  if (identifier.includes('@')) {
    const { error } = await client.auth.signInWithPassword({ email: identifier.trim(), password })
    if (error) throw new Error(authErrorMessage(error))
    return
  }
  const { data, error } = await client.functions.invoke('login-with-username', {
    body: { username: identifier.trim().toLowerCase(), password },
  })
  if (error || !data?.access_token || !data?.refresh_token) {
    const status = error?.context instanceof Response ? error.context.status : 0
    if (status === 429) throw new Error('Muitas tentativas. Aguarde alguns minutos e tente novamente.')
    throw new Error(status === 401 || status === 400
      ? 'Nome ou senha incorretos. Se você usa Discord, entre pelo botão Discord.'
      : 'O acesso por nome está indisponível. Tente entrar com seu e-mail e senha.')
  }
  const { error: sessionError } = await client.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token })
  if (sessionError) throw new Error(authErrorMessage(sessionError))
}

export async function register(input: { username: string; name: string; email: string; password: string; bio: string }) {
  requireRedirectStorage()
  const { data, error } = await requireSupabase().auth.signUp({
    email: input.email.trim(), password: input.password,
    options: {
      emailRedirectTo: appReturnUrl(window.location),
      data: { username: input.username.trim().toLowerCase(), display_name: input.name.trim(), bio: input.bio.trim() },
    },
  })
  if (error) throw new Error(authErrorMessage(error, 'Não foi possível criar a conta. Confira os campos, tente outro nome de usuário ou entre se já possui uma conta.'))
  return data.session ? undefined : 'Confira seu e-mail para confirmar o cadastro. Se já tem uma conta, entre ou recupere sua senha. Abra o link neste mesmo navegador.'
}

export async function signInDiscord() {
  requireRedirectStorage()
  const { error } = await requireSupabase().auth.signInWithOAuth({ provider: 'discord', options: { redirectTo: appReturnUrl(window.location) } })
  if (error) throw new Error(authErrorMessage(error, 'Não foi possível abrir o Discord. Tente novamente.'))
}

export async function requestPasswordReset(email: string) {
  requireRedirectStorage()
  const { error } = await requireSupabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: appReturnUrl(window.location) })
  if (error) throw new Error(authErrorMessage(error, 'Não foi possível enviar o link agora. Tente novamente mais tarde.'))
}

export async function updatePassword(password: string) {
  const { error } = await requireSupabase().auth.updateUser({ password })
  if (error) throw new Error(authErrorMessage(error, 'O link pode ter expirado. Solicite uma nova recuperação de senha.'))
}

export async function loadProfile(userId: string): Promise<AccountProfile> {
  const client = requireSupabase()
  const { data, error } = await client.from('rpg_profiles').select('display_name,username,bio,avatar_path').eq('id', userId).single()
  if (error || !data) throw new Error('Não foi possível carregar seu perfil. Tente novamente em instantes.')
  let photoUrl: string | undefined
  if (data.avatar_path) {
    const { data: signed } = await client.storage.from('rpg-avatars').createSignedUrl(data.avatar_path, 3600)
    photoUrl = signed?.signedUrl
  }
  return { name: data.display_name, username: data.username, bio: data.bio, avatarPath: data.avatar_path ?? undefined, photoUrl }
}

export async function saveProfile(userId: string, current: AccountProfile, changes: {
  name: string; bio: string; username?: string; photo?: File; removePhoto?: boolean
}) {
  const client = requireSupabase()
  const file = changes.photo
  let avatarPath: string | null = changes.removePhoto ? null : current.avatarPath ?? null
  let uploaded: string | undefined
  if (file) {
    const extensions: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }
    if (!extensions[file.type] || file.size > 5 * 1024 * 1024) throw new Error('Escolha uma imagem PNG, JPEG ou WebP de até 5 MB.')
    uploaded = `${userId}/${crypto.randomUUID()}.${extensions[file.type]}`
    const { error } = await client.storage.from('rpg-avatars').upload(uploaded, file, { contentType: file.type, upsert: false })
    if (error) throw new Error('Não foi possível enviar sua foto. Tente novamente.')
    avatarPath = uploaded
  }
  const { error, data } = await client.from('rpg_profiles').update({
    display_name: changes.name.trim(), bio: changes.bio.trim(), avatar_path: avatarPath,
    ...(changes.username !== undefined ? { username: changes.username.trim().toLowerCase() || null } : {}),
  }).eq('id', userId).select('id').single()
  if (error || !data) {
    if (uploaded) await client.storage.from('rpg-avatars').remove([uploaded])
    throw new Error(authErrorMessage(error, 'Não foi possível salvar seu perfil. Tente novamente.'))
  }
  if (current.avatarPath && current.avatarPath !== avatarPath) await client.storage.from('rpg-avatars').remove([current.avatarPath])
  return loadProfile(userId)
}
