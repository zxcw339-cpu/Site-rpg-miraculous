import { useState } from 'react'
import type { Ref } from 'react'
import { ArrowIcon, UserIcon } from './Icons'
import '../welcome.css'

interface WelcomeScreenProps {
  name?: string
  photoUrl?: string
  titleRef: Ref<HTMLHeadingElement>
  onEnter: () => void
  onExit: () => void
}

export function WelcomeScreen({ name, photoUrl, titleRef, onEnter, onExit }: WelcomeScreenProps) {
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | undefined>()
  const displayName = name?.trim() || 'Visitante'
  const showPhoto = photoUrl && photoUrl !== failedPhotoUrl

  return <section className="login-card welcome-card" aria-labelledby="welcome-title" aria-describedby="welcome-note">
    <span className="card-diamond card-diamond-top" aria-hidden="true" />
    <h2 ref={titleRef} id="welcome-title" className="welcome-title" tabIndex={-1}>
      Bem-vindo(a),
      <span className="welcome-name">{displayName}</span>
    </h2>

    <div className="welcome-avatar">
      {showPhoto
        ? <img src={photoUrl} alt="Foto de perfil" onError={() => setFailedPhotoUrl(photoUrl)} />
        : <UserIcon />}
    </div>

    <div className="welcome-actions">
      <button type="button" className="login-button welcome-enter" onClick={onEnter}><span>Entrar</span><ArrowIcon /></button>
      <button type="button" className="secondary-button welcome-exit" onClick={onExit}>Sair</button>
    </div>

    <p id="welcome-note" className="welcome-note">Prévia de navegação. Nenhum acesso ou cadastro real.</p>
  </section>
}
