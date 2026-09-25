import { useEffect, useId, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { UserIcon } from './Icons'
import { Modal } from './Modal'
import '../home-profile.css'
import '../profile-auth.css'

export interface HomeProfileData {
  name: string
  bio: string
  photoUrl?: string
  username?: string | null
}

export interface HomeProfileChanges {
  name: string
  bio: string
  photo?: File
  removePhoto?: boolean
  username?: string
}

interface HomeProfileProps {
  profile: HomeProfileData
  onUpdate: (changes: HomeProfileChanges) => void | Promise<void>
  onPasswordUpdate?: (password: string) => Promise<void>
  onExit: () => void
  authenticated?: boolean
}

const photoTypes = new Set(['image/png', 'image/jpeg', 'image/webp'])
const photoLimit = 5 * 1024 * 1024
const usernamePattern = /^[a-z0-9][a-z0-9_.-]{2,31}$/

export function HomeProfile({ profile, onUpdate, onPasswordUpdate, onExit, authenticated = false }: HomeProfileProps) {
  const id = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLElement>(null)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [position, setPosition] = useState({ left: 78, bottom: 28 })
  const [notice, setNotice] = useState('')
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | undefined>()
  const showPhoto = profile.photoUrl && profile.photoUrl !== failedPhotoUrl

  function positionPopover() {
    const bounds = triggerRef.current?.getBoundingClientRect()
    if (!bounds) return
    setPosition({
      left: Math.max(16, Math.min(bounds.right + 18, window.innerWidth - 338)),
      bottom: Math.max(18, window.innerHeight - bounds.bottom),
    })
  }

  useEffect(() => {
    if (!popoverOpen) return
    window.addEventListener('resize', positionPopover)
    return () => window.removeEventListener('resize', positionPopover)
  }, [popoverOpen])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 4_500)
    return () => window.clearTimeout(timer)
  }, [notice])

  function closeEditor() {
    setEditing(false)
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  return <div className="home-profile">
    <button
      ref={triggerRef}
      className="home-profile-trigger"
      type="button"
      aria-label="Abrir perfil"
      aria-expanded={popoverOpen}
      popoverTarget={`${id}-popover`}
      onClick={positionPopover}
      title="Seu perfil"
    >
      {showPhoto ? <img src={profile.photoUrl} alt="" onError={() => setFailedPhotoUrl(profile.photoUrl)} /> : <UserIcon />}
    </button>

    <section
      ref={popoverRef}
      id={`${id}-popover`}
      className="home-profile-popover"
      popover="auto"
      aria-labelledby={`${id}-name`}
      style={{ left: position.left, bottom: position.bottom, maxHeight: `calc(100svh - ${position.bottom + 18}px)` }}
      onToggle={event => setPopoverOpen(event.newState === 'open')}
    >
      <div className="home-profile-summary">
        <div className="home-profile-avatar">
          {showPhoto ? <img src={profile.photoUrl} alt="Sua foto de perfil" onError={() => setFailedPhotoUrl(profile.photoUrl)} /> : <UserIcon />}
        </div>
        <div className="home-profile-identity">
          <p className="home-profile-kicker">SEU PERFIL</p>
          <h2 id={`${id}-name`}>{profile.name}</h2>
          {authenticated && profile.username && <p className="home-profile-username">@{profile.username}</p>}
        </div>
      </div>
      <p className={`home-profile-bio${profile.bio.trim() ? '' : ' home-profile-bio-empty'}`}>
        {profile.bio.trim() || 'Sua biografia ainda está em branco.'}
      </p>
      <div className="home-profile-actions">
        <button className="home-profile-edit" type="button" onClick={() => {
          popoverRef.current?.hidePopover()
          triggerRef.current?.focus()
          setNotice('')
          setEditing(true)
        }}>Editar perfil</button>
        <button className="home-profile-exit" type="button" onClick={() => {
          popoverRef.current?.hidePopover()
          onExit()
        }}>Sair</button>
      </div>
      {authenticated && onPasswordUpdate && <button className="home-profile-password" type="button" onClick={() => {
        popoverRef.current?.hidePopover()
        setNotice('')
        setPasswordOpen(true)
      }}>Definir ou alterar senha para entrar também pelo e-mail</button>}
    </section>

    {notice && <p className="home-profile-saved" role="status">{notice}</p>}
    {editing && <ProfileEditor profile={profile} authenticated={authenticated} onClose={closeEditor} onApply={async changes => {
      await onUpdate(changes)
      setNotice(authenticated ? 'Perfil salvo na sua conta.' : 'Perfil atualizado nesta prévia. As alterações são temporárias.')
      closeEditor()
    }} />}
    {passwordOpen && onPasswordUpdate && <PasswordAccessModal onClose={() => {
      setPasswordOpen(false)
      requestAnimationFrame(() => triggerRef.current?.focus())
    }} onSave={async password => {
      await onPasswordUpdate(password)
      setPasswordOpen(false)
      setNotice('Senha salva. Você pode entrar pelo e-mail e, se escolher um nome de usuário, também por ele.')
      requestAnimationFrame(() => triggerRef.current?.focus())
    }} />}
  </div>
}

