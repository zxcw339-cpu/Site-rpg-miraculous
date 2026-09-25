import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, RefObject } from 'react'
import type { Campaign, CharacterSheet } from '../hub-data'
import { communityContent, normalizeCampaignWorkspace, type CampaignRoll, type CampaignWorkspace } from '../campaign-model'
import { emptySheetDetails } from '../sheet-model'
import { CampaignCommunity } from './CampaignCommunity'
import type { CommunityPostDraft } from './CampaignCommunity'
import type { CampaignLog } from '../data/game'
import '../campaign-page.css'

type Area = 'overview' | 'community' | 'members' | 'npcs' | 'media' | 'items' | 'notes' | 'rolls' | 'history' | 'logs'
const masterAreas: { id: Area; title: string; hint: string; symbol: string }[] = [
  { id: 'community', title: 'Comunidade', hint: 'Imagens, anotações e chat', symbol: '◌' },
  { id: 'members', title: 'Jogadores', hint: 'Participantes e presença', symbol: '♧' },
  { id: 'npcs', title: 'NPCs e inimigos', hint: 'Personagens da mesa', symbol: '◇' },
  { id: 'media', title: 'Mídias', hint: 'Imagens e arquivos visuais', symbol: '▧' },
  { id: 'items', title: 'Itens', hint: 'Equipamentos e achados', symbol: '✦' },
  { id: 'notes', title: 'Notas', hint: 'Anotações do mestre', symbol: '≡' },
  { id: 'rolls', title: 'Dados', hint: 'Rolar dados', symbol: '⬡' },
  { id: 'history', title: 'Histórico roll', hint: 'Rolagens da mesa', symbol: '◷' },
  { id: 'logs', title: 'Registros', hint: 'Atividade da mesa', symbol: '≡' },
]

interface Props {
  campaign: Campaign
  sheets: CharacterSheet[]
  titleRef: RefObject<HTMLHeadingElement | null>
  viewerName: string
  viewerId?: string
  onUpdate: (workspace: CampaignWorkspace, before: CampaignWorkspace) => void | Promise<void>
  onSendMessage?: (body: string) => Promise<void>
  onEditMessage?: (id: string, body: string) => Promise<void>
  onCreatePost?: (draft: CommunityPostDraft) => Promise<void>
  onEditPost?: (kind: 'media' | 'note', id: string, draft: CommunityPostDraft) => Promise<void>
  onRecordRoll?: (label: string, count: number, sides: number, bonus: number, mode: 'sum' | 'max') => Promise<CampaignRoll>
  onRefresh?: () => Promise<void>
  logs?: CampaignLog[]
  persisted?: boolean
}

