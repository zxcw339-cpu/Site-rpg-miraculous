import { useEffect, useId, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { UserIcon } from './Icons'
import { Modal } from './Modal'
import '../home-profile.css'

export interface HomeProfileData {
  name: string
  bio: string
  photoUrl?: string
}

export interface HomeProfileChanges {
  name: string
  bio: string
  photo?: File
  removePhoto?: boolean
}

interface HomeProfileProps {
  profile: HomeProfileData
  onUpdate: (changes: HomeProfileChanges) => void
  onExit: () => void
}

const photoTypes = new Set(['image/png', 'image/jpeg', 'image/webp'])
const photoLimit = 5 * 1024 * 1024

export function HomeProfile({ profile, onUpdate, onExit }: HomeProfileProps) {
  const id = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLElement>(null)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [editing, setEditing] = useState(false)
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
    </section>

    <span className="sr-only" role="status">{notice}</span>
    {editing && <ProfileEditor profile={profile} onClose={closeEditor} onApply={changes => {
      onUpdate(changes)
      setNotice('Perfil atualizado nesta prévia. As alterações são temporárias.')
      closeEditor()
    }} />}
  </div>
}

function ProfileEditor({ profile, onClose, onApply }: {
  profile: HomeProfileData
  onClose: () => void
  onApply: (changes: HomeProfileChanges) => void
}) {
  const id = useId()
  const [name, setName] = useState(profile.name)
  const [bio, setBio] = useState(profile.bio)
  const [nameError, setNameError] = useState('')
  const [photoError, setPhotoError] = useState('')
  const [newPhoto, setNewPhoto] = useState<File>()
  const [photoUrl, setPhotoUrl] = useState('')
  const [loadingPhoto, setLoadingPhoto] = useState(false)
  const [removePhoto, setRemovePhoto] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
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

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      setNameError('Digite o nome que você quer usar.')
      nameRef.current?.focus()
      return
    }
    if (photoError || loadingPhoto) {
      photoRef.current?.focus()
      return
    }
    onApply({ name: name.trim(), bio: bio.trim(), photo: newPhoto, removePhoto })
  }

  return <Modal open onClose={onClose} titleId={`${id}-title`} descriptionId={`${id}-note`} className="home-profile-modal">
    <p className="home-profile-kicker">DO SEU JEITO</p>
    <h2 id={`${id}-title`}>Editar perfil</h2>
    <p className="home-profile-note" id={`${id}-note`}>Alterações temporárias. Nada será salvo ao recarregar.</p>

    <form className="home-profile-form" onSubmit={submit} noValidate autoComplete="off">
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
        <label htmlFor={`${id}-name`}>Nome</label>
        <input ref={nameRef} id={`${id}-name`} type="text" required maxLength={80} value={name} aria-invalid={Boolean(nameError)} aria-describedby={nameError ? `${id}-name-error` : undefined} onChange={event => {
          setName(event.target.value.slice(0, 80))
          setNameError('')
        }} />
        {nameError && <p id={`${id}-name-error`} className="home-profile-error">{nameError}</p>}
      </div>

      <div className="home-profile-field">
        <label htmlFor={`${id}-bio`}>Sobre mim <span>Opcional</span></label>
        <textarea id={`${id}-bio`} rows={4} maxLength={300} value={bio} placeholder="Um pouco sobre você e suas histórias…" aria-describedby={`${id}-bio-count`} onChange={event => setBio(event.target.value.slice(0, 300))} />
        <p className="home-profile-count" id={`${id}-bio-count`}>{bio.length}/300 caracteres</p>
      </div>

      <div className="home-profile-form-actions">
        <button className="home-profile-cancel" type="button" onClick={onClose}>Cancelar</button>
        <button className="home-profile-apply" type="submit" disabled={loadingPhoto}>Aplicar à prévia</button>
      </div>
    </form>
  </Modal>
}
