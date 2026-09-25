import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, RefObject } from 'react'
import type { Campaign } from '../hub-data'
import { matchesSearch } from '../hub-data'
import { HubCard, HubHeader, HubIcon, HubRow } from './HubParts'
import { Modal } from './Modal'
import '../campaign-hub.css'

interface CampaignHubProps {
  campaigns: Campaign[]
  persisted?: boolean
  onCreate: (name: string) => string | Promise<string>
  onJoin?: (code: string) => void | Promise<void>
  onJoinDemo?: () => void
  onGetInvite?: (campaignId: string) => Promise<string>
  onDelete?: (campaignId: string) => Promise<void>
  titleRef: RefObject<HTMLHeadingElement | null>
}

export function CampaignHub({ campaigns, persisted = false, onCreate, onJoin, onJoinDemo, onGetInvite, onDelete, titleRef }: CampaignHubProps) {
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState<'create' | 'invite' | null>(null)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [notice, setNotice] = useState('')
  const [copyStatus, setCopyStatus] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [invitePending, setInvitePending] = useState(false)
  const [deletePending, setDeletePending] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const id = useId()
  const matching = campaigns.filter(campaign => matchesSearch(campaign.name, query))
  const playing = matching.filter(campaign => campaign.role === 'player')
  const mastering = matching.filter(campaign => campaign.role === 'master')
  const alreadyJoined = campaigns.some(campaign => campaign.id === 'example-invited')
  const searching = Boolean(query.trim())

  useEffect(() => {
    if (!persisted || !selectedCampaign || selectedCampaign.role !== 'master' || !onGetInvite) return
    let active = true
    setInvitePending(true)
    setCopyStatus('')
    void onGetInvite(selectedCampaign.id).then(code => { if (active) setInviteCode(code) }).catch(cause => {
      if (active) setCopyStatus(cause instanceof Error ? cause.message : 'Não foi possível carregar o código desta mesa.')
    }).finally(() => { if (active) setInvitePending(false) })
    return () => { active = false }
  }, [persisted, selectedCampaign?.id, selectedCampaign?.role, onGetInvite])

  function renderCards(items: Campaign[]) {
    return items.map(campaign => <HubCard
      key={campaign.id}
      kind="campaign"
      name={campaign.name}
      eyebrow={campaign.role === 'master' ? 'MESTRANDO' : 'JOGANDO'}
      detail={campaign.role === 'master' ? 'Você é o mestre' : 'Você é jogador'}
      isExample={campaign.isExample}
      persisted={persisted}
      onClick={() => { setSelectedCampaign(campaign); setCopyStatus(''); setInviteCode(''); setConfirmDelete(false) }}
    />)
  }

  return <div className="hub-page">
    <HubHeader
      title="Suas campanhas"
      titleRef={titleRef}
      description="As histórias que você vive e as que você conduz."
      persisted={persisted}
      query={query}
      onQueryChange={setQuery}
      searchLabel="Buscar campanhas"
    >
      <button type="button" className="hub-button" onClick={() => setDialog('invite')}><HubIcon kind="key" />Entrar por convite</button>
      <button type="button" className="hub-button hub-button-primary" onClick={() => setDialog('create')}><HubIcon kind="plus" />Criar campanha</button>
    </HubHeader>

    <div className="hub-scroll">
      <HubRow title="Jogando" count={playing.length} emptyMessage={searching ? 'Nenhuma campanha encontrada nesta categoria.' : persisted ? 'As campanhas em que você joga aparecerão aqui. Entre com o código enviado pelo mestre.' : 'As campanhas em que você joga aparecerão aqui. Entre por convite para experimentar.'}>{renderCards(playing)}</HubRow>
      <HubRow title="Mestrando" count={mastering.length} emptyMessage={searching ? 'Nenhuma campanha encontrada nesta categoria.' : 'Seu espaço como mestre. Crie uma campanha para começar a organizar suas histórias.'}>{renderCards(mastering)}</HubRow>
      <HubRow title="Todas as campanhas" count={matching.length} emptyMessage={searching ? 'Nenhuma campanha encontrada. Tente outro nome.' : persisted ? 'Você ainda não participa de nenhuma campanha.' : 'Você ainda não tem campanhas nesta prévia.'}>{renderCards(matching)}</HubRow>
    </div>
    <p className={notice ? 'hub-status' : 'hub-demo-note'} role="status">{notice || (persisted ? 'Suas campanhas e convites ficam salvos na sua conta.' : 'Prévia demonstrativa · As alterações duram apenas nesta visita.')}</p>

    {dialog === 'create' && <CreateCampaignDialog persisted={persisted} onClose={() => setDialog(null)} onCreate={async name => {
      const campaignId = await onCreate(name)
      setQuery('')
      setDialog(null)
      window.location.hash = `#campanha/${encodeURIComponent(campaignId)}`
    }} />}
    {dialog === 'invite' && <CampaignInviteDialog persisted={persisted} alreadyJoined={alreadyJoined} onClose={() => setDialog(null)} onJoin={async code => {
      if (persisted) {
        if (!onJoin) throw new Error('A entrada por convite está indisponível. Tente novamente mais tarde.')
        await onJoin(code)
      } else onJoinDemo?.()
      setQuery('')
      setNotice(persisted ? 'Você entrou na campanha. Ela aparece em Jogando.' : 'Campanha de convite (exemplo) adicionada a Jogando. Nenhum convite real foi utilizado.')
      setDialog(null)
    }} />}

    <Modal open={selectedCampaign !== null} onClose={() => { if (!invitePending) setSelectedCampaign(null) }} titleId={`${id}-campaign-title`} descriptionId={`${id}-campaign-note`} className="hub-modal">
      <div className="modal-emblem"><HubIcon kind="campaign" /></div>
      <p className="eyebrow">VISÃO GERAL</p>
      <h2 id={`${id}-campaign-title`}>{selectedCampaign?.name}</h2>
      <dl className="campaign-overview">
        <div><dt>Seu papel</dt><dd>{selectedCampaign?.role === 'master' ? 'Mestre' : 'Jogador'}</dd></div>
        <div><dt>Disponibilidade</dt><dd>{selectedCampaign?.isExample ? 'Campanha de exemplo' : persisted ? 'Salva na sua conta' : 'Somente nesta prévia'}</dd></div>
      </dl>
      {persisted && selectedCampaign?.role === 'master' && !selectedCampaign.isExample && <div className="campaign-invite-share">
        <p className="eyebrow">CONVIDE JOGADORES</p>
        <p className="modal-description">Esta mesa tem um código único e permanente. Copie e envie aos seus jogadores.</p>
        {inviteCode ? <div className="campaign-invite-copy-row"><code>{inviteCode}</code><button type="button" className="hub-button" disabled={invitePending} onClick={async () => {
          try {
            await navigator.clipboard.writeText(inviteCode)
            setCopyStatus('Código copiado.')
          } catch {
            setCopyStatus('Não foi possível copiar. Selecione o código acima para copiá-lo.')
          }
        }}>Copiar código</button></div> : <p className="hub-demo-note">{invitePending ? 'Carregando código da mesa…' : 'O código não pôde ser carregado.'}</p>}
        <div className="campaign-invite-actions">
          {!inviteCode && <button type="button" className="hub-button" disabled={invitePending || !onGetInvite} onClick={async () => {
            if (!onGetInvite || !selectedCampaign) return
            setInvitePending(true)
            setCopyStatus('')
            try {
              const nextCode = await onGetInvite(selectedCampaign.id)
              if (!nextCode) throw new Error('O código não foi recebido. Tente novamente.')
              setInviteCode(nextCode)
              setCopyStatus('Código disponível. Copie e envie ao jogador.')
            } catch (caught) {
              setCopyStatus(caught instanceof Error ? caught.message : 'Não foi possível carregar o código. Tente novamente.')
            } finally {
              setInvitePending(false)
            }
          }}>{invitePending ? 'Aguarde…' : 'Carregar código'}</button>}
        </div>
        {copyStatus && <p className="campaign-copy-status" role="status">{copyStatus}</p>}
      </div>}
      <p className="modal-description" id={`${id}-campaign-note`}>Abra a mesa para explorar {selectedCampaign?.role === 'master' ? 'o painel do mestre e suas áreas de configuração' : 'sua ficha vinculada e as mídias compartilhadas'}.</p>
      <div className="hub-form-actions">
        <button type="button" className="hub-button" disabled={invitePending} onClick={() => setSelectedCampaign(null)}>Voltar ao hub</button>
        <a className="hub-button hub-button-primary" href={`#campanha/${encodeURIComponent(selectedCampaign?.id ?? '')}`}>Abrir mesa<HubIcon kind="arrow" /></a>
      </div>
      {selectedCampaign?.role === 'master' && !selectedCampaign.isExample && onDelete && <div className="campaign-delete-actions">{confirmDelete ? <><p>Excluir “{selectedCampaign.name}” permanentemente, incluindo conteúdo, chat e convites?</p><button type="button" className="hub-button" disabled={deletePending} onClick={() => setConfirmDelete(false)}>Cancelar</button><button type="button" className="hub-button hub-button-danger" disabled={deletePending} onClick={async () => {
        setDeletePending(true)
        setCopyStatus('')
        try { await onDelete(selectedCampaign.id); setSelectedCampaign(null); setNotice('Campanha excluída permanentemente.') }
        catch (cause) { setCopyStatus(cause instanceof Error ? cause.message : 'Não foi possível excluir a campanha.') }
        finally { setDeletePending(false); setConfirmDelete(false) }
      }}>{deletePending ? 'Excluindo…' : 'Excluir campanha'}</button></> : <button type="button" onClick={() => setConfirmDelete(true)}>Excluir campanha…</button>}</div>}
    </Modal>
  </div>
}

