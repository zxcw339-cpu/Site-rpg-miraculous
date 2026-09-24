import { useRef, useState } from 'react'
import type { FormEvent, RefObject } from 'react'
import { findPlayerCampaign, matchesSearch } from '../hub-data'
import type { Campaign, CharacterSheet } from '../hub-data'
import { HubCard, HubHeader, HubIcon, HubRow } from './HubParts'
import { Modal } from './Modal'

interface SheetsHubProps {
  sheets: CharacterSheet[]
  campaigns: Campaign[]
  persisted?: boolean
  onCreate: (name: string, campaignId: string | null) => string | Promise<string>
  onLink: (sheetId: string, campaignId: string | null) => void | Promise<void>
  titleRef: RefObject<HTMLHeadingElement | null>
}

export function SheetsHub({ sheets, campaigns, persisted = false, onCreate, onLink, titleRef }: SheetsHubProps) {
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCampaignId, setNewCampaignId] = useState('')
  const [nameError, setNameError] = useState('')
  const [linkError, setLinkError] = useState('')
  const [createPending, setCreatePending] = useState(false)
  const [linkPending, setLinkPending] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [linkCampaignId, setLinkCampaignId] = useState('')
  const [notice, setNotice] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)
  const selectedSheet = sheets.find(sheet => sheet.id === selectedId)
  const playerCampaigns = campaigns.filter(campaign => campaign.role === 'player')
  const campaignFor = (sheet: CharacterSheet) => findPlayerCampaign(campaigns, sheet.campaignId)
  const filteredSheets = sheets.filter(sheet => matchesSearch(`${sheet.name} ${campaignFor(sheet)?.name ?? ''}`, query))
  const unlinkedSheets = filteredSheets.filter(sheet => !campaignFor(sheet))
  const linkedSheets = filteredSheets.filter(sheet => campaignFor(sheet))

  function startCreation() {
    setNewName('')
    setNewCampaignId('')
    setNameError('')
    setCreating(true)
  }

  async function createSheet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (createPending) return
    const name = newName.trim()
    if (!name) {
      setNameError('Dê um nome à sua ficha para continuar.')
      nameRef.current?.focus()
      return
    }
    const campaignId = findPlayerCampaign(campaigns, newCampaignId)?.id ?? null
    setCreatePending(true)
    setNameError('')
    try {
      const id = await onCreate(name, campaignId)
      setQuery('')
      setNotice(persisted ? `“${name}” foi salva na sua conta.` : `“${name}” foi adicionada à prévia. Ela ficará disponível enquanto esta página estiver aberta.`)
      setCreating(false)
      window.location.hash = `#ficha/${encodeURIComponent(id)}`
    } catch (caught) {
      setNameError(caught instanceof Error ? caught.message : 'Não foi possível criar a ficha. Tente novamente.')
    } finally {
      setCreatePending(false)
    }
  }

  function openSheet(sheet: CharacterSheet) {
    setLinkCampaignId(campaignFor(sheet)?.id ?? '')
    setLinkError('')
    setSelectedId(sheet.id)
  }

  async function applyLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedSheet || linkPending) return
    const campaign = findPlayerCampaign(campaigns, linkCampaignId)
    if ((campaign?.id ?? null) === selectedSheet.campaignId) {
      setNotice('O vínculo da ficha já estava assim.')
      setSelectedId(null)
      return
    }
    setLinkPending(true)
    setLinkError('')
    try {
      await onLink(selectedSheet.id, campaign?.id ?? null)
      setQuery('')
      setNotice(campaign
        ? `“${selectedSheet.name}” agora está vinculada a “${campaign.name}”${persisted ? '.' : ' nesta prévia.'}`
        : `“${selectedSheet.name}” agora está sem vínculo com campanhas${persisted ? '.' : ' nesta prévia.'}`)
      setSelectedId(null)
    } catch (caught) {
      setLinkError(caught instanceof Error ? caught.message : 'Não foi possível alterar o vínculo. Tente novamente.')
    } finally {
      setLinkPending(false)
    }
  }

  function renderCards(items: CharacterSheet[]) {
    return items.map(sheet => {
      const campaign = campaignFor(sheet)
      return <HubCard
        key={sheet.id}
        kind="sheet"
        name={sheet.name}
        eyebrow={campaign ? 'VINCULADA' : 'INDEPENDENTE'}
        detail={campaign?.name ?? 'Sem campanha vinculada'}
        isExample={sheet.isExample}
        persisted={persisted}
        onClick={() => openSheet(sheet)}
      />
    })
  }

  const searching = query.trim().length > 0

  return <div className="hub-page">
    <HubHeader
      title="Suas fichas"
      titleRef={titleRef}
      description="Cada personagem tem uma história. Encontre a sua aqui."
      persisted={persisted}
      query={query}
      onQueryChange={setQuery}
      searchLabel="Buscar fichas por nome ou campanha"
    >
      <button className="hub-button hub-button-primary" type="button" onClick={startCreation} aria-haspopup="dialog"><HubIcon kind="plus" />Nova ficha</button>
    </HubHeader>

    <div className="hub-scroll">
      <HubRow title="Não vinculadas" count={unlinkedSheets.length} emptyMessage={searching ? 'Nenhuma ficha independente corresponde à busca.' : 'Suas fichas sem campanha aparecerão aqui.'}>
        {renderCards(unlinkedSheets)}
      </HubRow>
      <HubRow title="Vinculadas a campanhas" count={linkedSheets.length} emptyMessage={searching ? 'Nenhuma ficha vinculada corresponde à busca.' : 'Abra uma ficha para vinculá-la a uma campanha em que você joga.'}>
        {renderCards(linkedSheets)}
      </HubRow>
      <HubRow title="Todas as fichas" count={filteredSheets.length} emptyMessage={searching ? 'Nenhuma ficha encontrada. Tente outro nome ou campanha.' : 'Crie sua primeira ficha para começar.'}>
        {renderCards(filteredSheets)}
      </HubRow>
    </div>
    <p className={notice ? 'hub-status' : 'hub-demo-note'} role="status">{notice || (persisted ? 'Suas fichas e vínculos ficam salvos na sua conta.' : 'Prévia com exemplos · Fichas e vínculos são descartados ao recarregar ou sair.')}</p>

    {creating && <Modal open onClose={() => { if (!createPending) setCreating(false) }} titleId="sheet-create-title" descriptionId="sheet-create-description" className="hub-modal">
      <div className="modal-emblem"><HubIcon kind="sheet" /></div>
      <p className="eyebrow">SEUS PERSONAGENS</p>
      <h2 id="sheet-create-title">Nova ficha</h2>
      <p className="modal-description" id="sheet-create-description">Comece pelo nome. Você pode vincular a ficha a uma campanha agora ou depois.</p>
      <form className="hub-form" onSubmit={createSheet} noValidate autoComplete="off" aria-busy={createPending}>
        <label htmlFor="sheet-create-name">Nome da ficha</label>
        <input ref={nameRef} id="sheet-create-name" name="sheetName" value={newName} maxLength={80} required autoComplete="off" disabled={createPending} placeholder="Nome do personagem" aria-invalid={nameError ? true : undefined} aria-describedby={nameError ? 'sheet-create-error' : undefined} onChange={event => { setNewName(event.target.value.slice(0, 80)); setNameError('') }} />
        {nameError && <p id="sheet-create-error" role="alert" className="hub-form-error">{nameError}</p>}
        <label htmlFor="sheet-create-campaign">Campanha <span className="field-optional">(opcional)</span></label>
        <select id="sheet-create-campaign" value={newCampaignId} disabled={createPending} aria-describedby="sheet-create-campaign-help" onChange={event => setNewCampaignId(event.target.value)}>
          <option value="">Sem vínculo com campanha</option>
          {playerCampaigns.map(campaign => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
        </select>
        <p className="hub-demo-note" id="sheet-create-campaign-help">Só aparecem campanhas em que você é jogador. Fichas de NPCs e vilões serão criadas no hub do mestre.</p>
        <p className="hub-demo-note">{persisted ? 'A ficha será salva na sua conta e abrirá para edição depois de criada.' : 'A ficha abre no editor após ser criada. Nesta prévia, os dados ainda são temporários.'}</p>
        <div className="hub-form-actions">
          <button className="hub-button" type="button" disabled={createPending} onClick={() => setCreating(false)}>Cancelar</button>
          <button className="hub-button hub-button-primary" type="submit" disabled={createPending}>{createPending ? 'Criando…' : persisted ? 'Criar ficha' : 'Criar na prévia'}{!createPending && <HubIcon kind="arrow" />}</button>
        </div>
      </form>
    </Modal>}

    {selectedSheet && <Modal open onClose={() => { if (!linkPending) setSelectedId(null) }} titleId="sheet-details-title" descriptionId="sheet-details-description" className="hub-modal">
      <div className="modal-emblem"><HubIcon kind="sheet" /></div>
      <p className="eyebrow">{selectedSheet.isExample ? 'FICHA DE EXEMPLO' : persisted ? 'SUA FICHA' : 'FICHA DA PRÉVIA'}</p>
      <h2 id="sheet-details-title">{selectedSheet.name}</h2>
      <p className="modal-description" id="sheet-details-description">{campaignFor(selectedSheet) ? `Vinculada a ${campaignFor(selectedSheet)?.name}.` : 'Esta ficha está livre para participar de uma campanha.'}</p>
      <form className="hub-form" onSubmit={applyLink} aria-busy={linkPending}>
        <label htmlFor="sheet-link-campaign">Vínculo com campanha</label>
        <select id="sheet-link-campaign" value={linkCampaignId} disabled={linkPending} aria-describedby={`sheet-link-campaign-help${linkError ? ' sheet-link-error' : ''}`} onChange={event => { setLinkCampaignId(event.target.value); setLinkError('') }}>
          <option value="">Sem vínculo com campanha</option>
          {playerCampaigns.map(campaign => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
        </select>
        <p className="hub-demo-note" id="sheet-link-campaign-help">Só aparecem campanhas em que você é jogador. Fichas de NPCs e vilões serão criadas no hub do mestre.</p>
        {linkError && <p className="hub-form-error" id="sheet-link-error" role="alert">{linkError}</p>}
        <p className="hub-demo-note">Atributos, perícias, status, inventário e habilidades estão disponíveis na página da ficha.</p>
        <div className="hub-form-actions">
          <button className="hub-button" type="button" disabled={linkPending} onClick={() => setSelectedId(null)}>Voltar às fichas</button>
          <button className="hub-button hub-button-primary" type="submit" disabled={linkPending}>{linkPending ? 'Salvando…' : 'Aplicar vínculo'}{!linkPending && <HubIcon kind="arrow" />}</button>
        </div>
      </form>
      <div className="hub-form-actions"><a className="hub-button" aria-disabled={linkPending} onClick={event => { if (linkPending) event.preventDefault() }} href={`#ficha/${encodeURIComponent(selectedSheet.id)}`}>Abrir ficha <HubIcon kind="arrow" /></a></div>
    </Modal>}
  </div>
}
