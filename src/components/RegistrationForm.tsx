import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { ArrowIcon, EyeIcon, UserIcon } from './Icons'

type RegistrationErrors = {
  name?: string
  password?: string
  confirmation?: string
}

const allowedPhotoTypes = new Set(['image/png', 'image/jpeg', 'image/webp'])
const maxPhotoSize = 5 * 1024 * 1024

export function RegistrationForm({ onPreview }: { onPreview: (name: string, photo?: File, bio?: string) => void }) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [bio, setBio] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [confirmationVisible, setConfirmationVisible] = useState(false)
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoError, setPhotoError] = useState('')
  const [errors, setErrors] = useState<RegistrationErrors>({})
  const nameRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const confirmationRef = useRef<HTMLInputElement>(null)
  const photoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!photoUrl) return
    return () => URL.revokeObjectURL(photoUrl)
  }, [photoUrl])

  function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    if (!file) return
    setPhotoError('')
    setPhotoUrl('')

    if (!allowedPhotoTypes.has(file.type)) {
      setPhotoError('Escolha uma imagem PNG, JPEG ou WebP.')
      event.currentTarget.value = ''
      return
    }
    if (file.size > maxPhotoSize) {
      setPhotoError('A imagem deve ter no máximo 5 MB.')
      event.currentTarget.value = ''
      return
    }

    setPhotoUrl(URL.createObjectURL(file))
  }

  function removePhoto() {
    setPhotoUrl('')
    setPhotoError('')
    if (photoRef.current) photoRef.current.value = ''
    photoRef.current?.focus()
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: RegistrationErrors = {
      name: name.trim() ? undefined : 'Digite seu nome para experimentar.',
      password: password ? undefined : 'Digite uma senha fictícia.',
      confirmation: !confirmation
        ? 'Repita a senha fictícia.'
        : confirmation !== password ? 'As senhas precisam ser iguais.' : undefined,
    }
    setErrors(nextErrors)
    if (photoError) { photoRef.current?.focus(); return }
    if (nextErrors.name) { nameRef.current?.focus(); return }
    if (nextErrors.password) { passwordRef.current?.focus(); return }
    if (nextErrors.confirmation) { confirmationRef.current?.focus(); return }

    // This prototype only checks fields in memory. It never creates an account.
    setPassword('')
    setConfirmation('')
    setPasswordVisible(false)
    setConfirmationVisible(false)
    onPreview(name, photoUrl ? photoRef.current?.files?.[0] : undefined, bio)
  }

  return <form className="registration-form" onSubmit={submit} noValidate autoComplete="off" aria-describedby="registration-demo-note">
    <aside className="registration-profile" aria-label="Foto de perfil opcional">
      <h3>Sua foto</h3>
      <p className="profile-hint">Opcional</p>
      <div className="photo-control">
        <input
          ref={photoRef}
          id="register-photo"
          className="photo-input sr-only"
          name="photo"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-invalid={Boolean(photoError)}
          aria-describedby={`register-photo-hint${photoError ? ' register-photo-error' : ''}`}
          onChange={selectPhoto}
        />
        <label htmlFor="register-photo" className="photo-select">
          <span className="photo-preview">
            {photoUrl
              ? <img src={photoUrl} alt="Prévia da sua foto" onError={() => {
                setPhotoUrl('')
                setPhotoError('Não foi possível abrir a imagem. Escolha outro arquivo.')
                if (photoRef.current) photoRef.current.value = ''
              }} />
              : <span className="photo-placeholder"><UserIcon /></span>}
          </span>
          <span>{photoUrl ? 'Trocar foto' : 'Escolher foto'}</span>
        </label>
      </div>
      <p id="register-photo-hint" className="profile-hint">PNG, JPEG ou WebP<br />Até 5 MB</p>
      {(photoUrl || photoError) && <button type="button" className="photo-remove" onClick={removePhoto}>Remover foto</button>}
      {photoError && <p id="register-photo-error" className="field-error" role="alert">{photoError}</p>}
    </aside>

    <div className="registration-fields">
      <div className="field-group">
        <label htmlFor="register-name">Nome</label>
        <input ref={nameRef} id="register-name" name="name" type="text" placeholder="Como podemos chamar você?" autoComplete="off" required maxLength={80} value={name} aria-invalid={Boolean(errors.name)} aria-describedby={`register-name-hint${errors.name ? ' register-name-error' : ''}`} onChange={event => {
          setName(event.target.value)
          setErrors(current => ({ ...current, name: undefined }))
        }} />
        <p id="register-name-hint" className="field-hint">O nome de quem joga, não o do personagem.</p>
        {errors.name && <p id="register-name-error" className="field-error">{errors.name}</p>}
      </div>

      <div className="registration-passwords">
        <div className="field-group">
          <label htmlFor="register-password">Senha</label>
          <div className="password-field">
            <input ref={passwordRef} id="register-password" name="password" type={passwordVisible ? 'text' : 'password'} placeholder="Uma senha fictícia" autoComplete="off" required maxLength={256} value={password} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'register-password-error' : undefined} onChange={event => {
              setPassword(event.target.value)
              setErrors(current => ({ ...current, password: undefined, confirmation: undefined }))
            }} />
            <button type="button" className="password-toggle" aria-label={passwordVisible ? 'Ocultar senha de cadastro' : 'Mostrar senha de cadastro'} aria-pressed={passwordVisible} aria-controls="register-password" onClick={() => setPasswordVisible(current => !current)}><EyeIcon hidden={passwordVisible} /></button>
          </div>
          {errors.password && <p id="register-password-error" className="field-error">{errors.password}</p>}
        </div>
        <div className="field-group">
          <label htmlFor="register-confirmation">Confirmar senha</label>
          <div className="password-field">
            <input ref={confirmationRef} id="register-confirmation" name="confirmation" type={confirmationVisible ? 'text' : 'password'} placeholder="Repita a senha" autoComplete="off" required maxLength={256} value={confirmation} aria-invalid={Boolean(errors.confirmation)} aria-describedby={errors.confirmation ? 'register-confirmation-error' : undefined} onChange={event => {
              setConfirmation(event.target.value)
              setErrors(current => ({ ...current, confirmation: undefined }))
            }} />
            <button type="button" className="password-toggle" aria-label={confirmationVisible ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'} aria-pressed={confirmationVisible} aria-controls="register-confirmation" onClick={() => setConfirmationVisible(current => !current)}><EyeIcon hidden={confirmationVisible} /></button>
          </div>
          {errors.confirmation && <p id="register-confirmation-error" className="field-error">{errors.confirmation}</p>}
        </div>
      </div>

      <div className="field-group">
        <div className="field-label-row"><label htmlFor="register-bio">Sobre mim</label><span className="optional-label">Opcional</span></div>
        <textarea id="register-bio" name="bio" rows={3} maxLength={300} placeholder="Um pouco sobre você e suas histórias..." value={bio} aria-describedby="register-bio-count" onChange={event => { setBio(event.target.value.slice(0, 300)) }} />
        <span id="register-bio-count" className="bio-count">{bio.length}/300 caracteres</span>
      </div>

      <div className="registration-submit">
        <p id="registration-demo-note" className="registration-demo-note">Use dados fictícios. Abre as boas-vindas sem criar uma conta.</p>
        <button className="login-button" type="submit"><span>Criar conta</span><ArrowIcon /></button>
      </div>
    </div>
  </form>
}