function CreateCampaignDialog({ persisted, onClose, onCreate }: { persisted: boolean; onClose: () => void; onCreate: (name: string) => Promise<void> }) {
  const id = useId()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Dê um nome para sua campanha.')
      nameRef.current?.focus()
      return
    }
    setPending(true)
    setError('')
    try {
      await onCreate(trimmedName)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível criar a campanha. Tente novamente.')
    } finally {
      setPending(false)
    }
  }

  return <Modal open onClose={() => { if (!pending) onClose() }} titleId={`${id}-title`} descriptionId={`${id}-description`} className="hub-modal">
    <div className="modal-emblem"><HubIcon kind="campaign" /></div>
    <p className="eyebrow">UMA NOVA HISTÓRIA</p>
    <h2 id={`${id}-title`}>Criar campanha</h2>
    <p className="modal-description" id={`${id}-description`}>Escolha um nome. Você aparecerá como mestre desta campanha{persisted ? '.' : ' na prévia.'}</p>
    <form className="hub-form" noValidate autoComplete="off" onSubmit={submit} aria-busy={pending}>
      <div className="field-group">
        <label htmlFor={`${id}-name`}>Nome da campanha</label>
        <input ref={nameRef} id={`${id}-name`} type="text" value={name} required maxLength={80} disabled={pending} placeholder="Como se chama sua história?" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={event => {
          setName(event.target.value.slice(0, 80))
          setError('')
        }} />
        {error && <p className="field-error" id={`${id}-error`} role="alert">{error}</p>}
      </div>
      <p className="hub-demo-note">{persisted ? 'A campanha será salva na sua conta. Depois de criá-la, você poderá copiar o código de convite no resumo da campanha.' : 'A campanha será adicionada somente a esta prévia e desaparecerá ao recarregar ou sair.'}</p>
      <div className="hub-form-actions">
        <button type="button" className="hub-button" disabled={pending} onClick={onClose}>Cancelar</button>
        <button type="submit" className="hub-button hub-button-primary" disabled={pending}>{pending ? 'Criando…' : persisted ? 'Criar campanha' : 'Criar na prévia'}{!pending && <HubIcon kind="plus" />}</button>
      </div>
    </form>
  </Modal>
}

