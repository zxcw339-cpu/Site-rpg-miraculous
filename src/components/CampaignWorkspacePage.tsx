import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, RefObject } from 'react'
import type { Campaign, CharacterSheet } from '../hub-data'
import { communityContent, normalizeCampaignWorkspace, type CampaignWorkspace } from '../campaign-model'
import { emptySheetDetails } from '../sheet-model'
import { CampaignCommunity } from './CampaignCommunity'
import '../campaign-page.css'

type Area = 'overview' | 'community' | 'members' | 'npcs' | 'media' | 'items' | 'notes' | 'rolls'
const masterAreas: { id: Area; title: string; hint: string; symbol: string }[] = [
  { id: 'community', title: 'Comunidade', hint: 'Imagens, anotações e chat', symbol: '◌' },
  { id: 'members', title: 'Jogadores', hint: 'Participantes e presença', symbol: '♧' },
  { id: 'npcs', title: 'NPCs e inimigos', hint: 'Personagens da mesa', symbol: '◇' },
  { id: 'media', title: 'Mídias', hint: 'Imagens e arquivos visuais', symbol: '▧' },
  { id: 'items', title: 'Itens', hint: 'Equipamentos e achados', symbol: '✦' },
  { id: 'notes', title: 'Notas', hint: 'Anotações do mestre', symbol: '≡' },
  { id: 'rolls', title: 'Dados', hint: 'Rolagens da prévia', symbol: '⬡' },
]

interface Props {
  campaign: Campaign
  sheets: CharacterSheet[]
  titleRef: RefObject<HTMLHeadingElement | null>
  viewerName: string
  onUpdate: (workspace: CampaignWorkspace, before: CampaignWorkspace) => void | Promise<void>
  onSendMessage?: (body: string) => Promise<void>
  onRefresh?: () => Promise<void>
  persisted?: boolean
}

