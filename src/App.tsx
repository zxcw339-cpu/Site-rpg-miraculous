import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Atmosphere } from './components/Atmosphere'
import { ArrowIcon, BoxIcon, GemIcon, SymbolIcon, UserIcon } from './components/Icons'
import { LoginForm } from './components/LoginForm'
import { RegistrationForm } from './components/RegistrationForm'
import { ThemePicker } from './components/ThemePicker'
import { WelcomeScreen } from './components/WelcomeScreen'
import { HomeScreen, WorkspaceShell } from './components/HomeScreen'
import { SheetsHub } from './components/SheetsHub'
import { CampaignHub } from './components/CampaignHub'
import { exampleCampaigns, exampleSheets, findPlayerCampaign } from './hub-data'
import { defaultTheme, getTheme, themeStorageKey } from './themes/themes'
import { PasswordRecovery } from './components/PasswordRecovery'
import { authConfigured, discordEnabled, supabase } from './auth/client'
import { useAccount } from './auth/useAccount'
import { register, requestPasswordReset, saveProfile, signIn, signInDiscord, updatePassword } from './auth/service'

function readPreference() {
  try { return getTheme(localStorage.getItem(themeStorageKey)) }
  catch { return defaultTheme }
}

function currentScreen() {
  if (window.location.hash === '#recuperar-senha') return 'recovery'
  if (window.location.hash === '#nova-senha') return 'password'
  if (window.location.hash === '#fichas') return 'sheets'
  if (window.location.hash === '#campanhas') return 'campaigns'
  if (window.location.hash === '#inicio') return 'home'
  if (window.location.hash === '#boas-vindas') return 'welcome'
  return window.location.hash === '#cadastro' ? 'registration' : 'login'
}

type PreviewProfile = { name: string; bio: string; photoUrl?: string }

// Scale the central desktop composition from the 1080p reference height.
// The architectural frame and page chrome remain attached to the viewport.
function desktopScale() {
  return Math.max(.5, Math.min(1.15, window.innerHeight / 1080, window.innerWidth / 1280))
}

