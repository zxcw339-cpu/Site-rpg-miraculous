import { useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { GemIcon } from './Icons'
import { HomeProfile } from './HomeProfile'
import '../home.css'

interface WorkspaceShellProps {
  page: 'home' | 'sheets' | 'campaigns'
  children: ReactNode
  profile: { name: string; bio: string; photoUrl?: string }
  titleRef: RefObject<HTMLHeadingElement | null>
  onProfileChange: (changes: { name: string; bio: string; photo?: File; removePhoto?: boolean }) => void
  onExit: () => void
}

function NavigationIcon({ kind }: { kind: 'menu' | 'home' | 'sheets' | 'campaigns' }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'menu' && <path d="M5 6h14M5 12h14M5 18h14" />}
    {kind === 'home' && <><path d="m3 11 9-8 9 8M5 10v10h14V10M9 20v-7h6v7" /></>}
    {kind === 'sheets' && <><path d="M6 3h9l4 4v14H6ZM14 3v5h5M10 12h5M10 16h5" /><path d="M3 7v14" opacity=".5" /></>}
    {kind === 'campaigns' && <><circle cx="12" cy="12" r="9" /><path d="m16 8-2.5 5.5L8 16l2.5-5.5ZM12 1v2M12 21v2M1 12h2M21 12h2" /></>}
  </svg>
}

export function WorkspaceShell({ page, children, profile, titleRef, onProfileChange, onExit }: WorkspaceShellProps) {
  const [expanded, setExpanded] = useState(false)
  const links = [
    { page: 'home', hash: '#inicio', label: 'Início' },
    { page: 'sheets', hash: '#fichas', label: 'Fichas' },
    { page: 'campaigns', hash: '#campanhas', label: 'Campanhas' },
  ] as const

  return <section className={`home-shell${expanded ? ' home-shell-expanded' : ''}`} aria-labelledby="home-title">
    <aside className="home-sidebar" aria-label="Menu lateral">
      <button type="button" className="home-nav-button home-menu-toggle" aria-label={expanded ? 'Recolher menu' : 'Expandir menu'} aria-expanded={expanded} aria-controls="home-navigation" onClick={() => setExpanded(current => !current)} title={expanded ? 'Recolher menu' : 'Expandir menu'}>
        <NavigationIcon kind="menu" /><span className="home-nav-label" aria-hidden="true">Menu</span>
      </button>
      <span className="home-sidebar-rule" aria-hidden="true" />
      <nav id="home-navigation" aria-label="Navegação principal">
        {links.map(link => <a key={link.page} className={`home-nav-button${page === link.page ? ' home-nav-current' : ''}`} href={link.hash} aria-label={link.label} aria-current={page === link.page ? 'page' : undefined} title={link.label} onClick={() => { if (page === link.page) titleRef.current?.focus() }}>
          <NavigationIcon kind={link.page} /><span className="home-nav-label" aria-hidden="true">{link.label}</span>
        </a>)}
      </nav>
      <div className="home-sidebar-profile"><HomeProfile profile={profile} onUpdate={onProfileChange} onExit={onExit} /></div>
    </aside>
    <div className="home-canvas">{children}</div>
  </section>
}

export function HomeScreen({ name, titleRef }: { name: string; titleRef: RefObject<HTMLHeadingElement | null> }) {
  return <>
        <header className="home-heading">
          <p className="home-overline">INÍCIO</p>
          <h1 ref={titleRef} id="home-title" tabIndex={-1}>Olá, <span>{name}.</span></h1>
          <span className="home-heading-rule" aria-hidden="true" />
        </header>
        <div className="home-center">
          <div className="home-brand" role="img" aria-label="Miraculous — símbolo provisório do RPG">
            <div className="home-seal"><span className="home-seal-mark home-seal-mark-top" /><GemIcon /><span className="home-seal-mark home-seal-mark-bottom" /></div>
            <p className="home-wordmark">MIRACULOUS</p>
            <p className="home-brand-caption">PAINEL DE CAMPANHAS</p>
          </div>
          <p className="home-tagline">Um lugar para todas as suas histórias.</p>
        </div>
        <div className="home-bottom"><span className="home-bottom-diamond" aria-hidden="true" /><p>Seu próximo capítulo começa aqui.</p><span className="home-bottom-diamond" aria-hidden="true" /></div>

  </>
}