function CampaignInviteDialog({ persisted, alreadyJoined, onClose, onJoin }: { persisted: boolean; alreadyJoined: boolean; onClose: () => void; onJoin: (code: string) => Promise<void> }) {
  const id = useId()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const codeRef = useRef<HTMLInputElement>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || (!persisted && alreadyJoined)) return
    const enteredCode = code.trim()
    if (!enteredCode || (!persisted && enteredCode.length !== 6)) {
      setError(persisted ? 'Digite o código enviado pelo mestre.' : 'Digite os 6 dígitos do código de demonstração.')
      codeRef.current?.focus()
      return
    }
    if (!persisted && enteredCode !== '123456') {
      setError('Esta prévia não valida convites reais. Experimente o código de demonstração 123456.')
      codeRef.current?.focus()
      return
    }
    setPending(true)
    setError('')
    try {
      await onJoin(enteredCode)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível entrar na campanha. Confira o código e tente novamente.')
    } finally {
      setPending(false)
    }
  }

  return <Modal open onClose={() => { if (!pending) onClose() }} titleId={`${id}-title`} descriptionId={`${id}-description`} className="hub-modal">
    <div className="modal-emblem"><HubIcon kind="key" /></div>
    <p className="eyebrow">UM LUGAR À MESA</p>
    <h2 id={`${id}-title`}>Entrar por convite</h2>
    <p className="modal-description" id={`${id}-description`}>{persisted ? 'Peça o código de convite ao mestre da campanha e digite-o abaixo.' : 'Os convites terão 6 dígitos. Nesta etapa, experimente o fluxo com uma campanha de exemplo.'}</p>
    {!persisted && alreadyJoined ? <>
      <p className="campaign-invite-example" role="status">A campanha de convite já está em <strong>Jogando</strong> nesta prévia.</p>
      <div className="hub-form-actions"><button type="button" className="hub-button hub-button-primary" onClick={onClose}>Voltar às campanhas</button></div>
    </> : <form className="hub-form" noValidate autoComplete="off" onSubmit={submit} aria-busy={pending}>
      {!persisted && <p className="campaign-invite-example" id={`${id}-example`}><span>Código de demonstração</span><strong>123456</strong></p>}
      <div className="field-group">
        <label htmlFor={`${id}-code`}>Código do convite</label>
        <input ref={codeRef} id={`${id}-code`} className={persisted ? 'campaign-invite-input campaign-invite-input-real' : 'campaign-invite-input'} type="text" inputMode={persisted ? 'text' : 'numeric'} pattern={persisted ? undefined : '[0-9]{6}'} maxLength={persisted ? 128 : 6} disabled={pending} required value={code} placeholder={persisted ? 'Código enviado pelo mestre' : '000000'} aria-invalid={Boolean(error)} aria-describedby={!persisted ? `${id}-example${error ? ` ${id}-error` : ''}` : error ? `${id}-error` : undefined} onChange={event => {
          setCode(persisted ? event.target.value.slice(0, 128) : event.target.value.replace(/\D/g, '').slice(0, 6))
          setError('')
        }} />
        {error && <p className="field-error" id={`${id}-error`} role="alert">{error}</p>}
      </div>
      <p className="hub-demo-note">{persisted ? 'Ao entrar, a campanha aparecerá em Jogando na sua conta.' : 'Nenhum convite real será validado. A campanha de exemplo ficará disponível somente nesta visita.'}</p>
      <div className="hub-form-actions">
        <button type="button" className="hub-button" disabled={pending} onClick={onClose}>Cancelar</button>
        <button type="submit" className="hub-button hub-button-primary" disabled={pending}>{pending ? 'Entrando…' : persisted ? 'Entrar na campanha' : 'Experimentar convite'}{!pending && <HubIcon kind="arrow" />}</button>
      </div>
    </form>}
  </Modal>
}
