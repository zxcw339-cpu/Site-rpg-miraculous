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
import { CharacterSheetPage } from './components/CharacterSheetPage'
import { CampaignWorkspacePage } from './components/CampaignWorkspacePage'
import { CampaignOpeningState } from './components/CampaignOpeningState'
import { exampleCampaigns, exampleSheets, findPlayerCampaign } from './hub-data'
import { normalizeCampaignWorkspace } from './campaign-model'
import { defaultTheme, getTheme, themeStorageKey } from './themes/themes'
import { PasswordRecovery } from './components/PasswordRecovery'
import { authConfigured, discordEnabled, supabase } from './auth/client'
import { useAccount } from './auth/useAccount'
import { register, requestPasswordReset, saveProfile, setAccountPassword, signIn, signInDiscord, updatePassword } from './auth/service'
import { createCampaign, createCommunityPost, createSheet, deleteCampaign, deleteSheet, editCampaignMessage, editCommunityPost, getInviteCode, joinCampaign, linkSheet, loadCampaignLogs, loadCampaignMessages, loadCampaignWorkspace, loadGameData, loadSheet, recordCampaignRoll, saveCampaignWorkspace, saveMasterSheetData, saveSheet, saveSheetAsMaster, sendCampaignMessage, subscribeCampaign } from './data/game'
import type { CampaignLog } from './data/game'
import type { CampaignRoll } from './campaign-model'

function readPreference() {
  try { return getTheme(localStorage.getItem(themeStorageKey)) }
  catch { return defaultTheme }
}

