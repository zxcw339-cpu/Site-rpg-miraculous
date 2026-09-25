import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { normalizeUsername, validateRegistration } from '../auth/validation'
import type { RegistrationErrors, RegistrationInput } from '../auth/validation'
import type { RegistrationOutcome } from '../auth/registration'
import { ArrowIcon, DiscordIcon, EyeIcon, UserIcon } from './Icons'

type RegistrationFormProps = {
  configured: boolean
  discordEnabled: boolean
  onRegister: (input: RegistrationInput) => Promise<RegistrationOutcome>
  onDiscord: () => Promise<void>
}

export function RegistrationForm({ configured, discordEnabled, onRegister, onDiscord }: RegistrationFormProps) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [bio, setBio] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [confirmationVisible, setConfirmationVisible] = useState(false)
  const [errors, setErrors] = useState<RegistrationErrors>({})
  const [feedback, setFeedback] = useState('')
  const [confirmationNotice, setConfirmationNotice] = useState('')
  const [pending, setPending] = useState<'registration' | 'discord' | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const feedbackRef = useRef<HTMLParagraphElement>(null)
  const confirmationRef = useRef<HTMLHeadingElement>(null)
  const busyRef = useRef(false)

  useEffect(() => { if (feedback) feedbackRef.current?.focus() }, [feedback])
  useEffect(() => { if (confirmationNotice) confirmationRef.current?.focus() }, [confirmationNotice])

  function clearPasswords() {
    setPassword('')
    setConfirmation('')
    setPasswordVisible(false)
    setConfirmationVisible(false)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!configured || busyRef.current) return
    setFeedback('')
    setConfirmationNotice('')
    const input = { username: normalizeUsername(username), name: name.trim(), email: email.trim(), password, bio: bio.trim() }
    const nextErrors = validateRegistration(input, confirmation)
    setErrors(nextErrors)
    const firstError = (['name', 'username', 'email', 'password', 'confirmation', 'bio'] as const).find(field => nextErrors[field])
    if (firstError) { formRef.current?.querySelector<HTMLElement>(`[name="${firstError}"]`)?.focus(); return }
    busyRef.current = true
    setPending('registration')
    try {
      const result = await onRegister(input)
      if (result.kind === 'confirmation') setConfirmationNotice(result.message)
      else if (result.kind !== 'authenticated') setFeedback(result.message)
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível criar sua conta. Tente novamente.')
    } finally {
      clearPasswords()
      setPending(null)
      busyRef.current = false
    }
  }

  async function registerWithDiscord() {
    if (!configured || !discordEnabled || busyRef.current) return
    busyRef.current = true
    setPending('discord')
    setFeedback('')
    setConfirmationNotice('')
    clearPasswords()
    try {
      await onDiscord()
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível abrir o Discord. Tente novamente.')
    } finally {
      setPending(null)
      busyRef.current = false
    }
  }

  if (confirmationNotice) return <div className="registration-result" role="status">
    <div className="registration-avatar-placeholder" aria-hidden="true"><UserIcon /></div>
    <h3 ref={confirmationRef} tabIndex={-1}>Confirme seu e-mail</h3>
    <p>{confirmationNotice}</p>
    <p className="field-hint">Não chegou? Verifique a pasta de spam e o endereço informado. O cadastro só termina após a confirmação.</p>
    <div className="registration-result-actions">
      <a className="login-button" href="#login">Ir para o login <ArrowIcon /></a>
      <button type="button" className="secondary-button" onClick={() => setConfirmationNotice('')}>Usar outro e-mail</button>
    </div>
  </div>

  return <form ref={formRef} className="registration-form" onSubmit={submit} noValidate aria-busy={Boolean(pending)} aria-describedby={!configured ? 'registration-unavailable' : undefined}>
    <aside className="registration-profile" aria-label="Seu perfil">
      <h3>Seu perfil</h3>
      <div className="registration-avatar-placeholder"><UserIcon /></div>
      <p className="profile-hint">Adicione sua foto pelo perfil depois de entrar.</p>
      <p className="profile-hint">Seu nome é o de quem joga, não o do personagem.</p>
    </aside>

    <div className="registration-fields">
      {!configured && <p id="registration-unavailable" className="auth-feedback">O cadastro ainda está sendo preparado. Volte em breve.</p>}
      <div className="registration-passwords">
        <div className="field-group">
          <label htmlFor="register-name">Seu nome</label>
          <input id="register-name" name="name" type="text" placeholder="Como chamar você?" autoComplete="name" required maxLength={80} value={name} readOnly={Boolean(pending)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'register-name-error' : undefined} onChange={event => { setName(event.target.value); setErrors(current => ({ ...current, name: undefined })) }} />
          {errors.name && <p id="register-name-error" className="field-error">{errors.name}</p>}
        </div>
        <div className="field-group">
          <label htmlFor="register-username">Nome de usuário</label>
          <input id="register-username" name="username" type="text" placeholder="seu.usuario" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={32} value={username} readOnly={Boolean(pending)} aria-invalid={Boolean(errors.username)} aria-describedby={`register-username-hint${errors.username ? ' register-username-error' : ''}`} onChange={event => { setUsername(normalizeUsername(event.target.value)); setErrors(current => ({ ...current, username: undefined })) }} />
          <p id="register-username-hint" className="field-hint">Único, sem espaços nem acentos.</p>
          {errors.username && <p id="register-username-error" className="field-error">{errors.username}</p>}
        </div>
      </div>
      <div className="field-group">
        <label htmlFor="register-email">E-mail</label>
        <input id="register-email" name="email" type="email" placeholder="voce@exemplo.com" autoComplete="email" autoCapitalize="none" spellCheck={false} required maxLength={254} value={email} readOnly={Boolean(pending)} aria-invalid={Boolean(errors.email)} aria-describedby={`register-email-hint${errors.email ? ' register-email-error' : ''}`} onChange={event => { setEmail(event.target.value); setErrors(current => ({ ...current, email: undefined })) }} />
        <p id="register-email-hint" className="field-hint">Para confirmar sua conta e recuperar o acesso.</p>
        {errors.email && <p id="register-email-error" className="field-error">{errors.email}</p>}
      </div>
      <div className="registration-passwords">
        <div className="field-group">
          <label htmlFor="register-password">Senha</label>
          <div className="password-field">
            <input id="register-password" name="password" type={passwordVisible ? 'text' : 'password'} placeholder="Pelo menos 8 caracteres" autoComplete="new-password" required minLength={8} maxLength={256} value={password} readOnly={Boolean(pending)} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'register-password-error' : undefined} onChange={event => { setPassword(event.target.value); setErrors(current => ({ ...current, password: undefined, confirmation: undefined })) }} />
            <button type="button" className="password-toggle" aria-label={passwordVisible ? 'Ocultar senha de cadastro' : 'Mostrar senha de cadastro'} aria-pressed={passwordVisible} aria-controls="register-password" onClick={() => setPasswordVisible(current => !current)}><EyeIcon hidden={passwordVisible} /></button>
          </div>
          {errors.password && <p id="register-password-error" className="field-error">{errors.password}</p>}
        </div>
        <div className="field-group">
          <label htmlFor="register-confirmation">Confirmar senha</label>
          <div className="password-field">
            <input id="register-confirmation" name="confirmation" type={confirmationVisible ? 'text' : 'password'} placeholder="Repita a senha" autoComplete="new-password" required maxLength={256} value={confirmation} readOnly={Boolean(pending)} aria-invalid={Boolean(errors.confirmation)} aria-describedby={errors.confirmation ? 'register-confirmation-error' : undefined} onChange={event => { setConfirmation(event.target.value); setErrors(current => ({ ...current, confirmation: undefined })) }} />
            <button type="button" className="password-toggle" aria-label={confirmationVisible ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'} aria-pressed={confirmationVisible} aria-controls="register-confirmation" onClick={() => setConfirmationVisible(current => !current)}><EyeIcon hidden={confirmationVisible} /></button>
          </div>
          {errors.confirmation && <p id="register-confirmation-error" className="field-error">{errors.confirmation}</p>}
        </div>
      </div>
      <div className="field-group">
        <div className="field-label-row"><label htmlFor="register-bio">Sobre mim</label><span className="optional-label">Opcional</span></div>
        <textarea id="register-bio" name="bio" rows={2} maxLength={300} placeholder="Um pouco sobre você e suas histórias..." value={bio} readOnly={Boolean(pending)} aria-invalid={Boolean(errors.bio)} aria-describedby={`register-bio-count${errors.bio ? ' register-bio-error' : ''}`} onChange={event => { setBio(event.target.value.slice(0, 300)); setErrors(current => ({ ...current, bio: undefined })) }} />
        <span id="register-bio-count" className="bio-count">{bio.length}/300 caracteres</span>
        {errors.bio && <p id="register-bio-error" className="field-error">{errors.bio}</p>}
      </div>
      <div className="registration-submit">
        {feedback && <p ref={feedbackRef} className="auth-feedback auth-feedback-error" role="alert" tabIndex={-1}>{feedback}</p>}
        <button className="login-button" type="submit" disabled={!configured || Boolean(pending)}><span>{pending === 'registration' ? 'Criando conta…' : 'Criar conta'}</span><ArrowIcon /></button>
        <div className="auth-alternative"><span>ou</span></div>
        <button className="discord-button" type="button" onClick={registerWithDiscord} disabled={!configured || !discordEnabled || Boolean(pending)} aria-describedby={!discordEnabled ? 'register-discord-note' : undefined}><DiscordIcon /><span>{pending === 'discord' ? 'Abrindo Discord…' : 'Continuar com Discord'}</span></button>
        {!discordEnabled && <p id="register-discord-note" className="auth-provider-note">O acesso com Discord estará disponível em breve.</p>}
        {pending && <span className="sr-only" role="status">{pending === 'discord' ? 'Abrindo Discord.' : 'Enviando seu cadastro.'}</span>}
      </div>
    </div>
  </form>
}