export default function App() {
  const account = useAccount()
  const [demoMode, setDemoMode] = useState(false)
  const [exitPending, setExitPending] = useState(false)
  const [theme, setTheme] = useState(readPreference)
  const [storageUnavailable, setStorageUnavailable] = useState(false)
  const [themePickerOpen, setThemePickerOpen] = useState(false)
  const [screen, setScreen] = useState(currentScreen)
  const [previewProfile, setPreviewProfile] = useState<PreviewProfile | null>(null)
  const [sheets, setSheets] = useState(exampleSheets)
  const [campaigns, setCampaigns] = useState(exampleCampaigns)
  const [scale, setScale] = useState(desktopScale)
  const previousScreen = useRef(screen)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const compositionRef = useRef<HTMLDivElement>(null)
  const isRegistration = screen === 'registration'
  const isWelcome = screen === 'welcome'
  const isHome = screen === 'home'
  const isPassword = screen === 'password'
  const isRecovery = screen === 'recovery' || isPassword
  const isWorkspace = isHome || screen === 'sheets' || screen === 'campaigns'
  const screenTitle = screen === 'sheets' ? 'Fichas' : screen === 'campaigns' ? 'Campanhas' : isHome ? 'Início' : isWelcome ? 'Boas-vindas' : isRegistration ? 'Cadastro' : isRecovery ? 'Recuperar senha' : 'Login'
  const protectedScreen = isWorkspace || isWelcome
  const authenticated = Boolean(account.session)
  const activeProfile = authenticated ? account.profile : previewProfile
  const waitingForAccount = account.loading || (protectedScreen && !demoMode && (!authenticated || !account.profile))

  useEffect(() => {
    if (account.loading || demoMode) return
    if (!authenticated && protectedScreen) window.location.hash = '#login'
    else if (authenticated && !account.recovery && (screen === 'login' || screen === 'registration')) window.location.hash = '#boas-vindas'
  }, [authenticated, account.loading, account.recovery, protectedScreen, screen, demoMode])

  useEffect(() => {
    // Never carry a previous person's temporary hub content into another account.
    setSheets(exampleSheets)
    setCampaigns(exampleCampaigns)
  }, [account.session?.user.id, demoMode])

  useEffect(() => {
    const photoUrl = previewProfile?.photoUrl
    return () => { if (photoUrl) URL.revokeObjectURL(photoUrl) }
  }, [previewProfile?.photoUrl])

  useEffect(() => {
    document.documentElement.dataset.theme = theme.id
    Object.entries(theme.colors).forEach(([key, value]) => document.documentElement.style.setProperty(key, value))
  }, [theme])

  useEffect(() => {
    function syncTheme(event: StorageEvent) {
      if (event.key === themeStorageKey || event.key === null) setTheme(getTheme(event.newValue))
    }
    function syncScreen() { setScreen(currentScreen()) }
    window.addEventListener('storage', syncTheme)
    window.addEventListener('hashchange', syncScreen)
    return () => {
      window.removeEventListener('storage', syncTheme)
      window.removeEventListener('hashchange', syncScreen)
    }
  }, [])

  useLayoutEffect(() => {
    const composition = compositionRef.current
    if (!composition) return
    const brand = composition.querySelector<HTMLElement>('.brand')
    const tail = composition.querySelector<HTMLElement>('.auth-tail')
    function fitComposition() {
      if (!composition) return
      const base = desktopScale()
      const halfCard = composition.offsetHeight / 2
      const topExtent = halfCard + (brand?.offsetHeight ?? 0) + 32
      const bottomExtent = halfCard + (tail?.offsetHeight ?? 0)
      const chrome = document.querySelector<HTMLElement>('.page-footer')?.offsetHeight ?? 84
      setScale(Math.max(.4, Math.min(base,
        (window.innerHeight / 2 - 56 * base) / topExtent,
        (window.innerHeight / 2 - chrome - 16) / bottomExtent,
      )))
    }
    // Unscaled element sizes keep this observer stable when the transform changes.
    const observer = new ResizeObserver(fitComposition)
    observer.observe(composition)
    if (brand) observer.observe(brand)
    if (tail) observer.observe(tail)
    window.addEventListener('resize', fitComposition)
    fitComposition()
    return () => { observer.disconnect(); window.removeEventListener('resize', fitComposition) }
  }, [screen, waitingForAccount])

  useEffect(() => {
    document.title = screenTitle + ' · Miraculous'
    if (previousScreen.current !== screen && (screen === 'login' || screen === 'registration') && !authenticated) {
      setDemoMode(false)
      setPreviewProfile(null)
      setSheets(exampleSheets)
      setCampaigns(exampleCampaigns)
    }
    if (previousScreen.current !== screen) {
      titleRef.current?.focus({ preventScroll: true })
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
    previousScreen.current = screen
  }, [screen, screenTitle, authenticated])

  function openDemo() {
    setDemoMode(true)
    setPreviewProfile({ name: 'Visitante', bio: '' })
    window.location.hash = '#boas-vindas'
  }

  async function exitPreview() {
    if (exitPending) return
    setExitPending(true)
    if (supabase && authenticated) {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) {
        account.setError('Não foi possível encerrar a sessão. Confira sua conexão e tente sair novamente.')
        setExitPending(false)
        return
      }
    }
    setDemoMode(false)
    setPreviewProfile(null)
    setSheets(exampleSheets)
    setCampaigns(exampleCampaigns)
    window.location.hash = '#login'
    setExitPending(false)
  }

  async function updatePreviewProfile(changes: { name: string; bio: string; photo?: File; removePhoto?: boolean; username?: string }) {
    if (account.session && account.profile) {
      const userId = account.session.user.id
      account.setProfile(userId, await saveProfile(userId, account.profile, changes))
      return
    }
    const replacementUrl = changes.photo ? URL.createObjectURL(changes.photo) : undefined
    setPreviewProfile(current => ({
      name: changes.name.trim(), bio: changes.bio,
      photoUrl: replacementUrl ?? (changes.removePhoto ? undefined : current?.photoUrl),
    }))
  }

  function selectTheme(id: string) {
    const nextTheme = getTheme(id)
    setTheme(nextTheme)
    try {
      localStorage.setItem(themeStorageKey, nextTheme.id)
      setStorageUnavailable(false)
    } catch { setStorageUnavailable(true) }
  }

  return <div className="app auth-app" style={{ ...theme.colors, '--auth-scale': scale } as CSSProperties}>
    <Atmosphere />
    <a className="skip-link" href={isWorkspace ? '#home-title' : isWelcome ? '#boas-vindas' : isRegistration ? '#cadastro' : '#login'} onClick={event => {
      event.preventDefault()
      document.getElementById(isWorkspace ? 'home-title' : isWelcome ? 'welcome-title' : isRegistration ? 'register-name' : isRecovery ? 'recovery-title' : 'login-name')?.focus()
    }}>{isWorkspace ? 'Ir para o conteúdo' : isWelcome ? 'Ir para as boas-vindas' : 'Ir para o formulário'}</a>
    <header className="page-header">
      <a className="project-mark" href={isWorkspace ? '#inicio' : '#login'} aria-label={isWorkspace ? 'Miraculous — início' : 'Miraculous — login'}><GemIcon /><span>PAINEL DE CAMPANHAS</span></a>
      <button className="appearance-trigger" onClick={() => setThemePickerOpen(true)} aria-haspopup="dialog"><BoxIcon /><span>Aparência</span><span className="appearance-dot" aria-hidden="true" /></button>
    </header>

    <main className="auth-main" aria-label={screenTitle}>
      {waitingForAccount ? <section className="login-card account-loading" aria-live="polite">
        <h2>{account.error ? 'Seu perfil está indisponível.' : 'Preparando seu acesso…'}</h2>
        {account.error && <><p role="alert">{account.error}</p><button className="login-button" onClick={account.retry} disabled={account.profileLoading}>Tentar novamente</button><button className="secondary-button" onClick={exitPreview} disabled={exitPending}>Sair</button></>}
      </section> : isWorkspace ? <WorkspaceShell authenticated={authenticated} page={screen as 'home' | 'sheets' | 'campaigns'} profile={activeProfile ?? { name: 'Visitante', bio: '' }} titleRef={titleRef} onProfileChange={updatePreviewProfile} onExit={exitPreview}>
        {screen === 'sheets' ? <SheetsHub sheets={sheets} campaigns={campaigns} titleRef={titleRef}
          onCreate={(name, campaignId) => setSheets(current => [...current, { id: crypto.randomUUID(), name, campaignId: findPlayerCampaign(campaigns, campaignId)?.id ?? null, isExample: false }])}
          onLink={(sheetId, campaignId) => setSheets(current => current.map(sheet => sheet.id === sheetId ? { ...sheet, campaignId: findPlayerCampaign(campaigns, campaignId)?.id ?? null } : sheet))}
        /> : screen === 'campaigns' ? <CampaignHub campaigns={campaigns} titleRef={titleRef}
          onCreate={name => setCampaigns(current => [...current, { id: crypto.randomUUID(), name, role: 'master', isExample: false }])}
          onJoinDemo={() => setCampaigns(current => current.some(campaign => campaign.id === 'example-invited') ? current : [...current, { id: 'example-invited', name: 'Campanha de convite (exemplo)', role: 'player', isExample: true }])}
        /> : <HomeScreen name={activeProfile?.name || 'Visitante'} titleRef={titleRef} />}
      </WorkspaceShell> : <div ref={compositionRef} className={isRegistration ? 'auth-composition auth-composition-registration' : 'auth-composition'}>
        <div className="brand">
          <div className="brand-symbol" aria-hidden="true"><span /><GemIcon /><span /></div>
          <h1>MIRACULOUS</h1>
          <p>PAINEL DE CAMPANHAS</p>
        </div>

        {isWelcome ? <WelcomeScreen authenticated={authenticated} name={activeProfile?.name} photoUrl={activeProfile?.photoUrl} titleRef={titleRef} onEnter={() => { window.location.hash = '#inicio' }} onExit={exitPreview} /> : isRecovery ? <section className="login-card" aria-labelledby="recovery-title">
          <h2 ref={titleRef} id="recovery-title" tabIndex={-1}>{isPassword ? 'Escolha sua nova senha.' : 'Recupere seu acesso.'}</h2>
          {isPassword && !authenticated ? <p className="auth-message">Abra o link recebido por e-mail neste navegador. Se ele expirou, <a href="#recuperar-senha">solicite outro link</a>.</p> : <PasswordRecovery key={screen} mode={isPassword ? 'update' : 'request'} configured={authConfigured} onRequest={requestPasswordReset} onUpdate={async password => { await updatePassword(password); account.setRecovery(false) }} />}
          <p className="registration-return"><a href="#login">Voltar ao login</a></p>
        </section> : isRegistration ? <section className="login-card registration-card" aria-labelledby="registration-title">
          <span className="card-diamond card-diamond-top" aria-hidden="true" />
          <div className="registration-heading">
            <p className="eyebrow">UM NOVO COMEÇO</p>
            <h2 ref={titleRef} id="registration-title" tabIndex={-1}>Crie sua conta.</h2>
            <p className="login-subtitle">O primeiro passo para as suas próximas histórias.</p>
          </div>
          <RegistrationForm configured={authConfigured} discordEnabled={discordEnabled} onRegister={register} onDiscord={signInDiscord} />
          <p className="registration-return">Já tem uma conta? <a href="#login">Entrar <ArrowIcon /></a></p>
        </section> : <section className="login-card" aria-labelledby="login-title">
          <span className="card-diamond card-diamond-top" aria-hidden="true" />
          <div className="account-emblem"><UserIcon /></div>
          <h2 ref={titleRef} id="login-title" tabIndex={-1}>Sua história continua aqui.</h2>
          <p className="login-subtitle">Acesse sua conta e entre no seu universo.</p>
          <LoginForm configured={authConfigured} discordEnabled={discordEnabled} onSignIn={signIn} onDiscord={signInDiscord} />
          {!authConfigured && <button type="button" className="auth-demo-button" onClick={openDemo}>Explorar demonstração sem criar conta</button>}
          <div className="register-divider"><span />Ainda não tem uma conta?<span /></div>
          <a className="register-link" href="#cadastro">Cadastre-se <ArrowIcon /></a>
        </section>}

        <div className="auth-tail">
          <div className="below-card" aria-hidden="true"><span /><SymbolIcon symbol={theme.symbol} /><span /></div>
          <p className="tagline">Um universo de possibilidades. A sua próxima história.</p>
        </div>
      </div>}
    </main>

    <footer className="page-footer">
      <p id="prototype-note"><span className="preview-dot" aria-hidden="true" />{authenticated ? 'CONTA CONECTADA' : demoMode ? 'DEMONSTRAÇÃO' : 'MIRACULOUS RPG'}<span className="footer-separator">/</span><span className="prototype-copy">{authenticated ? 'Perfil salvo. Fichas e campanhas ainda são demonstrações temporárias.' : demoMode ? 'Dados fictícios. Nenhuma conta conectada.' : authConfigured ? 'Seu acesso, suas próximas histórias.' : 'Acesso às contas em configuração.'}</span></p>
      <span className="theme-indicator"><span aria-hidden="true" />Tema {theme.name}</span>
    </footer>
    {account.error && !waitingForAccount && <div className="account-error" role="alert">{account.error}<button onClick={() => account.setError('')} aria-label="Fechar aviso">×</button></div>}

    <ThemePicker open={themePickerOpen} onClose={() => setThemePickerOpen(false)} theme={theme} onSelect={selectTheme} storageUnavailable={storageUnavailable} />
  </div>
}