function PasswordAccessModal({ onClose, onSave }: { onClose: () => void; onSave: (password: string) => Promise<void> }) {
  const id = useId()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const busyRef = useRef(false)
  const passwordRef = useRef<HTMLInputElement>(null)
  const confirmationRef = useRef<HTMLInputElement>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busyRef.current) return
    setError('')
    if (password.length < 8 || password.length > 256) {
      setError('Use uma senha de 8 a 256 caracteres.')
      passwordRef.current?.focus()
      return
    }
    if (password !== confirmation) {
      setError('As senhas precisam ser iguais.')
      confirmationRef.current?.focus()
      return
    }
    busyRef.current = true
    setSaving(true)
    try {
      await onSave(password)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar a senha. Tente novamente.')
    } finally {
      setPassword('')
      setConfirmation('')
      setSaving(false)
      busyRef.current = false
    }
  }

  return <Modal open onClose={() => { if (!busyRef.current) onClose() }} titleId={`${id}-title`} descriptionId={`${id}-note`} className="home-profile-modal">
    <p className="home-profile-kicker">ACESSO À CONTA</p>
    <h2 id={`${id}-title`}>Entrar também com senha</h2>
    <p className="home-profile-note" id={`${id}-note`}>Se você entrou pelo Discord, esta senha será adicionada à mesma conta. Depois poderá usar seu e-mail e senha. Um nome de usuário escolhido em “Editar perfil” também servirá para entrar com essa senha.</p>
    <form className="home-profile-form" onSubmit={submit} noValidate aria-busy={saving}>
      <fieldset className="home-profile-fields" disabled={saving}>
        <div className="home-profile-field">
          <label htmlFor={`${id}-password`}>Nova senha</label>
          <input ref={passwordRef} id={`${id}-password`} type="password" minLength={8} maxLength={256} autoComplete="new-password" value={password} onChange={event => { setPassword(event.target.value); setError('') }} />
        </div>
        <div className="home-profile-field">
          <label htmlFor={`${id}-confirmation`}>Confirme a senha</label>
          <input ref={confirmationRef} id={`${id}-confirmation`} type="password" maxLength={256} autoComplete="new-password" value={confirmation} onChange={event => { setConfirmation(event.target.value); setError('') }} />
        </div>
        {error && <p className="home-profile-error" role="alert">{error}</p>}
        <div className="home-profile-form-actions">
          <button className="home-profile-cancel" type="button" onClick={onClose}>Cancelar</button>
          <button className="home-profile-apply" type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar senha'}</button>
        </div>
      </fieldset>
    </form>
  </Modal>
}

