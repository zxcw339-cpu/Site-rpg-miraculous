import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowIcon, EyeIcon } from './Icons'

export function LoginForm({ onPreview }: { onPreview: (name: string) => void }) {
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ name?: string; password?: string }>({})
  const [capsLock, setCapsLock] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = {
      name: name.trim() ? undefined : 'Digite seu nome para experimentar.',
      password: password ? undefined : 'Digite uma senha fictícia para experimentar.',
    }
    setErrors(nextErrors)
    if (nextErrors.name) { nameRef.current?.focus(); return }
    if (nextErrors.password) { passwordRef.current?.focus(); return }
    setPassword('')
    setPasswordVisible(false)
    setCapsLock(false)
    onPreview(name)
  }

  return <form onSubmit={submit} noValidate autoComplete="off" aria-describedby="prototype-note">
    <div className="field-group">
      <label htmlFor="login-name">Nome</label>
      <input ref={nameRef} id="login-name" name="name" type="text" placeholder="Seu nome de usuário" autoComplete="off" autoCapitalize="none" spellCheck={false} required maxLength={80} value={name} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'name-error' : undefined} onChange={event => { setName(event.target.value); setErrors(current => ({ ...current, name: undefined })); }} />
      {errors.name && <p id="name-error" className="field-error">{errors.name}</p>}
    </div>
    <div className="field-group">
      <label htmlFor="login-password">Senha</label>
      <div className="password-field">
        <input ref={passwordRef} id="login-password" name="password" type={passwordVisible ? 'text' : 'password'} placeholder="Sua senha" autoComplete="off" required maxLength={256} value={password} aria-invalid={Boolean(errors.password)} aria-describedby={[errors.password ? 'password-error' : '', capsLock ? 'caps-lock' : ''].filter(Boolean).join(' ') || undefined} onChange={event => { setPassword(event.target.value); setErrors(current => ({ ...current, password: undefined })); }} onKeyUp={event => setCapsLock(event.getModifierState('CapsLock'))} onKeyDown={event => setCapsLock(event.getModifierState('CapsLock'))} onBlur={() => setCapsLock(false)} />
        <button className="password-toggle" type="button" aria-label={passwordVisible ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={passwordVisible} aria-controls="login-password" onClick={() => setPasswordVisible(current => !current)}><EyeIcon hidden={passwordVisible} /></button>
      </div>
      {errors.password && <p id="password-error" className="field-error">{errors.password}</p>}
      {capsLock && <p id="caps-lock" className="field-hint">Caps Lock está ativado.</p>}
    </div>
    <button className="login-button" type="submit"><span>Entrar</span><ArrowIcon /></button>
    <p className="registration-demo-note">Abre a prévia de boas-vindas. Sem autenticação real.</p>
  </form>
}
