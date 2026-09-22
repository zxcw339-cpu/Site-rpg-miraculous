import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowIcon, DiscordIcon, EyeIcon } from './Icons'

type LoginFormProps = {
  configured: boolean
  discordEnabled: boolean
  onSignIn: (identifier: string, password: string) => Promise<void>
  onDiscord: () => Promise<void>
}

export function LoginForm({ configured, discordEnabled, onSignIn, onDiscord }: LoginFormProps) {
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({})
  const [feedback, setFeedback] = useState('')
  const [pending, setPending] = useState<'password' | 'discord' | null>(null)
  const [capsLock, setCapsLock] = useState(false)
  const identifierRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const busyRef = useRef(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!configured || busyRef.current) return
    setFeedback('')
    const nextErrors = {
      identifier: identifier.trim() ? undefined : 'Digite seu nome de usuário ou e-mail.',
      password: password ? undefined : 'Digite sua senha.',
    }
    setErrors(nextErrors)
    if (nextErrors.identifier) { identifierRef.current?.focus(); return }
    if (nextErrors.password) { passwordRef.current?.focus(); return }
    busyRef.current = true
    setPending('password')
    try {
      await onSignIn(identifier.trim(), password)
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível entrar. Tente novamente.')
      passwordRef.current?.focus()
    } finally {
      setPassword('')
      setPasswordVisible(false)
      setCapsLock(false)
      setPending(null)
      busyRef.current = false
    }
  }

  async function signInWithDiscord() {
    if (!configured || !discordEnabled || busyRef.current) return
    busyRef.current = true
    setPending('discord')
    setFeedback('')
    setPassword('')
    setPasswordVisible(false)
    try {
      await onDiscord()
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível abrir o Discord. Tente novamente.')
    } finally {
      busyRef.current = false
      setPending(null)
    }
  }

  return <form onSubmit={submit} noValidate aria-busy={Boolean(pending)} aria-describedby={!configured ? 'login-unavailable' : undefined}>
    {!configured && <p id="login-unavailable" className="auth-feedback">O acesso às contas ainda está sendo preparado. Volte em breve.</p>}
    <div className="field-group">
      <label htmlFor="login-name">Nome de usuário ou e-mail</label>
      <input ref={identifierRef} id="login-name" name="username" type="text" placeholder="Seu usuário ou e-mail" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={254} value={identifier} readOnly={Boolean(pending)} aria-invalid={Boolean(errors.identifier)} aria-describedby={errors.identifier ? 'name-error' : undefined} onChange={event => { setIdentifier(event.target.value); setErrors(current => ({ ...current, identifier: undefined })) }} />
      {errors.identifier && <p id="name-error" className="field-error">{errors.identifier}</p>}
    </div>
    <div className="field-group">
      <label htmlFor="login-password">Senha</label>
      <div className="password-field">
        <input ref={passwordRef} id="login-password" name="password" type={passwordVisible ? 'text' : 'password'} placeholder="Sua senha" autoComplete="current-password" required maxLength={256} value={password} readOnly={Boolean(pending)} aria-invalid={Boolean(errors.password)} aria-describedby={[errors.password ? 'password-error' : '', capsLock ? 'caps-lock' : ''].filter(Boolean).join(' ') || undefined} onChange={event => { setPassword(event.target.value); setErrors(current => ({ ...current, password: undefined })) }} onKeyUp={event => setCapsLock(event.getModifierState('CapsLock'))} onKeyDown={event => setCapsLock(event.getModifierState('CapsLock'))} onBlur={() => setCapsLock(false)} />
        <button className="password-toggle" type="button" aria-label={passwordVisible ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={passwordVisible} aria-controls="login-password" onClick={() => setPasswordVisible(current => !current)}><EyeIcon hidden={passwordVisible} /></button>
      </div>
      {errors.password && <p id="password-error" className="field-error">{errors.password}</p>}
      {capsLock && <p id="caps-lock" className="field-hint">Caps Lock está ativado.</p>}
    </div>
    <a className="auth-forgot-link" href="#recuperar-senha">Esqueci minha senha</a>
    {feedback && <p className="auth-feedback auth-feedback-error" role="alert">{feedback}</p>}
    <button className="login-button" type="submit" disabled={!configured || Boolean(pending)}><span>{pending === 'password' ? 'Entrando…' : 'Entrar'}</span><ArrowIcon /></button>
    <div className="auth-alternative"><span>ou</span></div>
    <button className="discord-button" type="button" onClick={signInWithDiscord} disabled={!configured || !discordEnabled || Boolean(pending)} aria-describedby={!discordEnabled ? 'login-discord-note' : undefined}><DiscordIcon /><span>{pending === 'discord' ? 'Abrindo Discord…' : 'Continuar com Discord'}</span></button>
    {!discordEnabled && <p id="login-discord-note" className="auth-provider-note">O acesso com Discord estará disponível em breve.</p>}
    {pending && <span className="sr-only" role="status">{pending === 'discord' ? 'Abrindo Discord.' : 'Verificando seu acesso.'}</span>}
  </form>
}
