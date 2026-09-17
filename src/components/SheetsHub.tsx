import { useRef, useState } from 'react'
import type { FormEvent, RefObject } from 'react'
import { findPlayerCampaign, matchesSearch } from '../hub-data'
import type { Campaign, CharacterSheet } from '../hub-data'
import { HubCard, HubHeader, HubIcon, HubRow } from './HubParts'
import { Modal } from './Modal'

interface SheetsHubProps {
  sheets: CharacterSheet[]
  campaigns: Campaign[]
  onCreate: (name: string, campaignId: string | null) => void
  onLink: (sheetId: string, campaignId: string | null) => void
  titleRef: RefObject<HTMLHeadingElement | null>
}

export function SheetsHub({ sheets, campaigns, onCreate, onLink, titleRef }: SheetsHubProps) {
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCampaignId, setNewCampaignId] = useState('')
  const [nameError, setNameError] = useState('')
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

  function createSheet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = newName.trim()
    if (!name) {
      setNameError('Dê um nome à sua ficha para continuar.')
      nameRef.current?.focus()
      return
    }
    const campaignId = findPlayerCampaign(campaigns, newCampaignId)?.id ?? null
    onCreate(name, campaignId)
    setQuery('')
    setNotice(`“${name}” foi adicionada à prévia. Ela ficará disponível enquanto esta página estiver aberta.`)
    setCreating(false)
  }

  function openSheet(sheet: CharacterSheet) {
    setLinkCampaignId(campaignFor(sheet)?.id ?? '')
    setSelectedId(sheet.id)
  }

  function applyLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedSheet) return
    const campaign = findPlayerCampaign(campaigns, linkCampaignId)
    onLink(selectedSheet.id, campaign?.id ?? null)
    setQuery('')
    setNotice(campaign
      ? `“${selectedSheet.name}” agora está vinculada a “${campaign.name}” nesta prévia.`
      : `“${selectedSheet.name}” agora está sem vínculo com campanhas nesta prévia.`)
    setSelectedId(null)
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
    <p className={notice ? 'hub-status' : 'hub-demo-note'} role="status">{notice || 'Prévia com exemplos · Fichas e vínculos são descartados ao recarregar ou sair.'}</p>

    {creating && <Modal open onClose={() => setCreating(false)} titleId="sheet-create-title" descriptionId="sheet-create-description" className="hub-modal">
      <div className="modal-emblem"><HubIcon kind="sheet" /></div>
      <p className="eyebrow">SEUS PERSONAGENS</p>
      <h2 id="sheet-create-title">Nova ficha</h2>
      <p className="modal-description" id="sheet-create-description">Comece pelo nome. Você pode vincular a ficha a uma campanha agora ou depois.</p>
      <form className="hub-form" onSubmit={createSheet} noValidate autoComplete="off">
        <label htmlFor="sheet-create-name">Nome da ficha</label>
        <input ref={nameRef} id="sheet-create-name" name="sheetName" value={newName} maxLength={80} required autoComplete="off" placeholder="Nome do personagem" aria-invalid={nameError ? true : undefined} aria-describedby={nameError ? 'sheet-create-error' : undefined} onChange={event => { setNewName(event.target.value.slice(0, 80)); setNameError('') }} />
        {nameError && <p id="sheet-create-error" role="alert" className="hub-form-error">{nameError}</p>}
        <label htmlFor="sheet-create-campaign">Campanha <span className="field-optional">(opcional)</span></label>
        <select id="sheet-create-campaign" value={newCampaignId} aria-describedby="sheet-create-campaign-help" onChange={event => setNewCampaignId(event.target.value)}>
          <option value="">Sem vínculo com campanha</option>
          {playerCampaigns.map(campaign => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
        </select>
        <p className="hub-demo-note" id="sheet-create-campaign-help">Só aparecem campanhas em que você é jogador. Fichas de NPCs e vilões serão criadas no hub do mestre.</p>
        <p className="hub-demo-note">Esta ação adiciona uma ficha temporária ao hub. O editor completo de personagem será a próxima etapa.</p>
        <div className="hub-form-actions">
          <button className="hub-button" type="button" onClick={() => setCreating(false)}>Cancelar</button>
          <button className="hub-button hub-button-primary" type="submit">Criar na prévia<HubIcon kind="arrow" /></button>
        </div>
      </form>
    </Modal>}

    {selectedSheet && <Modal open onClose={() => setSelectedId(null)} titleId="sheet-details-title" descriptionId="sheet-details-description" className="hub-modal">
      <div className="modal-emblem"><HubIcon kind="sheet" /></div>
      <p className="eyebrow">{selectedSheet.isExample ? 'FICHA DE EXEMPLO' : 'FICHA DA PRÉVIA'}</p>
      <h2 id="sheet-details-title">{selectedSheet.name}</h2>
      <p className="modal-description" id="sheet-details-description">{campaignFor(selectedSheet) ? `Vinculada a ${campaignFor(selectedSheet)?.name}.` : 'Esta ficha está livre para participar de uma campanha.'}</p>
      <form className="hub-form" onSubmit={applyLink}>
        <label htmlFor="sheet-link-campaign">Vínculo com campanha</label>
        <select id="sheet-link-campaign" value={linkCampaignId} aria-describedby="sheet-link-campaign-help" onChange={event => setLinkCampaignId(event.target.value)}>
          <option value="">Sem vínculo com campanha</option>
          {playerCampaigns.map(campaign => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
        </select>
        <p className="hub-demo-note" id="sheet-link-campaign-help">Só aparecem campanhas em que você é jogador. Fichas de NPCs e vilões serão criadas no hub do mestre.</p>
        <p className="hub-demo-note">Você já pode organizar o vínculo nesta prévia. Atributos, perícias e o restante da ficha serão desenvolvidos depois.</p>
        <div className="hub-form-actions">
          <button className="hub-button" type="button" onClick={() => setSelectedId(null)}>Voltar às fichas</button>
          <button className="hub-button hub-button-primary" type="submit">Aplicar vínculo<HubIcon kind="arrow" /></button>
        </div>
      </form>
    </Modal>}
  </div>
}