function ProfileEditor({ profile, authenticated, onClose, onApply }: {
  profile: HomeProfileData
  authenticated: boolean
  onClose: () => void
  onApply: (changes: HomeProfileChanges) => Promise<void>
}) {
  const id = useId()
  const [name, setName] = useState(profile.name)
  const [username, setUsername] = useState(profile.username || '')
  const [bio, setBio] = useState(profile.bio)
  const [nameError, setNameError] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const [photoError, setPhotoError] = useState('')
  const [newPhoto, setNewPhoto] = useState<File>()
  const [photoUrl, setPhotoUrl] = useState('')
  const [loadingPhoto, setLoadingPhoto] = useState(false)
  const [removePhoto, setRemovePhoto] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const usernameRef = useRef<HTMLInputElement>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const previewUrl = photoUrl || (removePhoto ? undefined : profile.photoUrl)

  useEffect(() => {
    if (!photoUrl) return
    return () => URL.revokeObjectURL(photoUrl)
  }, [photoUrl])

  function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    if (!file) return
    setPhotoError('')
    setNewPhoto(undefined)
    setPhotoUrl('')
    setLoadingPhoto(false)
    if (!photoTypes.has(file.type)) {
      setPhotoError('Escolha uma imagem PNG, JPEG ou WebP.')
      event.currentTarget.value = ''
      return
    }
    if (file.size > photoLimit) {
      setPhotoError('A imagem deve ter no máximo 5 MB.')
      event.currentTarget.value = ''
      return
    }
    setNewPhoto(file)
    setPhotoUrl(URL.createObjectURL(file))
    setLoadingPhoto(true)
    setRemovePhoto(false)
  }

  function clearPhoto() {
    setPhotoUrl('')
    setNewPhoto(undefined)
    setLoadingPhoto(false)
    setRemovePhoto(true)
    setPhotoError('')
    if (photoRef.current) photoRef.current.value = ''
    photoRef.current?.focus()
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (savingRef.current) return
    setSaveError('')
    if (!name.trim()) {
      setNameError('Digite o nome que você quer usar.')
      nameRef.current?.focus()
      return
    }
    const normalizedUsername = username.trim().toLowerCase()
    if (authenticated && normalizedUsername && !usernamePattern.test(normalizedUsername)) {
      setUsernameError('Use de 3 a 32 caracteres: letras sem acento, números, ponto, hífen ou sublinhado. Comece com uma letra ou número.')
      usernameRef.current?.focus()
      return
    }
    if (photoError || loadingPhoto) {
      photoRef.current?.focus()
      return
    }
    savingRef.current = true
    setSaving(true)
    try {
      await onApply({ name: name.trim(), bio: bio.trim(), photo: newPhoto, removePhoto, ...(authenticated ? { username: normalizedUsername } : {}) })
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Não foi possível salvar o perfil. Tente novamente.')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  return <Modal open onClose={() => { if (!savingRef.current) onClose() }} titleId={`${id}-title`} descriptionId={`${id}-note`} className={`home-profile-modal${saving ? ' home-profile-saving' : ''}`}>
    <p className="home-profile-kicker">DO SEU JEITO</p>
    <h2 id={`${id}-title`}>Editar perfil</h2>
    <p className="home-profile-note" id={`${id}-note`}>{authenticated ? 'Seu nome, sua foto e sua biografia ficam salvos na sua conta.' : 'Alterações temporárias. Nada será salvo ao recarregar.'}</p>

    <form className="home-profile-form" onSubmit={submit} noValidate autoComplete="off" aria-busy={saving}>
      <fieldset className="home-profile-fields" disabled={saving}>
      <div className="home-profile-photo-row">
        <div className="home-profile-photo-control">
          <input
            ref={photoRef}
            id={`${id}-photo`}
            className="sr-only"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-invalid={Boolean(photoError)}
            aria-describedby={`${id}-photo-hint${photoError ? ` ${id}-photo-error` : ''}`}
            onChange={selectPhoto}
          />
          <label className="home-profile-photo-select" htmlFor={`${id}-photo`}>
            <span className="home-profile-photo-preview">
              {previewUrl ? <img src={previewUrl} alt="Prévia da foto do perfil" onLoad={() => setLoadingPhoto(false)} onError={() => {
                if (!photoUrl) setRemovePhoto(true)
                setPhotoUrl('')
                setNewPhoto(undefined)
                setLoadingPhoto(false)
                setPhotoError('Não foi possível abrir a imagem. Escolha outro arquivo.')
                if (photoRef.current) photoRef.current.value = ''
              }} /> : <UserIcon />}
            </span>
            <span>{previewUrl ? 'Trocar foto' : 'Escolher foto'}</span>
          </label>
        </div>
        <div className="home-profile-photo-info">
          <p id={`${id}-photo-hint`}>Foto opcional<br /><span>PNG, JPEG ou WebP · até 5 MB</span></p>
          {(previewUrl || photoError) && <button className="home-profile-photo-remove" type="button" onClick={clearPhoto}>Remover foto</button>}
          {loadingPhoto && <p className="home-profile-photo-loading" role="status">Carregando imagem…</p>}
          {photoError && <p id={`${id}-photo-error`} className="home-profile-error" role="alert">{photoError}</p>}
        </div>
      </div>

      <div className="home-profile-field">
        <label htmlFor={`${id}-name`}>{authenticated ? 'Nome de exibição' : 'Nome'}</label>
        <input ref={nameRef} id={`${id}-name`} type="text" required maxLength={80} value={name} aria-invalid={Boolean(nameError)} aria-describedby={nameError ? `${id}-name-error` : undefined} onChange={event => {
          setName(event.target.value.slice(0, 80))
          setNameError('')
        }} />
        {nameError && <p id={`${id}-name-error`} className="home-profile-error">{nameError}</p>}
      </div>

      {authenticated && <div className="home-profile-field">
        <label htmlFor={`${id}-username`}>Nome de usuário <span>Opcional</span></label>
        <input ref={usernameRef} id={`${id}-username`} type="text" maxLength={32} autoCapitalize="none" autoCorrect="off" spellCheck={false} value={username} aria-invalid={Boolean(usernameError)} aria-describedby={`${id}-username-hint${usernameError ? ` ${id}-username-error` : ''}`} onChange={event => {
          setUsername(event.target.value.toLowerCase())
          setUsernameError('')
        }} />
        <p className="home-profile-field-hint" id={`${id}-username-hint`}>É único e serve para entrar com senha. Se entrou pelo Discord, pode continuar usando-o; o acesso por nome também exige uma senha definida na conta.</p>
        {usernameError && <p id={`${id}-username-error`} className="home-profile-error">{usernameError}</p>}
      </div>}

      <div className="home-profile-field">
        <label htmlFor={`${id}-bio`}>Sobre mim <span>Opcional</span></label>
        <textarea id={`${id}-bio`} rows={4} maxLength={300} value={bio} placeholder="Um pouco sobre você e suas histórias…" aria-describedby={`${id}-bio-count`} onChange={event => setBio(event.target.value.slice(0, 300))} />
        <p className="home-profile-count" id={`${id}-bio-count`}>{bio.length}/300 caracteres</p>
      </div>

      <div className="home-profile-form-actions">
        <button className="home-profile-cancel" type="button" onClick={onClose}>Cancelar</button>
        <button className="home-profile-apply" type="submit" disabled={loadingPhoto || saving}>{saving ? 'Salvando…' : authenticated ? 'Salvar perfil' : 'Aplicar à prévia'}</button>
      </div>
      </fieldset>
      {saving && <p className="home-profile-field-hint" role="status">Salvando as alterações…</p>}
      {saveError && <p className="home-profile-error" role="alert">{saveError}</p>}
    </form>
  </Modal>
}
