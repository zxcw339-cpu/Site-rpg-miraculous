import { useId, useRef, useState } from 'react'
import type { FormEvent, RefObject } from 'react'
import type { Campaign } from '../hub-data'
import { matchesSearch } from '../hub-data'
import { HubCard, HubHeader, HubIcon, HubRow } from './HubParts'
import { Modal } from './Modal'
import '../campaign-hub.css'

interface CampaignHubProps {
  campaigns: Campaign[]
  onCreate: (name: string) => string
  onJoinDemo: () => void
  titleRef: RefObject<HTMLHeadingElement | null>
}

export function CampaignHub({ campaigns, onCreate, onJoinDemo, titleRef }: CampaignHubProps) {
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState<'create' | 'invite' | null>(null)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [notice, setNotice] = useState('')
  const id = useId()
  const matching = campaigns.filter(campaign => matchesSearch(campaign.name, query))
  const playing = matching.filter(campaign => campaign.role === 'player')
  const mastering = matching.filter(campaign => campaign.role === 'master')
  const alreadyJoined = campaigns.some(campaign => campaign.id === 'example-invited')
  const searching = Boolean(query.trim())

  function renderCards(items: Campaign[]) {
    return items.map(campaign => <HubCard
      key={campaign.id}
      kind="campaign"
      name={campaign.name}
      eyebrow={campaign.role === 'master' ? 'MESTRANDO' : 'JOGANDO'}
      detail={campaign.role === 'master' ? 'Você é o mestre' : 'Você é jogador'}
      isExample={campaign.isExample}
      onClick={() => setSelectedCampaign(campaign)}
    />)
  }

  return <div className="hub-page">
    <HubHeader
      title="Suas campanhas"
      titleRef={titleRef}
      description="As histórias que você vive e as que você conduz."
      query={query}
      onQueryChange={setQuery}
      searchLabel="Buscar campanhas"
    >
      <button type="button" className="hub-button" onClick={() => setDialog('invite')}><HubIcon kind="key" />Entrar por convite</button>
      <button type="button" className="hub-button hub-button-primary" onClick={() => setDialog('create')}><HubIcon kind="plus" />Criar campanha</button>
    </HubHeader>

    <div className="hub-scroll">
      <HubRow title="Jogando" count={playing.length} emptyMessage={searching ? 'Nenhuma campanha encontrada nesta categoria.' : 'As campanhas em que você joga aparecerão aqui. Entre por convite para experimentar.'}>{renderCards(playing)}</HubRow>
      <HubRow title="Mestrando" count={mastering.length} emptyMessage={searching ? 'Nenhuma campanha encontrada nesta categoria.' : 'Seu espaço como mestre. Crie uma campanha para começar a organizar suas histórias.'}>{renderCards(mastering)}</HubRow>
      <HubRow title="Todas as campanhas" count={matching.length} emptyMessage={searching ? 'Nenhuma campanha encontrada. Tente outro nome.' : 'Você ainda não tem campanhas nesta prévia.'}>{renderCards(matching)}</HubRow>
    </div>
    <p className={notice ? 'hub-status' : 'hub-demo-note'} role="status">{notice || 'Prévia demonstrativa · As alterações duram apenas nesta visita.'}</p>

    {dialog === 'create' && <CreateCampaignDialog onClose={() => setDialog(null)} onCreate={name => {
      const campaignId = onCreate(name)
      setQuery('')
      setDialog(null)
      window.location.hash = `#campanha/${encodeURIComponent(campaignId)}`
    }} />}
    {dialog === 'invite' && <CampaignInviteDialog alreadyJoined={alreadyJoined} onClose={() => setDialog(null)} onJoin={() => {
      onJoinDemo()
      setQuery('')
      setNotice('Campanha de convite (exemplo) adicionada a Jogando. Nenhum convite real foi utilizado.')
      setDialog(null)
    }} />}

    <Modal open={selectedCampaign !== null} onClose={() => setSelectedCampaign(null)} titleId={`${id}-campaign-title`} descriptionId={`${id}-campaign-note`} className="hub-modal">
      <div className="modal-emblem"><HubIcon kind="campaign" /></div>
      <p className="eyebrow">VISÃO GERAL</p>
      <h2 id={`${id}-campaign-title`}>{selectedCampaign?.name}</h2>
      <dl className="campaign-overview">
        <div><dt>Seu papel</dt><dd>{selectedCampaign?.role === 'master' ? 'Mestre' : 'Jogador'}</dd></div>
        <div><dt>Disponibilidade</dt><dd>{selectedCampaign?.isExample ? 'Campanha de exemplo' : 'Somente nesta prévia'}</dd></div>
      </dl>
      <p className="modal-description" id={`${id}-campaign-note`}>Abra a mesa para explorar {selectedCampaign?.role === 'master' ? 'o painel do mestre e suas áreas de configuração' : 'sua ficha vinculada e as mídias compartilhadas'}.</p>
      <div className="hub-form-actions">
        <button type="button" className="hub-button" onClick={() => setSelectedCampaign(null)}>Voltar ao hub</button>
        <a className="hub-button hub-button-primary" href={`#campanha/${encodeURIComponent(selectedCampaign?.id ?? '')}`}>Abrir mesa<HubIcon kind="arrow" /></a>
      </div>
    </Modal>
  </div>
}

function CreateCampaignDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => void }) {
  const id = useId()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Dê um nome para sua campanha.')
      nameRef.current?.focus()
      return
    }
    onCreate(trimmedName)
  }

  return <Modal open onClose={onClose} titleId={`${id}-title`} descriptionId={`${id}-description`} className="hub-modal">
    <div className="modal-emblem"><HubIcon kind="campaign" /></div>
    <p className="eyebrow">UMA NOVA HISTÓRIA</p>
    <h2 id={`${id}-title`}>Criar campanha</h2>
    <p className="modal-description" id={`${id}-description`}>Escolha um nome. Você aparecerá como mestre desta campanha na prévia.</p>
    <form className="hub-form" noValidate autoComplete="off" onSubmit={submit}>
      <div className="field-group">
        <label htmlFor={`${id}-name`}>Nome da campanha</label>
        <input ref={nameRef} id={`${id}-name`} type="text" value={name} required maxLength={80} placeholder="Como se chama sua história?" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={event => {
          setName(event.target.value.slice(0, 80))
          setError('')
        }} />
        {error && <p className="field-error" id={`${id}-error`} role="alert">{error}</p>}
      </div>
      <p className="hub-demo-note">A campanha será adicionada somente a esta prévia e desaparecerá ao recarregar ou sair.</p>
      <div className="hub-form-actions">
        <button type="button" className="hub-button" onClick={onClose}>Cancelar</button>
        <button type="submit" className="hub-button hub-button-primary">Criar na prévia<HubIcon kind="plus" /></button>
      </div>
    </form>
  </Modal>
}

function CampaignInviteDialog({ alreadyJoined, onClose, onJoin }: { alreadyJoined: boolean; onClose: () => void; onJoin: () => void }) {
  const id = useId()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const codeRef = useRef<HTMLInputElement>(null)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (alreadyJoined) return
    if (code.length !== 6) {
      setError('Digite os 6 dígitos do código de demonstração.')
      codeRef.current?.focus()
      return
    }
    if (code !== '123456') {
      setError('Esta prévia não valida convites reais. Experimente o código de demonstração 123456.')
      codeRef.current?.focus()
      return
    }
    onJoin()
  }

  return <Modal open onClose={onClose} titleId={`${id}-title`} descriptionId={`${id}-description`} className="hub-modal">
    <div className="modal-emblem"><HubIcon kind="key" /></div>
    <p className="eyebrow">UM LUGAR À MESA</p>
    <h2 id={`${id}-title`}>Entrar por convite</h2>
    <p className="modal-description" id={`${id}-description`}>Os convites terão 6 dígitos. Nesta etapa, experimente o fluxo com uma campanha de exemplo.</p>
    {alreadyJoined ? <>
      <p className="campaign-invite-example" role="status">A campanha de convite já está em <strong>Jogando</strong> nesta prévia.</p>
      <div className="hub-form-actions"><button type="button" className="hub-button hub-button-primary" onClick={onClose}>Voltar às campanhas</button></div>
    </> : <form className="hub-form" noValidate autoComplete="off" onSubmit={submit}>
      <p className="campaign-invite-example" id={`${id}-example`}><span>Código de demonstração</span><strong>123456</strong></p>
      <div className="field-group">
        <label htmlFor={`${id}-code`}>Código do convite</label>
        <input ref={codeRef} id={`${id}-code`} className="campaign-invite-input" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} placeholder="000000" aria-invalid={Boolean(error)} aria-describedby={`${id}-example${error ? ` ${id}-error` : ''}`} onChange={event => {
          setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
          setError('')
        }} />
        {error && <p className="field-error" id={`${id}-error`} role="alert">{error}</p>}
      </div>
      <p className="hub-demo-note">Nenhum convite real será validado. A campanha de exemplo ficará disponível somente nesta visita.</p>
      <div className="hub-form-actions">
        <button type="button" className="hub-button" onClick={onClose}>Cancelar</button>
        <button type="submit" className="hub-button hub-button-primary">Experimentar convite<HubIcon kind="arrow" /></button>
      </div>
    </form>}
  </Modal>
}