export function CampaignWorkspacePage({ campaign, sheets, titleRef, viewerName, viewerId, onUpdate, onSendMessage, onEditMessage, onCreatePost, onEditPost, onRecordRoll, onRefresh, logs = [], persisted = false }: Props) {
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
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteBody, setNoteBody] = useState('')
  const [noteShared, setNoteShared] = useState(false)
  const [noteCategoryId, setNoteCategoryId] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [mediaTitle, setMediaTitle] = useState('')
  const [mediaSubtitle, setMediaSubtitle] = useState('')
  const [mediaDescription, setMediaDescription] = useState('')
  const [mediaImage, setMediaImage] = useState<string | undefined>()
  const [mediaShared, setMediaShared] = useState(false)
  const [mediaCategoryId, setMediaCategoryId] = useState('')
  const [editingMediaId, setEditingMediaId] = useState<string | null>(null)
  const [diceCount, setDiceCount] = useState(1)
  const [diceSides, setDiceSides] = useState(20)
  const [diceBonus, setDiceBonus] = useState(0)
  const data = normalizeCampaignWorkspace(campaign.workspace)
  const community = communityContent(data)
  const isMaster = campaign.role === 'master'
  const mediaPreviewIsVideo = Boolean(mediaImage && (mediaImage.startsWith('data:video/') ||
    (editingMediaId && !mediaImage.startsWith('data:') && data.media.find(item => item.id === editingMediaId)?.type === 'video')))
  const ownSheets = sheets.filter(sheet => sheet.campaignId === campaign.id && !isMaster)

  useEffect(() => {
    if (!notice || noticeError || notice === 'Salvando alteração…' || notice === 'Atualizando a Comunidade…') return
    const timer = window.setTimeout(() => setNotice(''), 4_500)
    return () => window.clearTimeout(timer)
  }, [notice, noticeError])

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
    const file = event.target.files?.[0]
    if (!file) return
    const video = file.type === 'video/mp4' || file.type === 'video/webm'
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'].includes(file.type) || file.size > (video ? 20_000_000 : 5_000_000)) {
      setNoticeError(true); setNotice('Use PNG, JPG, WebP ou GIF de até 5 MB; vídeos MP4 ou WebM de até 20 MB.'); event.target.value = ''; return
    }
    setNoticeError(false)
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
    const saved = await update(next => {
      if (editingItemId) {
        const item = next.items.find(entry => entry.id === editingItemId)
        if (!item) throw new Error('Este item não está mais na mesa. Atualize a página e tente novamente.')
        item.name = itemName.trim()
        item.notes = itemNotes.trim()
      } else next.items.push({ id: crypto.randomUUID(), name: itemName.trim(), notes: itemNotes.trim() })
    }, persisted ? 'Item salvo nesta mesa.' : 'Item salvo nesta prévia.')
    if (saved) { setItemName(''); setItemNotes(''); setEditingItemId(null) }
  }
  async function addNote() {
    if (!noteTitle.trim()) return
    const saved = await update(next => {
      const entry = { id: editingNoteId ?? crypto.randomUUID(), title: noteTitle.trim(), body: noteBody.trim(), shared: noteShared, categoryId: noteCategoryId || null }
      if (editingNoteId) next.notes = next.notes.map(item => item.id === editingNoteId ? { ...item, ...entry } : item)
      else next.notes.push(entry)
    }, persisted ? 'Texto salvo nesta mesa.' : 'Texto salvo nesta prévia.')
    if (saved) { setNoteTitle(''); setNoteBody(''); setNoteShared(false); setNoteCategoryId(''); setEditingNoteId(null) }
  }
  async function addMedia() {
    if (!mediaTitle.trim()) return
    const saved = await update(next => {
      const previous = editingMediaId ? next.media.find(item => item.id === editingMediaId) : undefined
      const entry = { id: editingMediaId ?? crypto.randomUUID(), title: mediaTitle.trim(), subtitle: mediaSubtitle.trim(), description: mediaDescription.trim(), imageDataUrl: mediaImage ?? previous?.imageDataUrl, shared: mediaShared, categoryId: mediaCategoryId || null, type: mediaImage?.startsWith('data:video/') ? 'video' as const : mediaImage?.startsWith('data:image/gif') ? 'gif' as const : previous?.type ?? 'image' as const }
      if (editingMediaId) next.media = next.media.map(item => item.id === editingMediaId ? { ...item, ...entry } : item)
      else next.media.push(entry)
    }, persisted ? 'Mídia salva nesta mesa.' : 'Mídia adicionada nesta prévia.')
    if (saved) { setMediaTitle(''); setMediaSubtitle(''); setMediaDescription(''); setMediaImage(undefined); setMediaShared(false); setMediaCategoryId(''); setEditingMediaId(null) }
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
  async function editMessage(id: string, body: string) {
    if (persisted && onEditMessage) { await onEditMessage(id, body); return }
    const saved = await update(next => { const message = next.messages.find(item => item.id === id); if (message) { message.body = body; message.editedAt = new Date().toISOString() } }, 'Mensagem editada nesta prévia.')
    if (!saved) throw new Error('Não foi possível editar a mensagem.')
  }
  async function createCategory(name: string, description: string) {
    const saved = await update(next => next.categories.push({ id: crypto.randomUUID(), name, description, sortOrder: next.categories.length }), 'Categoria criada.')
    if (!saved) throw new Error('Não foi possível criar a categoria.')
  }
  async function editCategory(id: string, name: string, description: string) {
    const saved = await update(next => {
      const category = next.categories.find(entry => entry.id === id)
      if (!category) throw new Error('Esta categoria não está mais na mesa. Atualize e tente novamente.')
      category.name = name
      category.description = description
    }, 'Categoria atualizada.')
    if (!saved) throw new Error('Não foi possível editar a categoria.')
  }
  async function deleteCategory(id: string) {
    const saved = await update(next => { next.categories = next.categories.filter(entry => entry.id !== id) }, 'Categoria excluída. As publicações permanecem no mural.')
    if (!saved) throw new Error('Não foi possível excluir a categoria.')
  }
  async function hidePost(kind: 'media' | 'note', id: string) {
    const saved = await update(next => {
      if (kind === 'media') { const entry = next.media.find(item => item.id === id); if (entry) entry.shared = false }
      else { const entry = next.notes.find(item => item.id === id); if (entry) entry.shared = false }
    }, 'Publicação retirada da Comunidade.')
    if (!saved) throw new Error('Não foi possível retirar a publicação.')
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
  async function roll() {
    const count = Math.max(1, Math.min(20, Number(diceCount) || 1))
    const sides = Number(diceSides)
    const bonus = Math.max(-100, Math.min(100, Number(diceBonus) || 0))
    const expression = `${count}d${sides}${bonus ? `${bonus > 0 ? '+' : ''}${bonus}` : ''}`
    if (persisted && onRecordRoll) {
      try {
        const recorded = await onRecordRoll('Dados do mestre', count, sides, bonus, 'sum')
        setNoticeError(false)
        setNotice(`Resultado: ${expression} = ${recorded.result}.`)
      } catch (cause) { setNoticeError(true); setNotice(cause instanceof Error ? cause.message : 'Não foi possível registrar a rolagem.') }
      return
    }
    const values = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1)
    const result = values.reduce((sum, value) => sum + value, bonus)
    void update(next => next.rolls.unshift({ id: crypto.randomUUID(), label: values.join(' + '), expression, result }), `Resultado: ${expression} = ${result}. Rolagem demonstrativa.`)
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

        {area === 'community' && <CampaignCommunity workspace={data} isMaster={isMaster} viewerId={viewerId} onManage={openArea} onSend={sendMessage} onEditMessage={editMessage} onRefresh={onRefresh ? refreshCommunity : undefined} onCreateCategory={isMaster ? createCategory : undefined} onEditCategory={isMaster ? editCategory : undefined} onDeleteCategory={isMaster ? deleteCategory : undefined} onCreatePost={onCreatePost} onEditPost={onEditPost} onHidePost={isMaster ? hidePost : undefined} persisted={persisted} />}

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

        {area === 'media' && <section className="campaign-panel"><SectionHeading number="03" title={isMaster ? 'Hub de mídias' : 'Mídias compartilhadas'} description={isMaster ? 'Envie uma imagem, GIF ou vídeo; escolha a categoria e o que o grupo pode ver.' : 'Conteúdos compartilhados com a mesa.'} />
          {isMaster && <form className="campaign-media-form" onSubmit={event => submit(event, addMedia)}>
            <div className="campaign-form-grid"><label>Título<input value={mediaTitle} maxLength={80} required onChange={event => setMediaTitle(event.target.value)} /></label><label>Subtítulo<input value={mediaSubtitle} maxLength={100} onChange={event => setMediaSubtitle(event.target.value)} /></label></div>
            <label>Descrição<textarea value={mediaDescription} maxLength={2000} onChange={event => setMediaDescription(event.target.value)} /></label>
            <label>Categoria<select value={mediaCategoryId} onChange={event => setMediaCategoryId(event.target.value)}><option value="">Geral</option>{data.categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <div className="campaign-media-controls"><label>Arquivo <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm" onChange={readMediaFile} /></label><label className="campaign-checkbox"><input type="checkbox" checked={mediaShared} onChange={event => setMediaShared(event.target.checked)} />Visível na Comunidade</label></div>
            {mediaImage && (mediaPreviewIsVideo ? <video className="campaign-upload-preview" src={mediaImage} controls preload="metadata" /> : <img className="campaign-upload-preview" src={mediaImage} alt="Prévia da imagem selecionada" />)}
            <p>Imagens e GIFs até 5 MB; vídeos MP4 ou WebM até 20 MB.{persisted ? ' O arquivo será salvo na mesa.' : ' A prévia dura apenas esta visita.'}</p><div className="campaign-form-actions"><button className="hub-button hub-button-primary" type="submit" disabled={saving}>{editingMediaId ? 'Salvar edição' : 'Adicionar mídia'}</button>{editingMediaId && <button type="button" className="hub-button" onClick={() => { setEditingMediaId(null); setMediaTitle(''); setMediaSubtitle(''); setMediaDescription(''); setMediaImage(undefined); setMediaShared(false); setMediaCategoryId('') }}>Cancelar edição</button>}</div>
          </form>}
          <div className="campaign-media-grid">{(isMaster ? data.media : data.media.filter(item => item.shared)).length ? (isMaster ? data.media : data.media.filter(item => item.shared)).map(item => <article className="campaign-media-card" key={item.id}>{(item.imageDataUrl || item.mediaUrl) ? item.type === 'video' ? <video src={item.imageDataUrl || item.mediaUrl} controls preload="metadata" aria-label={item.title} /> : <img src={item.imageDataUrl || item.mediaUrl} alt={item.title} loading="lazy" /> : <div className="campaign-media-placeholder" aria-hidden="true">◇</div>}<div><small>{isMaster ? item.shared ? 'NA COMUNIDADE' : 'SOMENTE MESTRE' : 'NA COMUNIDADE'}</small><h3>{item.title}</h3>{item.subtitle && <h4>{item.subtitle}</h4>}{item.description && <p>{item.description}</p>}{isMaster && <div className="campaign-row-actions"><button type="button" onClick={() => { setEditingMediaId(item.id); setMediaTitle(item.title); setMediaSubtitle(item.subtitle); setMediaDescription(item.description); setMediaImage(item.imageDataUrl || item.mediaUrl); setMediaShared(item.shared); setMediaCategoryId(item.categoryId ?? ''); scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }) }}>Editar</button><button type="button" disabled={saving} onClick={() => void update(next => { next.media.find(entry => entry.id === item.id)!.shared = !item.shared }, persisted ? 'Visibilidade salva nesta mesa.' : 'Visibilidade atualizada nesta prévia.')}>{item.shared ? 'Retirar da Comunidade' : 'Mostrar na Comunidade'}</button><button type="button" disabled={saving} onClick={() => void update(next => { next.media = next.media.filter(entry => entry.id !== item.id) }, persisted ? 'Mídia removida da mesa.' : 'Mídia removida da prévia.')}>Remover</button></div>}</div></article>) : <EmptyMessage text={isMaster ? 'Nenhuma mídia adicionada ainda.' : 'O mestre ainda não compartilhou mídias.'} />}</div>
        </section>}

        {isMaster && area === 'items' && <section className="campaign-panel"><SectionHeading number="04" title="Itens da mesa" description="Organize equipamentos e objetos da campanha." />
          <form className="campaign-stack-form" onSubmit={event => submit(event, addItem)}><label>Nome<input value={itemName} maxLength={80} required onChange={event => setItemName(event.target.value)} /></label><label>Detalhes<textarea value={itemNotes} maxLength={1000} onChange={event => setItemNotes(event.target.value)} /></label><div className="campaign-form-actions"><button className="hub-button hub-button-primary" type="submit" disabled={saving}>{editingItemId ? 'Salvar edição' : 'Adicionar item'}</button>{editingItemId && <button type="button" className="hub-button" disabled={saving} onClick={() => { setEditingItemId(null); setItemName(''); setItemNotes('') }}>Cancelar edição</button>}</div></form>
          <div className="campaign-list">{data.items.length ? data.items.map(item => <div className="campaign-list-row" key={item.id}><div><strong>{item.name}</strong>{item.notes && <p>{item.notes}</p>}</div><div className="campaign-row-actions"><button type="button" disabled={saving} onClick={() => { setEditingItemId(item.id); setItemName(item.name); setItemNotes(item.notes); scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }) }}>Editar</button><button type="button" disabled={saving} onClick={() => void update(next => { next.items = next.items.filter(entry => entry.id !== item.id) }, persisted ? 'Item removido da mesa.' : 'Item removido da prévia.')}>Remover</button></div></div>) : <EmptyMessage text="Nenhum item criado ainda." />}</div>
        </section>}

        {isMaster && area === 'notes' && <section className="campaign-panel"><SectionHeading number="05" title="Notas do mestre" description="Organize suas anotações e escolha quais aparecem na Comunidade para os jogadores." />
          <form className="campaign-stack-form" onSubmit={event => submit(event, addNote)}><label>Título<input value={noteTitle} maxLength={80} required onChange={event => setNoteTitle(event.target.value)} /></label><label>Anotação<textarea value={noteBody} maxLength={4000} onChange={event => setNoteBody(event.target.value)} /></label><label>Categoria<select value={noteCategoryId} onChange={event => setNoteCategoryId(event.target.value)}><option value="">Geral</option>{data.categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="campaign-checkbox"><input type="checkbox" checked={noteShared} onChange={event => setNoteShared(event.target.checked)} />Visível na Comunidade</label><div className="campaign-form-actions"><button className="hub-button hub-button-primary" type="submit" disabled={saving}>{editingNoteId ? 'Salvar edição' : 'Adicionar nota'}</button>{editingNoteId && <button type="button" className="hub-button" onClick={() => { setEditingNoteId(null); setNoteTitle(''); setNoteBody(''); setNoteShared(false); setNoteCategoryId('') }}>Cancelar edição</button>}</div></form>
          <div className="campaign-list">{data.notes.length ? data.notes.map(item => <div className="campaign-list-row" key={item.id}><div><strong>{item.title}</strong><small>{item.shared ? 'NA COMUNIDADE' : 'SOMENTE MESTRE'}</small><p>{item.body}</p></div><div className="campaign-row-actions"><button type="button" onClick={() => { setEditingNoteId(item.id); setNoteTitle(item.title); setNoteBody(item.body); setNoteShared(Boolean(item.shared)); setNoteCategoryId(item.categoryId ?? ''); scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }) }}>Editar</button><button type="button" disabled={saving} onClick={() => void update(next => { next.notes.find(entry => entry.id === item.id)!.shared = !item.shared }, persisted ? 'Visibilidade da nota salva nesta mesa.' : 'Visibilidade da anotação atualizada nesta prévia.')}>{item.shared ? 'Retirar da Comunidade' : 'Mostrar na Comunidade'}</button><button type="button" disabled={saving} onClick={() => void update(next => { next.notes = next.notes.filter(entry => entry.id !== item.id) }, persisted ? 'Nota removida da mesa.' : 'Nota removida da prévia.')}>Remover</button></div></div>) : <EmptyMessage text="Nenhuma nota criada ainda." />}</div>
        </section>}

        {isMaster && area === 'rolls' && <section className="campaign-panel"><SectionHeading number="06" title="Rolagem de dados" description={persisted ? 'Role dados para a mesa. O resultado também aparece no histórico.' : 'Teste dados aqui. O histórico é temporário.'} />
          <div className="campaign-roll-form"><label>Quantidade<input type="number" min="1" max="20" value={diceCount} onChange={event => setDiceCount(Number(event.target.value))} /></label><label>Dado<select value={diceSides} onChange={event => setDiceSides(Number(event.target.value))}>{[4, 6, 8, 10, 12, 20, 100].map(sides => <option key={sides} value={sides}>d{sides}</option>)}</select></label><label>Bônus<input type="number" min="-100" max="100" value={diceBonus} onChange={event => setDiceBonus(Number(event.target.value))} /></label><button className="hub-button hub-button-primary" type="button" onClick={roll} disabled={saving}>Rolar dados</button></div>
          <button className="hub-button" type="button" onClick={() => openArea('history')}>Ver histórico completo →</button>
        </section>}

        {isMaster && area === 'history' && <section className="campaign-panel"><SectionHeading number="07" title="Histórico roll" description="Rolagens dos jogadores e do mestre nesta campanha." />
          {onRefresh && <button className="hub-button campaign-inline-refresh" type="button" onClick={() => void onRefresh()}>Atualizar histórico ↻</button>}
          <div className="campaign-list">{data.rolls.length ? data.rolls.map(item => <div className="campaign-list-row" key={item.id}><div><strong>{item.author || 'Jogador'} · {item.label}</strong><small>{item.expression}{item.createdAt ? ` · ${new Date(item.createdAt).toLocaleString('pt-BR')}` : ''}{item.dice?.length ? ` · Dados: ${item.dice.join(', ')}` : ''}</small></div><b className="campaign-roll-result">{item.result}</b></div>) : <EmptyMessage text="Nenhuma rolagem registrada nesta mesa." />}</div>
        </section>}

        {isMaster && area === 'logs' && <section className="campaign-panel"><SectionHeading number="08" title="Registros da mesa" description="Criações, edições e ações registradas nesta campanha." />
          {onRefresh && <button className="hub-button campaign-inline-refresh" type="button" onClick={() => void onRefresh()}>Atualizar registros ↻</button>}
          <div className="campaign-list">{logs.length ? logs.map(item => <div className="campaign-list-row" key={item.id}><div><strong>{formatLog(item)}</strong><small>{item.actorId ? `Usuário ${item.actorId.slice(0, 8)}` : 'Conta'} · {new Date(item.createdAt).toLocaleString('pt-BR')}</small></div></div>) : <EmptyMessage text="Ainda não há registros para mostrar." />}</div>
        </section>}
      </div>
    </div>
  </div>
}

function SectionHeading({ number, title, description }: { number: string; title: string; description: string }) {
  return <div className="campaign-section-heading"><p className="home-overline">ÁREA {number}</p><h2>{title}</h2><p>{description}</p></div>
}
function EmptyMessage({ text }: { text: string }) { return <p className="campaign-empty">{text}</p> }
function formatLog(entry: CampaignLog): string {
  const action = ({ insert: 'criou', update: 'editou', delete: 'excluiu', master_update: 'revisou' } as Record<string, string>)[entry.action] ?? entry.action
  const subject = ({ rpg_sheets: 'ficha', rpg_sheet_master_data: 'bônus e habilidades', rpg_campaign_master_data: 'painel do mestre', rpg_campaign_categories: 'categoria', rpg_campaign_media: 'mídia', rpg_campaign_notes: 'texto', rpg_campaign_messages: 'mensagem', rpg_campaign_rolls: 'rolagem' } as Record<string, string>)[entry.entityType] ?? entry.entityType
  const name = typeof entry.details.name === 'string' && entry.details.name ? ` “${entry.details.name}”` : ''
  return `${action.charAt(0).toLocaleUpperCase('pt-BR') + action.slice(1)} ${subject}${name}`
}