export function CampaignWorkspacePage({ campaign, sheets, titleRef, viewerName, onUpdate, onSendMessage, onRefresh, persisted = false }: Props) {
  const [area, setArea] = useState<Area>('overview')
  const scrollRef = useRef<HTMLDivElement>(null)
  const [notice, setNotice] = useState('')
  const [noticeError, setNoticeError] = useState(false)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const [refreshing, setRefreshing] = useState(false)
  const [memberName, setMemberName] = useState('')
  const [npcName, setNpcName] = useState('')
  const [itemName, setItemName] = useState('')
  const [itemNotes, setItemNotes] = useState('')
  const [noteTitle, setNoteTitle] = useState('')
  const [noteBody, setNoteBody] = useState('')
  const [noteShared, setNoteShared] = useState(false)
  const [mediaTitle, setMediaTitle] = useState('')
  const [mediaSubtitle, setMediaSubtitle] = useState('')
  const [mediaDescription, setMediaDescription] = useState('')
  const [mediaImage, setMediaImage] = useState<string | undefined>()
  const [mediaShared, setMediaShared] = useState(false)
  const [diceCount, setDiceCount] = useState(1)
  const [diceSides, setDiceSides] = useState(20)
  const [diceBonus, setDiceBonus] = useState(0)
  const data = normalizeCampaignWorkspace(campaign.workspace)
  const community = communityContent(data)
  const isMaster = campaign.role === 'master'
  const ownSheets = sheets.filter(sheet => sheet.campaignId === campaign.id && !isMaster)

  async function update(change: (next: CampaignWorkspace) => void, message: string): Promise<boolean> {
    if (savingRef.current) return false
    savingRef.current = true
    setSaving(true)
    setNoticeError(false)
    setNotice(persisted ? 'Salvando alteração…' : '')
    const next = structuredClone(data)
    try {
      change(next)
      await onUpdate(next, data)
      setNotice(message)
      return true
    } catch (cause) {
      setNoticeError(true)
      setNotice(cause instanceof Error ? cause.message : 'Não foi possível salvar a alteração. Tente novamente.')
      return false
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }
  function submit(event: FormEvent<HTMLFormElement>, action: () => void | Promise<void>) { event.preventDefault(); void action() }
  function openArea(next: Area) { setArea(next); setNotice(''); setNoticeError(false); scrollRef.current?.scrollTo({ top: 0 }) }
  async function readMediaFile(event: ChangeEvent<HTMLInputElement>) {
    if (persisted) return
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5_000_000) {
      setNotice('Use uma imagem PNG, JPG ou WebP com até 5 MB.'); event.target.value = ''; return
    }
    const reader = new FileReader()
    reader.onload = () => setMediaImage(typeof reader.result === 'string' ? reader.result : undefined)
    reader.onerror = () => setNotice('Não foi possível abrir essa imagem.')
    reader.readAsDataURL(file)
  }
  async function addMember() {
    if (!memberName.trim()) return
    const saved = await update(next => next.members.push({ id: crypto.randomUUID(), name: memberName.trim(), status: 'Ativo', details: emptySheetDetails() }), 'Participante adicionado à prévia.')
    if (saved) setMemberName('')
  }
  async function addNpc() {
    if (!npcName.trim()) return
    const saved = await update(next => next.npcs.push({ id: crypto.randomUUID(), name: npcName.trim(), notes: '' }), persisted ? 'NPC salvo nesta mesa.' : 'NPC criado nesta prévia.')
    if (saved) setNpcName('')
  }
  async function addItem() {
    if (!itemName.trim()) return
    const saved = await update(next => next.items.push({ id: crypto.randomUUID(), name: itemName.trim(), notes: itemNotes.trim() }), persisted ? 'Item salvo nesta mesa.' : 'Item adicionado à prévia.')
    if (saved) { setItemName(''); setItemNotes('') }
  }
  async function addNote() {
    if (!noteTitle.trim()) return
    const saved = await update(next => next.notes.push({ id: crypto.randomUUID(), title: noteTitle.trim(), body: noteBody.trim(), shared: noteShared }), persisted ? 'Nota salva nesta mesa.' : 'Nota adicionada à prévia.')
    if (saved) { setNoteTitle(''); setNoteBody(''); setNoteShared(false) }
  }
  async function addMedia() {
    if (!mediaTitle.trim()) return
    const saved = await update(next => next.media.push({ id: crypto.randomUUID(), title: mediaTitle.trim(), subtitle: mediaSubtitle.trim(), description: mediaDescription.trim(), imageDataUrl: persisted ? undefined : mediaImage, shared: mediaShared }), persisted ? 'Cartão de mídia salvo nesta mesa.' : 'Mídia adicionada nesta prévia.')
    if (saved) { setMediaTitle(''); setMediaSubtitle(''); setMediaDescription(''); setMediaImage(undefined); setMediaShared(false) }
  }
  async function sendMessage(body: string) {
    if (persisted) {
      if (!onSendMessage) throw new Error('O chat desta mesa ainda não está disponível.')
      await onSendMessage(body)
      return
    }
    const sent = await update(next => next.messages.push({ id: crypto.randomUUID(), author: viewerName.trim() || 'Visitante', role: campaign.role, body, createdAt: new Date().toISOString() }), '')
    if (!sent) throw new Error('A mensagem não foi enviada. Tente novamente.')
  }
  async function refreshCommunity() {
    if (!onRefresh || refreshing) return
    setRefreshing(true)
    setNoticeError(false)
    setNotice('Atualizando a Comunidade…')
    try {
      await onRefresh()
      setNotice('Comunidade atualizada.')
    } catch (cause) {
      setNoticeError(true)
      setNotice(cause instanceof Error ? cause.message : 'Não foi possível atualizar a Comunidade.')
    } finally { setRefreshing(false) }
  }
  function roll() {
    const count = Math.max(1, Math.min(20, Number(diceCount) || 1))
    const sides = Number(diceSides)
    const bonus = Math.max(-100, Math.min(100, Number(diceBonus) || 0))
    const values = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1)
    const result = values.reduce((sum, value) => sum + value, bonus)
    const expression = `${count}d${sides}${bonus ? `${bonus > 0 ? '+' : ''}${bonus}` : ''}`
    void update(next => next.rolls.unshift({ id: crypto.randomUUID(), label: values.join(' + '), expression, result }), `Resultado: ${expression} = ${result}. ${persisted ? 'Histórico salvo nesta mesa.' : 'Rolagem demonstrativa.'}`)
  }

  return <div className="campaign-page">
    <header className="campaign-page-header">
      <div><p className="home-overline">CAMPANHAS / {isMaster ? 'MESTRANDO' : 'JOGANDO'}</p><h1 id="home-title" ref={titleRef} tabIndex={-1}>{campaign.name}</h1><p>{isMaster ? 'Seu espaço para conduzir esta mesa.' : 'Sua visão como jogador nesta mesa.'}</p></div>
      <a className="hub-button" href="#campanhas">← Todas as campanhas</a>
    </header>
    <div className="campaign-page-layout">
      <nav className="campaign-page-nav" aria-label="Áreas da campanha">
        <button type="button" className={area === 'overview' ? 'active' : ''} onClick={() => openArea('overview')}>Visão geral</button>
        {isMaster ? masterAreas.map(item => <button type="button" key={item.id} className={area === item.id ? 'active' : ''} aria-current={area === item.id ? 'page' : undefined} onClick={() => openArea(item.id)}>{item.title}</button>) : <button type="button" className={area === 'community' ? 'active' : ''} aria-current={area === 'community' ? 'page' : undefined} onClick={() => openArea('community')}>Comunidade</button>}
      </nav>
      <div ref={scrollRef} className={`campaign-page-scroll ${area === 'community' ? 'campaign-community-scroll' : ''}`} aria-busy={saving}>
        {notice && <p className={`campaign-notice ${noticeError ? 'campaign-notice-error' : ''}`} role={noticeError ? 'alert' : 'status'}>{notice}</p>}
        {area === 'overview' && <>
          <div className="campaign-section-heading"><p className="home-overline">HUB DA CAMPANHA</p><h2>{isMaster ? 'Mesa do mestre' : 'Sua mesa'}</h2><p>{isMaster ? 'Escolha uma área para configurar o conteúdo em uma página completa.' : 'Encontre sua ficha e o que o mestre compartilhou.'}</p></div>
          {isMaster ? <div className="campaign-shortcuts">{masterAreas.map(item => <button type="button" key={item.id} onClick={() => openArea(item.id)}><span aria-hidden="true">{item.symbol}</span><strong>{item.title}</strong><small>{item.hint}</small><b aria-hidden="true">↗</b></button>)}</div> : <div className="campaign-player-grid">
            <section className="campaign-panel"><p className="home-overline">FICHA VINCULADA</p><h3>Seu personagem</h3>{ownSheets.length ? ownSheets.map(sheet => <div className="campaign-list-row" key={sheet.id}><span>{sheet.name}</span><a href={`#ficha/${encodeURIComponent(sheet.id)}`}>Abrir ficha →</a></div>) : <p>Você ainda não vinculou uma ficha a esta campanha.</p>}<a className="hub-button" href="#fichas">Ir ao hub de fichas</a></section>
            <section className="campaign-panel"><p className="home-overline">ESPAÇO DA MESA</p><h3>Comunidade</h3><p>{community.media.length} imagem(ns) · {community.notes.length} anotação(ões)</p><p>Veja os conteúdos da campanha e converse no chat da mesa.</p><button className="hub-button" type="button" onClick={() => openArea('community')}>Abrir Comunidade</button></section>
          </div>}
          <p className="campaign-page-footnote">{persisted ? 'Campanha salva na sua conta. Convites são gerenciados no hub de campanhas.' : 'Prévia demonstrativa. Os dados desta mesa ficam apenas nesta visita.'}</p>
        </>}

        {area === 'community' && <>{persisted && onRefresh && <div className="campaign-community-refresh"><button className="hub-button" type="button" disabled={refreshing} onClick={() => void refreshCommunity()}>{refreshing ? 'Atualizando…' : 'Atualizar mural ↻'}</button></div>}<CampaignCommunity workspace={data} isMaster={isMaster} onManage={openArea} onSend={sendMessage} persisted={persisted} /></>}

        {isMaster && area === 'members' && <section className="campaign-panel"><SectionHeading number="01" title="Jogadores" description={persisted ? 'Participantes que entraram pelo convite da campanha.' : 'Organize participantes e acompanhe a presença na mesa.'} />
          <p className="campaign-preview-note">{persisted ? 'Envie um convite pelo hub de campanhas. Cada jogador pode vincular sua própria ficha; os bônus da forma ficam sob controle do mestre.' : 'Nesta prévia, cada participante recebe uma ficha temporária da mesa para testar os bônus que o mestre concede. Fichas pessoais desta conta continuam fora das mesas que você mestra.'}</p>
          {!persisted && <form className="campaign-inline-form" onSubmit={event => submit(event, addMember)}><label>Nome do participante<input value={memberName} maxLength={80} required placeholder="Nome do jogador" onChange={event => setMemberName(event.target.value)} /></label><button className="hub-button hub-button-primary" type="submit" disabled={saving}>Adicionar participante</button></form>}
          <div className="campaign-list">{data.members.length ? data.members.map(member => <div className="campaign-list-row" key={member.id}><div><strong>{member.name}</strong><small>{member.status} · {member.characterName || (persisted ? 'Aguardando ficha vinculada' : 'Ficha temporária da mesa')}</small></div><div className="campaign-row-actions">
            {(!persisted || member.sheetId) && <a href={`#campanha/${encodeURIComponent(campaign.id)}/jogador/${encodeURIComponent(member.id)}`}>Abrir ficha →</a>}
            {!persisted && <><button type="button" disabled={saving} onClick={() => void update(next => { const entry = next.members.find(item => item.id === member.id)!; entry.status = entry.status === 'Ativo' ? 'Ausente' : 'Ativo' }, 'Presença atualizada nesta prévia.')}>{member.status === 'Ativo' ? 'Marcar ausente' : 'Marcar ativo'}</button><button type="button" disabled={saving} onClick={() => void update(next => { next.members = next.members.filter(item => item.id !== member.id) }, 'Participante retirado da prévia.')}>Retirar</button></>}
          </div></div>) : <EmptyMessage text="Nenhum participante nesta mesa ainda." />}</div>
        </section>}

        {isMaster && area === 'npcs' && <section className="campaign-panel"><SectionHeading number="02" title="NPCs e inimigos" description="Crie fichas próprias da mesa. Elas ficam separadas das suas fichas de jogador." />
          <form className="campaign-inline-form" onSubmit={event => submit(event, addNpc)}><label>Nome do NPC ou inimigo<input value={npcName} maxLength={80} required placeholder="Nome do personagem" onChange={event => setNpcName(event.target.value)} /></label><button className="hub-button hub-button-primary" type="submit" disabled={saving}>Criar ficha</button></form>
          <div className="campaign-list">{data.npcs.length ? data.npcs.map(npc => <div className="campaign-list-row" key={npc.id}><div><strong>{npc.name}</strong><small>Ficha da mesa</small></div><div className="campaign-row-actions"><a href={`#campanha/${encodeURIComponent(campaign.id)}/npc/${encodeURIComponent(npc.id)}`}>Abrir ficha →</a><button type="button" disabled={saving} onClick={() => void update(next => { next.npcs = next.npcs.filter(item => item.id !== npc.id) }, persisted ? 'NPC removido desta mesa.' : 'NPC retirado desta prévia.')}>Retirar</button></div></div>) : <EmptyMessage text="Nenhum NPC ou inimigo criado ainda." />}</div>
        </section>}

        {area === 'media' && <section className="campaign-panel"><SectionHeading number="03" title={isMaster ? 'Hub de mídias' : 'Mídias compartilhadas'} description={isMaster ? persisted ? 'Crie cartões com título e descrição e escolha o que os jogadores podem ver. Imagens virão na próxima atualização.' : 'Adicione uma imagem, descreva o conteúdo e escolha se os jogadores podem vê-lo.' : 'Conteúdos que o mestre disponibilizou para a mesa.'} />
          {isMaster && <form className="campaign-media-form" onSubmit={event => submit(event, addMedia)}>
            <div className="campaign-form-grid"><label>Título<input value={mediaTitle} maxLength={80} required onChange={event => setMediaTitle(event.target.value)} /></label><label>Subtítulo<input value={mediaSubtitle} maxLength={100} onChange={event => setMediaSubtitle(event.target.value)} /></label></div>
            <label>Descrição<textarea value={mediaDescription} maxLength={2000} onChange={event => setMediaDescription(event.target.value)} /></label>
            <div className="campaign-media-controls">{!persisted && <label>Imagem da prévia<input type="file" accept="image/png,image/jpeg,image/webp" onChange={readMediaFile} /></label>}<label className="campaign-checkbox"><input type="checkbox" checked={mediaShared} onChange={event => setMediaShared(event.target.checked)} />Visível na Comunidade</label></div>
            {!persisted && mediaImage && <img className="campaign-upload-preview" src={mediaImage} alt="Prévia da imagem selecionada" />}
            <p>{persisted ? 'Título e descrição são salvos agora. O envio de imagens virá com o armazenamento de arquivos.' : 'Imagens ficam apenas na memória desta visita. Arquivos de outros formatos virão com o banco.'}</p><button className="hub-button hub-button-primary" type="submit" disabled={saving}>{persisted ? 'Salvar cartão' : 'Adicionar mídia'}</button>
          </form>}
          <div className="campaign-media-grid">{(isMaster ? data.media : data.media.filter(item => item.shared)).length ? (isMaster ? data.media : data.media.filter(item => item.shared)).map(item => <article className="campaign-media-card" key={item.id}>{item.imageDataUrl ? <img src={item.imageDataUrl} alt={item.title} /> : <div className="campaign-media-placeholder" aria-hidden="true">◇</div>}<div><small>{isMaster ? item.shared ? 'NA COMUNIDADE' : 'SOMENTE MESTRE' : 'NA COMUNIDADE'}</small><h3>{item.title}</h3>{item.subtitle && <h4>{item.subtitle}</h4>}{item.description && <p>{item.description}</p>}{isMaster && <div className="campaign-row-actions"><button type="button" disabled={saving} onClick={() => void update(next => { next.media.find(entry => entry.id === item.id)!.shared = !item.shared }, persisted ? 'Visibilidade salva nesta mesa.' : 'Visibilidade atualizada nesta prévia.')}>{item.shared ? 'Retirar da Comunidade' : 'Mostrar na Comunidade'}</button><button type="button" disabled={saving} onClick={() => void update(next => { next.media = next.media.filter(entry => entry.id !== item.id) }, persisted ? 'Mídia removida da mesa.' : 'Mídia removida da prévia.')}>Remover</button></div>}</div></article>) : <EmptyMessage text={isMaster ? 'Nenhuma mídia adicionada ainda.' : 'O mestre ainda não compartilhou mídias.'} />}</div>
        </section>}

        {isMaster && area === 'items' && <section className="campaign-panel"><SectionHeading number="04" title="Itens da mesa" description="Organize equipamentos e objetos da campanha." />
          <form className="campaign-stack-form" onSubmit={event => submit(event, addItem)}><label>Nome<input value={itemName} maxLength={80} required onChange={event => setItemName(event.target.value)} /></label><label>Detalhes<textarea value={itemNotes} maxLength={1000} onChange={event => setItemNotes(event.target.value)} /></label><button className="hub-button hub-button-primary" type="submit" disabled={saving}>Adicionar item</button></form>
          <div className="campaign-list">{data.items.length ? data.items.map(item => <div className="campaign-list-row" key={item.id}><div><strong>{item.name}</strong>{item.notes && <p>{item.notes}</p>}</div><button type="button" disabled={saving} onClick={() => void update(next => { next.items = next.items.filter(entry => entry.id !== item.id) }, persisted ? 'Item removido da mesa.' : 'Item removido da prévia.')}>Remover</button></div>) : <EmptyMessage text="Nenhum item criado ainda." />}</div>
        </section>}

        {isMaster && area === 'notes' && <section className="campaign-panel"><SectionHeading number="05" title="Notas do mestre" description="Organize suas anotações e escolha quais aparecem na Comunidade para os jogadores." />
          <form className="campaign-stack-form" onSubmit={event => submit(event, addNote)}><label>Título<input value={noteTitle} maxLength={80} required onChange={event => setNoteTitle(event.target.value)} /></label><label>Anotação<textarea value={noteBody} maxLength={4000} onChange={event => setNoteBody(event.target.value)} /></label><label className="campaign-checkbox"><input type="checkbox" checked={noteShared} onChange={event => setNoteShared(event.target.checked)} />Visível na Comunidade</label><button className="hub-button hub-button-primary" type="submit" disabled={saving}>Adicionar nota</button></form>
          <div className="campaign-list">{data.notes.length ? data.notes.map(item => <div className="campaign-list-row" key={item.id}><div><strong>{item.title}</strong><small>{item.shared ? 'NA COMUNIDADE' : 'SOMENTE MESTRE'}</small><p>{item.body}</p></div><div className="campaign-row-actions"><button type="button" disabled={saving} onClick={() => void update(next => { next.notes.find(entry => entry.id === item.id)!.shared = !item.shared }, persisted ? 'Visibilidade da nota salva nesta mesa.' : 'Visibilidade da anotação atualizada nesta prévia.')}>{item.shared ? 'Retirar da Comunidade' : 'Mostrar na Comunidade'}</button><button type="button" disabled={saving} onClick={() => void update(next => { next.notes = next.notes.filter(entry => entry.id !== item.id) }, persisted ? 'Nota removida da mesa.' : 'Nota removida da prévia.')}>Remover</button></div></div>) : <EmptyMessage text="Nenhuma nota criada ainda." />}</div>
        </section>}

        {isMaster && area === 'rolls' && <section className="campaign-panel"><SectionHeading number="06" title="Rolagem de dados" description={persisted ? 'Role dados aqui. O histórico fica salvo para o mestre e não é enviado aos jogadores.' : 'Teste dados aqui. O histórico é temporário e não é enviado aos jogadores.'} />
          <div className="campaign-roll-form"><label>Quantidade<input type="number" min="1" max="20" value={diceCount} onChange={event => setDiceCount(Number(event.target.value))} /></label><label>Dado<select value={diceSides} onChange={event => setDiceSides(Number(event.target.value))}>{[4, 6, 8, 10, 12, 20, 100].map(sides => <option key={sides} value={sides}>d{sides}</option>)}</select></label><label>Bônus<input type="number" min="-100" max="100" value={diceBonus} onChange={event => setDiceBonus(Number(event.target.value))} /></label><button className="hub-button hub-button-primary" type="button" onClick={roll} disabled={saving}>Rolar dados</button></div>
          <div className="campaign-list">{data.rolls.length ? data.rolls.map(item => <div className="campaign-list-row" key={item.id}><div><strong>{item.expression}</strong><small>{item.label}</small></div><b className="campaign-roll-result">{item.result}</b></div>) : <EmptyMessage text={persisted ? 'Nenhuma rolagem registrada.' : 'Nenhuma rolagem nesta visita.'} />}</div>
        </section>}
      </div>
    </div>
  </div>
}

function SectionHeading({ number, title, description }: { number: string; title: string; description: string }) {
  return <div className="campaign-section-heading"><p className="home-overline">ÁREA {number}</p><h2>{title}</h2><p>{description}</p></div>
}
function EmptyMessage({ text }: { text: string }) { return <p className="campaign-empty">{text}</p> }
