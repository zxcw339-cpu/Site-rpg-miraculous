import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { isValidEmail } from '../auth/validation'
import { ArrowIcon, EyeIcon } from './Icons'

type PasswordRecoveryProps = {
  mode: 'request' | 'update'
  configured: boolean
  onRequest: (email: string) => Promise<void>
  onUpdate: (password: string) => Promise<void>
}

export function PasswordRecovery({ mode, configured, onRequest, onUpdate }: PasswordRecoveryProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [visible, setVisible] = useState(false)
  const [confirmationVisible, setConfirmationVisible] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmation?: string }>({})
  const [feedback, setFeedback] = useState('')
  const [success, setSuccess] = useState(false)
  const [pending, setPending] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const busyRef = useRef(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!configured || busyRef.current || success) return
    setFeedback('')
    const nextErrors = mode === 'request'
      ? { email: isValidEmail(email.trim()) ? undefined : 'Digite um e-mail válido.' }
      : {
        password: password.length >= 8 && password.length <= 256 ? undefined : 'Use uma senha de 8 a 256 caracteres.',
        confirmation: confirmation === password && confirmation ? undefined : 'As senhas precisam ser iguais.',
      }
    setErrors(nextErrors)
    const invalid = Object.entries(nextErrors).find(([, message]) => message)
    if (invalid) { formRef.current?.querySelector<HTMLElement>(`[name="${invalid[0]}"]`)?.focus(); return }
    busyRef.current = true
    setPending(true)
    try {
      if (mode === 'request') await onRequest(email.trim())
      else await onUpdate(password)
      setSuccess(true)
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível concluir. Tente novamente.')
    } finally {
      setPassword('')
      setConfirmation('')
      setVisible(false)
      setConfirmationVisible(false)
      setPending(false)
      busyRef.current = false
    }
  }

  if (success) return <div className="password-recovery-result">
    <p className="auth-feedback auth-feedback-success" role="status">{mode === 'request' ? 'Se houver uma conta com esse e-mail, você receberá um link para redefinir sua senha. Confira também a pasta de spam.' : 'Sua senha foi atualizada.'}</p>
    <a className="register-link" href={mode === 'request' ? '#login' : '#inicio'}>{mode === 'request' ? 'Voltar para o login' : 'Ir para o início'}<ArrowIcon /></a>
  </div>

  return <form ref={formRef} onSubmit={submit} noValidate aria-busy={pending}>
    {!configured && <p className="auth-feedback">A recuperação de acesso ainda está sendo preparada. Volte em breve.</p>}
    {mode === 'request' ? <div className="field-group">
      <label htmlFor="recovery-email">E-mail da sua conta</label>
      <input id="recovery-email" name="email" type="email" placeholder="voce@exemplo.com" autoComplete="email" autoCapitalize="none" spellCheck={false} required maxLength={254} value={email} readOnly={pending} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'recovery-email-error' : undefined} onChange={event => { setEmail(event.target.value); setErrors({}) }} />
      {errors.email && <p id="recovery-email-error" className="field-error">{errors.email}</p>}
    </div> : <>
      <div className="field-group">
        <label htmlFor="recovery-password">Nova senha</label>
        <div className="password-field">
          <input id="recovery-password" name="password" type={visible ? 'text' : 'password'} placeholder="Pelo menos 8 caracteres" autoComplete="new-password" required minLength={8} maxLength={256} value={password} readOnly={pending} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'recovery-password-error' : undefined} onChange={event => { setPassword(event.target.value); setErrors({}) }} />
          <button type="button" className="password-toggle" aria-label={visible ? 'Ocultar nova senha' : 'Mostrar nova senha'} aria-pressed={visible} aria-controls="recovery-password" onClick={() => setVisible(value => !value)}><EyeIcon hidden={visible} /></button>
        </div>
        {errors.password && <p id="recovery-password-error" className="field-error">{errors.password}</p>}
      </div>
      <div className="field-group">
        <label htmlFor="recovery-confirmation">Confirmar nova senha</label>
        <div className="password-field">
          <input id="recovery-confirmation" name="confirmation" type={confirmationVisible ? 'text' : 'password'} placeholder="Repita a nova senha" autoComplete="new-password" required maxLength={256} value={confirmation} readOnly={pending} aria-invalid={Boolean(errors.confirmation)} aria-describedby={errors.confirmation ? 'recovery-confirmation-error' : undefined} onChange={event => { setConfirmation(event.target.value); setErrors(current => ({ ...current, confirmation: undefined })) }} />
          <button type="button" className="password-toggle" aria-label={confirmationVisible ? 'Ocultar confirmação da nova senha' : 'Mostrar confirmação da nova senha'} aria-pressed={confirmationVisible} aria-controls="recovery-confirmation" onClick={() => setConfirmationVisible(value => !value)}><EyeIcon hidden={confirmationVisible} /></button>
        </div>
        {errors.confirmation && <p id="recovery-confirmation-error" className="field-error">{errors.confirmation}</p>}
      </div>
    </>}
    {feedback && <p className="auth-feedback auth-feedback-error" role="alert">{feedback}</p>}
    <button className="login-button" type="submit" disabled={!configured || pending}><span>{pending ? 'Aguarde…' : mode === 'request' ? 'Enviar link de recuperação' : 'Salvar nova senha'}</span><ArrowIcon /></button>
    {pending && <span className="sr-only" role="status">{mode === 'request' ? 'Solicitando seu link de recuperação.' : 'Atualizando sua senha.'}</span>}
  </form>
}