function currentScreen() {
  if (window.location.hash === '#recuperar-senha') return 'recovery'
  if (window.location.hash === '#nova-senha') return 'password'
  if (window.location.hash === '#fichas') return 'sheets'
  if (window.location.hash.startsWith('#ficha/')) return 'sheet-detail'
  if (window.location.hash === '#campanhas') return 'campaigns'
  if (window.location.hash.startsWith('#campanha/')) return window.location.hash.includes('/npc/') ? 'npc-detail' : window.location.hash.includes('/jogador/') ? 'member-detail' : 'campaign-detail'
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
  const [routeHash, setRouteHash] = useState(window.location.hash)
  const [previewProfile, setPreviewProfile] = useState<PreviewProfile | null>(null)
  const [sheets, setSheets] = useState(exampleSheets)
  const [campaigns, setCampaigns] = useState(exampleCampaigns)
  const [gameLoadedUserId, setGameLoadedUserId] = useState<string | null>(null)
  const [gameError, setGameError] = useState('')
  const [gameRevision, setGameRevision] = useState(0)
  const [sheetLoadedId, setSheetLoadedId] = useState<string | null>(null)
  const [sheetError, setSheetError] = useState('')
  const [sheetRevision, setSheetRevision] = useState(0)
  const [workspaceError, setWorkspaceError] = useState('')
  const [workspaceRevision, setWorkspaceRevision] = useState(0)
  const [campaignLogs, setCampaignLogs] = useState<Record<string, CampaignLog[]>>({})
  const [scale, setScale] = useState(desktopScale)
  const previousScreen = useRef(screen)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const compositionRef = useRef<HTMLDivElement>(null)
  const isRegistration = screen === 'registration'
  const isWelcome = screen === 'welcome'
  const isHome = screen === 'home'
  const isPassword = screen === 'password'
  const isRecovery = screen === 'recovery' || isPassword
  const isWorkspace = isHome || screen === 'sheets' || screen === 'sheet-detail' || screen === 'campaigns' || screen === 'campaign-detail' || screen === 'npc-detail' || screen === 'member-detail'
  const screenTitle = screen === 'sheet-detail' || screen === 'npc-detail' || screen === 'member-detail' ? 'Ficha' : screen === 'sheets' ? 'Fichas' : screen === 'campaigns' || screen === 'campaign-detail' ? 'Campanhas' : isHome ? 'Início' : isWelcome ? 'Boas-vindas' : isRegistration ? 'Cadastro' : isRecovery ? 'Recuperar senha' : 'Login'
  const protectedScreen = isWorkspace || isWelcome
  const authenticated = Boolean(account.session)
  const persisted = authenticated && !demoMode
  const activeProfile = authenticated ? account.profile : previewProfile
  const fallbackName = account.session?.user.user_metadata?.name || account.session?.user.user_metadata?.display_name || 'Visitante'
  const waitingForAccount = account.loading || (protectedScreen && !demoMode && !authenticated)

  useEffect(() => {
    if (account.loading || demoMode) return
    if (!authenticated && protectedScreen) window.location.hash = '#login'
    else if (authenticated && !account.recovery && (screen === 'login' || screen === 'registration')) window.location.hash = '#boas-vindas'
  }, [authenticated, account.loading, account.recovery, protectedScreen, screen, demoMode])

  useEffect(() => {
    let active = true
    const userId = account.session?.user.id
    // Never carry one account's content into another account or the demo.
    setSheets(userId && !demoMode ? [] : exampleSheets)
    setCampaigns(userId && !demoMode ? [] : exampleCampaigns)
    setGameLoadedUserId(null)
    setSheetLoadedId(null)
    setGameError('')
    if (userId && !demoMode) {
      void loadGameData().then(data => {
        if (!active) return
        setSheets(data.sheets)
        setCampaigns(data.campaigns)
        setGameLoadedUserId(userId)
      }).catch((cause: unknown) => {
        if (active) setGameError(cause instanceof Error ? cause.message : 'Não foi possível carregar suas fichas e campanhas.')
      })
    }
    return () => { active = false }
  }, [account.session?.user.id, demoMode, gameRevision])

  useEffect(() => {
    if (!persisted || gameLoadedUserId !== account.session?.user.id || screen !== 'sheet-detail') return
    const sheetId = decodeURIComponent(routeHash.slice('#ficha/'.length))
    if (!sheetId) return
    let active = true
    setSheetError('')
    void loadSheet(sheetId).then(sheet => {
      if (!active) return
      setSheets(current => current.map(item => item.id === sheetId ? sheet : item))
      setSheetLoadedId(sheetId)
    }).catch(cause => { if (active) setSheetError(cause instanceof Error ? cause.message : 'Não foi possível carregar a ficha.') })
    return () => { active = false }
  }, [persisted, gameLoadedUserId, account.session?.user.id, screen, routeHash, sheetRevision])

  useEffect(() => {
    if (!persisted || gameLoadedUserId !== account.session?.user.id || !['campaign-detail', 'npc-detail', 'member-detail'].includes(screen)) return
    const campaignId = decodeURIComponent(routeHash.slice('#campanha/'.length).split('/')[0] ?? '')
    if (!campaignId || !campaigns.some(item => item.id === campaignId)) return
    let active = true
    setWorkspaceError('')
    void loadCampaignWorkspace(campaignId).then(workspace => {
      if (active) setCampaigns(current => current.map(item => item.id === campaignId ? { ...item, workspace } : item))
    }).catch((cause: unknown) => {
      if (active) setWorkspaceError(cause instanceof Error ? cause.message : 'Não foi possível carregar a campanha.')
    })
    if (campaigns.find(item => item.id === campaignId)?.role === 'master') {
      void loadCampaignLogs(campaignId).then(logs => { if (active) setCampaignLogs(current => ({ ...current, [campaignId]: logs })) }).catch(() => { /* A mesa continua disponível mesmo se os registros não carregarem. */ })
    }
    return () => { active = false }
  }, [persisted, gameLoadedUserId, account.session?.user.id, screen, routeHash, workspaceRevision])

  useEffect(() => {
    if (!persisted || gameLoadedUserId !== account.session?.user.id || !['campaign-detail', 'npc-detail', 'member-detail'].includes(screen)) return
    const campaignId = decodeURIComponent(routeHash.slice('#campanha/'.length).split('/')[0] ?? '')
    if (!campaignId) return
    let timer: number | undefined
    const unsubscribe = subscribeCampaign(campaignId, table => {
      if (table === 'rpg_campaign_messages') {
        void loadCampaignMessages(campaignId).then(messages => {
          setCampaigns(current => current.map(item => item.id !== campaignId || !item.workspace ||
            JSON.stringify(item.workspace.messages) === JSON.stringify(messages) ? item :
            { ...item, workspace: { ...item.workspace, messages } }))
        }).catch(() => { /* A atualização periódica ainda pode recuperar o chat. */ })
        return
      }
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setWorkspaceRevision(current => current + 1), 250)
    })
    return () => { window.clearTimeout(timer); unsubscribe() }
  }, [persisted, gameLoadedUserId, account.session?.user.id, screen, routeHash])

  useEffect(() => {
    if (!persisted || screen !== 'campaign-detail' || gameLoadedUserId !== account.session?.user.id) return
    const campaignId = decodeURIComponent(routeHash.slice('#campanha/'.length).split('/')[0] ?? '')
    let active = true
    let busy = false
    const refresh = async () => {
      if (!active || busy || document.visibilityState !== 'visible') return
      busy = true
      try {
        const messages = await loadCampaignMessages(campaignId)
        if (active) setCampaigns(current => current.map(item => {
          if (item.id !== campaignId || !item.workspace) return item
          return JSON.stringify(messages) === JSON.stringify(item.workspace.messages) ? item : { ...item, workspace: { ...item.workspace, messages } }
        }))
      } catch { /* A manual refresh remains available if the network is interrupted. */ }
      finally { busy = false }
    }
    const interval = window.setInterval(() => { void refresh() }, 10_000)
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { active = false; window.clearInterval(interval); document.removeEventListener('visibilitychange', onVisible) }
  }, [persisted, screen, routeHash, gameLoadedUserId, account.session?.user.id])

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
    function syncScreen() { setRouteHash(window.location.hash); setScreen(currentScreen()) }
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
    if (account.session) {
      if (!account.profile) throw new Error('Seu perfil ainda está carregando. Tente novamente em instantes.')
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

  async function updateWorkspace(campaignId: string, before: ReturnType<typeof normalizeCampaignWorkspace>, next: ReturnType<typeof normalizeCampaignWorkspace>) {
    if (persisted) {
      try { await saveCampaignWorkspace(campaignId, before, next) }
      catch (cause) {
        // A workspace edit may touch several rows. Re-read after a partial failure
        // so the next action starts from what the database actually accepted.
        try {
          const refreshed = await loadCampaignWorkspace(campaignId)
          setCampaigns(current => current.map(item => item.id === campaignId ? { ...item, workspace: refreshed } : item))
        } catch { /* Keep the original save error visible to the user. */ }
        throw cause
      }
    }
    setCampaigns(current => current.map(item => item.id === campaignId ? { ...item, workspace: next } : item))
    if (persisted) setWorkspaceRevision(current => current + 1)
  }

  async function recordRoll(campaignId: string, label: string, count: number, sides: number, bonus: number, mode: 'sum' | 'max'): Promise<CampaignRoll> {
    const result = await recordCampaignRoll(campaignId, label, count, sides, bonus, mode)
    setCampaigns(current => current.map(item => item.id !== campaignId || !item.workspace ? item : {
      ...item, workspace: { ...item.workspace, rolls: [result, ...item.workspace.rolls.filter(roll => roll.id !== result.id)] },
    }))
    return result
  }

  const accountGameError = persisted && protectedScreen && gameError

  return <div className="app auth-app" style={{ ...theme.colors, '--auth-scale': scale } as CSSProperties}>
    <Atmosphere variant={theme.atmosphere} />
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
      </section> : accountGameError ? <section className="login-card account-loading" aria-live="polite">
        <h2>Não foi possível abrir seus dados.</h2><p role="alert">{gameError}</p>
        <button className="login-button" onClick={() => setGameRevision(current => current + 1)}>Tentar novamente</button>
        <button className="secondary-button" onClick={exitPreview} disabled={exitPending}>Sair</button>
      </section> : isWorkspace ? <WorkspaceShell authenticated={authenticated} page={screen === 'sheet-detail' ? 'sheets' : screen === 'campaign-detail' || screen === 'npc-detail' || screen === 'member-detail' ? 'campaigns' : screen as 'home' | 'sheets' | 'campaigns'} profile={activeProfile ?? { name: fallbackName, bio: '' }} titleRef={titleRef} onProfileChange={updatePreviewProfile} onPasswordUpdate={authenticated ? setAccountPassword : undefined} onExit={exitPreview}>
        {persisted && gameLoadedUserId !== account.session?.user.id ? (screen === 'campaign-detail' || screen === 'npc-detail' || screen === 'member-detail'
          ? <CampaignOpeningState titleRef={titleRef} onRetry={() => setGameRevision(current => current + 1)} />
          : <div className="hub-page hub-missing" aria-live="polite"><h1 id="home-title" ref={titleRef} tabIndex={-1}>Abrindo seu espaço…</h1><p>Carregando fichas e campanhas.</p></div>) : screen === 'sheet-detail' ? (() => {
          const sheet = sheets.find(item => item.id === decodeURIComponent(routeHash.slice('#ficha/'.length)))
          if (sheet && persisted && sheetError) return <div className="hub-page hub-missing"><h1 id="home-title" ref={titleRef} tabIndex={-1}>Não foi possível abrir a ficha</h1><p role="alert">{sheetError}</p><button className="hub-button" type="button" onClick={() => setSheetRevision(current => current + 1)}>Tentar novamente</button><a className="hub-button" href="#fichas">Voltar às fichas</a></div>
          if (sheet && persisted && sheetLoadedId !== sheet.id) return <div className="hub-page hub-missing" aria-live="polite"><h1 id="home-title" ref={titleRef} tabIndex={-1}>Abrindo ficha…</h1><p>Preparando sua ficha e imagens.</p></div>
          return sheet ? <CharacterSheetPage key={sheet.id} sheet={sheet} persisted={persisted} titleRef={titleRef} onRecordRoll={persisted && sheet.campaignId ? (label, count, sides, bonus, mode) => recordRoll(sheet.campaignId!, label, count, sides, bonus, mode) : undefined} onSave={async (name, details) => {
            const updated = persisted ? await saveSheet(sheet.id, name, details) : { ...sheet, name, details }
            setSheets(current => current.map(item => item.id === sheet.id ? updated : item))
            return updated.details
          }} />
            : <div className="hub-page hub-missing"><h1 id="home-title" ref={titleRef} tabIndex={-1}>Ficha indisponível</h1><p>Não encontramos esta ficha na sua conta.</p><a className="hub-button" href="#fichas">Voltar às fichas</a></div>
        })() : screen === 'campaign-detail' || screen === 'npc-detail' || screen === 'member-detail' ? (() => {
          const [campaignId, type, encodedNpcId] = routeHash.slice('#campanha/'.length).split('/')
          const campaign = campaigns.find(item => item.id === decodeURIComponent(campaignId))
          if (!campaign) return <div className="hub-page hub-missing"><h1 id="home-title" ref={titleRef} tabIndex={-1}>Campanha indisponível</h1><p>Não encontramos esta campanha na sua conta.</p><a className="hub-button" href="#campanhas">Voltar às campanhas</a></div>
          if (persisted && workspaceError) return <CampaignOpeningState key={`${campaign.id}-${workspaceRevision}`} name={campaign.name} isMaster={campaign.role === 'master'} titleRef={titleRef} error={workspaceError} onRetry={() => setWorkspaceRevision(current => current + 1)} />
          if (persisted && !campaign.workspace) return <CampaignOpeningState key={`${campaign.id}-${workspaceRevision}`} name={campaign.name} isMaster={campaign.role === 'master'} titleRef={titleRef} onRetry={() => setWorkspaceRevision(current => current + 1)} />
          if (type === 'npc' && campaign.role === 'master') {
            const npc = campaign.workspace?.npcs.find(item => item.id === decodeURIComponent(encodedNpcId || ''))
            if (npc) return <CharacterSheetPage key={npc.id} sheet={{ id: npc.id, name: npc.name, campaignId: null, isExample: false, details: npc.details }} backHref={`#campanha/${encodeURIComponent(campaign.id)}`} backLabel="Voltar à mesa" headingContext="CAMPANHA / NPCS E INIMIGOS" pageTitle="Ficha da mesa" masterManaged persisted={persisted} titleRef={titleRef} onRecordRoll={persisted ? (label, count, sides, bonus, mode) => recordRoll(campaign.id, label, count, sides, bonus, mode) : undefined} onSave={async (name, details) => {
              const before = normalizeCampaignWorkspace(campaign.workspace)
              const next = structuredClone(before)
              next.npcs = next.npcs.map(entry => entry.id === npc.id ? { ...entry, name, details } : entry)
              await updateWorkspace(campaign.id, before, next)
              return next.npcs.find(entry => entry.id === npc.id)?.details
            }} />
          }
          if (type === 'jogador' && campaign.role === 'master') {
            const member = campaign.workspace?.members.find(item => item.id === decodeURIComponent(encodedNpcId || ''))
            if (member && persisted && !member.sheetId) return <div className="hub-page hub-missing"><h1 id="home-title" ref={titleRef} tabIndex={-1}>Ficha ainda não vinculada</h1><p>Peça ao jogador que vincule uma ficha a esta campanha no hub de fichas.</p><a className="hub-button" href={`#campanha/${encodeURIComponent(campaign.id)}`}>Voltar à mesa</a></div>
            if (member) return <CharacterSheetPage key={member.sheetId ?? member.id} sheet={{ id: member.sheetId ?? member.id, name: member.characterName || `Ficha de ${member.name}`, campaignId: campaign.id, isExample: false, details: member.details }} backHref={`#campanha/${encodeURIComponent(campaign.id)}`} backLabel="Voltar à mesa" headingContext="CAMPANHA / JOGADORES" pageTitle="Ficha do participante" masterManaged civilEditable persisted={persisted} contextNote={persisted ? 'Como mestre, você pode revisar a ficha completa, conceder bônus de formas e editar habilidades.' : 'Prévia: configure a ficha do participante e os bônus.'} titleRef={titleRef} onRecordRoll={persisted ? (label, count, sides, bonus, mode) => recordRoll(campaign.id, label, count, sides, bonus, mode) : undefined} onSave={async (name, details) => {
              let canonical = details
              if (persisted) {
                try {
                  const updated = await saveSheetAsMaster(member.sheetId!, name, details)
                  await saveMasterSheetData(member.sheetId!, details.forms, details.abilities)
                  canonical = { ...updated.details!, forms: details.forms, abilities: details.abilities }
                }
                finally { setWorkspaceRevision(current => current + 1) }
              }
              setCampaigns(current => current.map(item => item.id !== campaign.id ? item : { ...item, workspace: { ...item.workspace!, members: item.workspace!.members.map(entry => entry.id === member.id ? { ...entry, characterName: name, details: canonical } : entry) } }))
              return canonical
            }} />
          }
          return <CampaignWorkspacePage key={campaign.id} campaign={campaign} sheets={sheets} titleRef={titleRef} viewerName={activeProfile?.name || fallbackName} viewerId={account.session?.user.id} logs={campaignLogs[campaign.id] ?? []} persisted={persisted}
            onUpdate={async (workspace, before) => { await updateWorkspace(campaign.id, before, workspace) }}
            onRefresh={async () => {
              const refreshed = await loadCampaignWorkspace(campaign.id)
              setCampaigns(current => current.map(item => item.id === campaign.id ? { ...item, workspace: refreshed } : item))
              if (campaign.role === 'master') {
                const logs = await loadCampaignLogs(campaign.id)
                setCampaignLogs(current => ({ ...current, [campaign.id]: logs }))
              }
            }}
            onRecordRoll={persisted ? (label, count, sides, bonus, mode) => recordRoll(campaign.id, label, count, sides, bonus, mode) : undefined}
            onEditMessage={persisted ? async (id, body) => {
              const edited = await editCampaignMessage(campaign.id, id, body)
              setCampaigns(current => current.map(item => item.id !== campaign.id || !item.workspace ? item : { ...item, workspace: { ...item.workspace, messages: item.workspace.messages.map(message => message.id === id ? { ...edited, avatarUrl: edited.avatarUrl || message.avatarUrl } : message) } }))
            } : undefined}
            onCreatePost={persisted ? async draft => {
              const post = await createCommunityPost(campaign.id, { ...draft, file: draft.file ?? undefined })
              setCampaigns(current => current.map(item => item.id !== campaign.id || !item.workspace ? item : { ...item, workspace: { ...item.workspace, media: draft.kind === 'media' ? [...item.workspace.media, post as typeof item.workspace.media[number]] : item.workspace.media, notes: draft.kind === 'note' ? [...item.workspace.notes, post as typeof item.workspace.notes[number]] : item.workspace.notes } }))
              setWorkspaceRevision(current => current + 1)
            } : undefined}
            onEditPost={persisted ? async (kind, id, draft) => {
              const post = await editCommunityPost(campaign.id, kind, id, { title: draft.title, body: draft.body, categoryId: draft.categoryId, file: draft.file ?? undefined })
              setCampaigns(current => current.map(item => item.id !== campaign.id || !item.workspace ? item : { ...item, workspace: { ...item.workspace, media: kind === 'media' ? item.workspace.media.map(entry => entry.id === id ? post as typeof entry : entry) : item.workspace.media, notes: kind === 'note' ? item.workspace.notes.map(entry => entry.id === id ? post as typeof entry : entry) : item.workspace.notes } }))
              setWorkspaceRevision(current => current + 1)
            } : undefined}
            onSendMessage={async body => {
              const message = await sendCampaignMessage(campaign.id, body)
              setCampaigns(current => current.map(item => item.id === campaign.id ? { ...item, workspace: { ...normalizeCampaignWorkspace(item.workspace), messages: [...normalizeCampaignWorkspace(item.workspace).messages, { ...message, avatarUrl: activeProfile?.photoUrl }] } } : item))
            }} />
        })() : screen === 'sheets' ? <SheetsHub sheets={sheets} campaigns={campaigns} titleRef={titleRef}
          persisted={persisted} onCreate={async (name, campaignId) => {
            if (persisted) {
              const created = await createSheet(name, campaignId)
              setSheets(current => [created, ...current])
              return created.id
            }
            const id = crypto.randomUUID()
            setSheets(current => [...current, { id, name, campaignId: findPlayerCampaign(campaigns, campaignId)?.id ?? null, isExample: false }])
            return id
          }}
          onLink={async (sheetId, campaignId) => {
            if (persisted) {
              const updated = await linkSheet(sheetId, campaignId)
              setSheets(current => current.map(sheet => sheet.id === sheetId ? updated : sheet))
            } else setSheets(current => current.map(sheet => sheet.id === sheetId ? { ...sheet, campaignId: findPlayerCampaign(campaigns, campaignId)?.id ?? null } : sheet))
          }}
          onDelete={persisted ? async sheetId => { await deleteSheet(sheetId); setSheets(current => current.filter(sheet => sheet.id !== sheetId)); setWorkspaceRevision(current => current + 1) } : undefined}
        /> : screen === 'campaigns' ? <CampaignHub campaigns={campaigns} titleRef={titleRef}
          persisted={persisted} onCreate={async name => {
            if (persisted) {
              const created = await createCampaign(name)
              setCampaigns(current => [created, ...current])
              return created.id
            }
            const id = crypto.randomUUID()
            setCampaigns(current => [...current, { id, name, role: 'master', isExample: false }])
            return id
          }}
          onJoin={async code => {
            const joined = await joinCampaign(code)
            setCampaigns(current => current.some(item => item.id === joined.id) ? current : [joined, ...current])
          }}
          onGetInvite={persisted ? getInviteCode : undefined}
          onDelete={persisted ? async campaignId => {
            await deleteCampaign(campaignId)
            setCampaigns(current => current.filter(campaign => campaign.id !== campaignId))
            setSheets(current => current.map(sheet => sheet.campaignId === campaignId ? { ...sheet, campaignId: null } : sheet))
          } : undefined}
          onJoinDemo={() => setCampaigns(current => current.some(campaign => campaign.id === 'example-invited') ? current : [...current, { id: 'example-invited', name: 'Campanha de convite (exemplo)', role: 'player', isExample: true }])}
        /> : <HomeScreen name={activeProfile?.name || 'Visitante'} titleRef={titleRef} />}
      </WorkspaceShell> : <div ref={compositionRef} className={isRegistration ? 'auth-composition auth-composition-registration' : 'auth-composition'}>
        <div className="brand">
          <div className="brand-symbol" aria-hidden="true"><span /><GemIcon /><span /></div>
          <h1>MIRACULOUS</h1>
          <p>PAINEL DE CAMPANHAS</p>
        </div>

        {isWelcome ? <WelcomeScreen authenticated={authenticated} name={activeProfile?.name || fallbackName} photoUrl={activeProfile?.photoUrl} titleRef={titleRef} onEnter={() => { window.location.hash = '#inicio' }} onExit={exitPreview} /> : isRecovery ? <section className="login-card" aria-labelledby="recovery-title">
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
      <p id="prototype-note"><span className="preview-dot" aria-hidden="true" />{authenticated ? 'CONTA CONECTADA' : demoMode ? 'DEMONSTRAÇÃO' : 'MIRACULOUS RPG'}<span className="footer-separator">/</span><span className="prototype-copy">{authenticated ? 'Fichas, campanhas e comunidade salvas na sua conta.' : demoMode ? 'Dados fictícios. Nenhuma conta conectada.' : authConfigured ? 'Seu acesso, suas próximas histórias.' : 'Acesso às contas em configuração.'}</span></p>
      <span className="theme-indicator"><span aria-hidden="true" />Tema {theme.name}</span>
    </footer>
    {account.error && !waitingForAccount && <div className="account-error" role="alert">{account.error}<button onClick={() => account.setError('')} aria-label="Fechar aviso">×</button></div>}

    <ThemePicker open={themePickerOpen} onClose={() => setThemePickerOpen(false)} theme={theme} onSelect={selectTheme} storageUnavailable={storageUnavailable} />
  </div>
}

