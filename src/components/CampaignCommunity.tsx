import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { communityContent, type CampaignMedia, type CampaignWorkspace } from '../campaign-model'
import { Modal } from './Modal'
import '../community.css'

type Category = { id: string; name: string; description?: string; sortOrder?: number }
type Media = CampaignMedia & { categoryId?: string | null; type?: 'image' | 'gif' | 'video' | 'text'; mediaUrl?: string; authorId?: string }
type Note = CampaignWorkspace['notes'][number] & { categoryId?: string | null; authorId?: string }
type Message = CampaignWorkspace['messages'][number] & { authorId?: string; avatarUrl?: string; editedAt?: string }

export type CommunityPostDraft = { kind: 'media' | 'note'; title: string; body: string; categoryId?: string | null; file?: File | null }
type PostEditor = CommunityPostDraft & { mode: 'create' | 'edit'; id?: string }

interface Props {
  workspace: CampaignWorkspace
  isMaster: boolean
  viewerId?: string
  onManage: (area: 'media' | 'notes') => void
  onSend: (body: string) => void | Promise<void>
  onEditMessage?: (id: string, body: string) => void | Promise<void>
  onRefresh?: () => void | Promise<void>
  onCreateCategory?: (name: string, description: string) => void | Promise<void>
  onEditCategory?: (id: string, name: string, description: string) => void | Promise<void>
  onDeleteCategory?: (id: string) => void | Promise<void>
  onCreatePost?: (draft: CommunityPostDraft) => void | Promise<void>
  onEditPost?: (kind: 'media' | 'note', id: string, draft: CommunityPostDraft) => void | Promise<void>
  onHidePost?: (kind: 'media' | 'note', id: string) => void | Promise<void>
  persisted?: boolean
}

export function CampaignCommunity({ workspace, isMaster, viewerId, onManage, onSend, onEditMessage, onRefresh, onCreateCategory, onEditCategory, onDeleteCategory, onCreatePost, onEditPost, onHidePost, persisted = false }: Props) {
  const [view, setView] = useState('all')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [image, setImage] = useState<Media | null>(null)
  const [categoryFormOpen, setCategoryFormOpen] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [categoryDescription, setCategoryDescription] = useState('')
  const [categorySaving, setCategorySaving] = useState(false)
  const [categoryError, setCategoryError] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [confirmCategoryDeleteId, setConfirmCategoryDeleteId] = useState<string | null>(null)
  const [categoryDeletePendingId, setCategoryDeletePendingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingBody, setEditingBody] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState('')
  const [postEditor, setPostEditor] = useState<PostEditor | null>(null)
  const [postSaving, setPostSaving] = useState(false)
  const [postError, setPostError] = useState('')
  const [moderatingId, setModeratingId] = useState<string | null>(null)
  const [moderationError, setModerationError] = useState('')
  const logRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messageRevision = useRef(0)
  const stickToBottom = useRef(true)
  const { media, notes } = communityContent(workspace) as { media: Media[]; notes: Note[] }
  const categories = ((workspace as CampaignWorkspace & { categories?: Category[] }).categories ?? []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  const messages = workspace.messages as Message[]
  const filteredMedia = view === 'all' || view === 'media' ? media : view === 'notes' ? [] : media.filter(item => item.categoryId === view)
  const filteredNotes = view === 'all' || view === 'notes' ? notes : view === 'media' ? [] : notes.filter(item => item.categoryId === view)
  const lastMessageId = workspace.messages.at(-1)?.id

  useEffect(() => {
    const log = logRef.current
    if (log && stickToBottom.current) log.scrollTop = log.scrollHeight
  }, [lastMessageId])

  useEffect(() => {
    if (view !== 'all' && view !== 'media' && view !== 'notes' && !categories.some(category => category.id === view)) setView('all')
  }, [view, categories])

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = message.trim()
    if (!body || body.length > 1500 || sending) return
    const sentRevision = messageRevision.current
    setSending(true)
    setSendError('')
    try {
      await onSend(body)
      if (messageRevision.current === sentRevision) setMessage('')
      stickToBottom.current = true
      inputRef.current?.focus({ preventScroll: true })
    } catch (cause) {
      setSendError(cause instanceof Error ? cause.message : 'Não foi possível enviar a mensagem.')
    } finally { setSending(false) }
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = categoryName.trim()
    if (!name || categorySaving) return
    setCategorySaving(true)
    setCategoryError('')
    try {
      if (editingCategoryId) {
        if (!onEditCategory) throw new Error('A edição da categoria não está disponível.')
        await onEditCategory(editingCategoryId, name, categoryDescription.trim())
      } else {
        if (!onCreateCategory) throw new Error('A criação da categoria não está disponível.')
        await onCreateCategory(name, categoryDescription.trim())
      }
      setCategoryName('')
      setCategoryDescription('')
      setEditingCategoryId(null)
    } catch (cause) {
      setCategoryError(cause instanceof Error ? cause.message : 'Não foi possível salvar a categoria.')
    } finally { setCategorySaving(false) }
  }

  async function deleteCategory(id: string) {
    if (!onDeleteCategory || categoryDeletePendingId) return
    setCategoryDeletePendingId(id)
    setCategoryError('')
    try {
      await onDeleteCategory(id)
      setConfirmCategoryDeleteId(null)
      if (view === id) setView('all')
      if (editingCategoryId === id) { setEditingCategoryId(null); setCategoryName(''); setCategoryDescription('') }
    } catch (cause) {
      setCategoryError(cause instanceof Error ? cause.message : 'Não foi possível excluir a categoria.')
    } finally { setCategoryDeletePendingId(null) }
  }

  async function editMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = editingBody.trim()
    if (!editingId || !body || !onEditMessage || editSaving) return
    setEditSaving(true)
    setEditError('')
    try {
      await onEditMessage(editingId, body)
      setEditingId(null)
      setEditingBody('')
    } catch (cause) {
      setEditError(cause instanceof Error ? cause.message : 'Não foi possível salvar a mensagem.')
    } finally { setEditSaving(false) }
  }

  async function refresh() {
    if (!onRefresh || refreshing) return
    setRefreshing(true)
    setRefreshError('')
    try { await onRefresh() }
    catch (cause) { setRefreshError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a conversa.') }
    finally { setRefreshing(false) }
  }

  function beginEdit(kind: 'media' | 'note', item: Media | Note) {
    setPostError('')
    setPostEditor({ mode: 'edit', kind, id: item.id, title: item.title, body: kind === 'media' ? (item as Media).description : (item as Note).body, categoryId: item.categoryId ?? null, file: null })
  }

  async function savePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!postEditor || postSaving) return
    const draft: CommunityPostDraft = { kind: postEditor.kind, title: postEditor.title.trim(), body: postEditor.body.trim(), categoryId: postEditor.categoryId ?? null, file: postEditor.file ?? null }
    if (!draft.title) { setPostError('Dê um título à publicação.'); return }
    if (draft.kind === 'media' && postEditor.mode === 'create' && !draft.file) { setPostError('Escolha uma imagem, GIF ou vídeo.'); return }
    if (draft.file && (!['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'].includes(draft.file.type) || draft.file.size > (draft.file.type.startsWith('video/') ? 20_000_000 : 5_000_000))) {
      setPostError('Use PNG, JPG, WebP ou GIF até 5 MB; MP4 ou WebM até 20 MB.'); return
    }
    setPostSaving(true)
    setPostError('')
    try {
      if (postEditor.mode === 'edit') {
        if (!postEditor.id || !onEditPost) throw new Error('A edição não está disponível para esta publicação.')
        await onEditPost(postEditor.kind, postEditor.id, draft)
      } else {
        if (!onCreatePost) throw new Error('A publicação não está disponível nesta mesa.')
        await onCreatePost(draft)
      }
      setPostEditor(null)
    } catch (cause) {
      setPostError(cause instanceof Error ? cause.message : 'Não foi possível salvar a publicação.')
    } finally { setPostSaving(false) }
  }

  async function hidePost(kind: 'media' | 'note', id: string) {
    if (!onHidePost || moderatingId) return
    setModeratingId(id)
    setModerationError('')
    try { await onHidePost(kind, id) }
    catch (cause) { setModerationError(cause instanceof Error ? cause.message : 'Não foi possível retirar esta publicação do mural.') }
    finally { setModeratingId(null) }
  }

  return <section className="campaign-community" aria-labelledby="community-title">
    <header className="community-heading">
      <div><p className="home-overline">ESPAÇO DA MESA</p><h2 id="community-title">Comunidade</h2><p>Um mural para tudo que o grupo pode ver, e uma conversa ao lado.</p></div>
      <span className="community-preview-badge">{persisted ? 'MESA' : 'PRÉVIA'}</span>
    </header>
    <div className="community-layout">
      <section className="community-board" aria-label="Mural da campanha">
        <div className="community-board-topline"><div><span className="community-section-number">01 / MURAL</span><h3>Arquivo compartilhado</h3><span className="community-count">{media.length + notes.length} {media.length + notes.length === 1 ? 'publicação' : 'publicações'}</span></div>{onCreatePost && <button type="button" className="community-publish" onClick={() => { setPostError(''); setPostEditor({ mode: 'create', kind: 'note', title: '', body: '', categoryId: null, file: null }) }}>+ Publicar</button>}</div>
        <div className="community-board-header">
          <div className="community-filters" role="group" aria-label="Filtrar publicações">
            <button type="button" aria-pressed={view === 'all'} onClick={() => setView('all')}>Tudo <span>{media.length + notes.length}</span></button>
            <button type="button" aria-pressed={view === 'media'} onClick={() => setView('media')}>Mídias <span>{media.length}</span></button>
            <button type="button" aria-pressed={view === 'notes'} onClick={() => setView('notes')}>Textos <span>{notes.length}</span></button>
            {categories.map(category => <button key={category.id} type="button" aria-pressed={view === category.id} title={category.description} onClick={() => setView(category.id)}>{category.name} <span>{media.filter(item => item.categoryId === category.id).length + notes.filter(item => item.categoryId === category.id).length}</span></button>)}
          </div>
          {isMaster && onCreateCategory && <button type="button" className="community-manage" aria-expanded={categoryFormOpen} onClick={() => { setCategoryFormOpen(open => !open); setCategoryError(''); setConfirmCategoryDeleteId(null) }}>Gerenciar categorias</button>}
        </div>
        {categoryFormOpen && <div className="community-category-form" role="region" aria-label="Gerenciar categorias">
          <form onSubmit={addCategory} style={{ display: 'grid', gap: 10 }}>
            <div><label htmlFor="community-category-name">{editingCategoryId ? 'Editar nome da categoria' : 'Nova categoria'}</label><input id="community-category-name" value={categoryName} maxLength={50} placeholder="Ex.: Diário da campanha" onChange={event => setCategoryName(event.target.value)} /></div>
            <div><label htmlFor="community-category-description">Descrição opcional</label><input id="community-category-description" value={categoryDescription} maxLength={160} placeholder="O que o grupo encontra aqui" onChange={event => setCategoryDescription(event.target.value)} /></div>
            {categoryError && <p className="field-error" role="alert">{categoryError}</p>}
            <div className="community-category-actions">{editingCategoryId && <button type="button" disabled={categorySaving} onClick={() => { setEditingCategoryId(null); setCategoryName(''); setCategoryDescription(''); setCategoryError('') }}>Cancelar edição</button>}<button type="submit" disabled={!categoryName.trim() || categorySaving}>{categorySaving ? 'Salvando…' : editingCategoryId ? 'Salvar categoria' : 'Criar categoria'}</button></div>
          </form>
          {categories.length > 0 && <div aria-label="Categorias existentes" style={{ display: 'grid', gap: 8 }}>{categories.map(category => <div className="community-category-actions" key={category.id}><strong style={{ marginRight: 'auto' }}>{category.name}</strong>{onEditCategory && <button type="button" disabled={categorySaving || Boolean(categoryDeletePendingId)} onClick={() => { setEditingCategoryId(category.id); setCategoryName(category.name); setCategoryDescription(category.description ?? ''); setCategoryError('') }}>Editar</button>}{onDeleteCategory && (confirmCategoryDeleteId === category.id ? <><span>As publicações permanecerão no mural.</span><button type="button" disabled={Boolean(categoryDeletePendingId)} onClick={() => setConfirmCategoryDeleteId(null)}>Cancelar</button><button type="button" disabled={Boolean(categoryDeletePendingId)} onClick={() => void deleteCategory(category.id)}>{categoryDeletePendingId === category.id ? 'Excluindo…' : 'Confirmar exclusão'}</button></> : <button type="button" disabled={categorySaving || Boolean(categoryDeletePendingId)} onClick={() => setConfirmCategoryDeleteId(category.id)}>Excluir</button>)}</div>)}</div>}
        </div>}
        <div className="community-board-content" id="community-board-content">
          {moderationError && <p className="field-error" role="alert">{moderationError}</p>}
          {filteredMedia.length + filteredNotes.length ? <div className="community-feed">
            {filteredMedia.map(item => <article className={`community-post community-post-${item.type ?? 'image'}`} key={`media-${item.id}`}>
              <div className="community-post-kicker"><span>{mediaKind(item)}</span>{item.categoryId && <span>{categories.find(category => category.id === item.categoryId)?.name}</span>}</div>
              <CommunityMediaPreview item={item} onOpen={() => setImage(item)} />
              <div className="community-post-copy"><h4>{item.title}</h4>{item.subtitle && <p className="community-post-subtitle">{item.subtitle}</p>}{item.description && <p>{item.description}</p>}<div className="community-post-actions">{onEditPost && (isMaster || Boolean(viewerId && item.authorId === viewerId)) && <button type="button" onClick={() => beginEdit('media', item)}>Editar</button>}{isMaster && onHidePost && <button type="button" disabled={moderatingId === item.id} onClick={() => void hidePost('media', item.id)}>{moderatingId === item.id ? 'Retirando…' : 'Retirar do mural'}</button>}</div></div>
            </article>)}
            {filteredNotes.map(note => <article className="community-post community-post-note" key={`note-${note.id}`}><div className="community-post-kicker"><span>Texto</span>{note.categoryId && <span>{categories.find(category => category.id === note.categoryId)?.name}</span>}</div><div className="community-note-mark" aria-hidden="true">≡</div><div className="community-post-copy"><h4>{note.title}</h4>{note.body && <p>{note.body}</p>}<div className="community-post-actions">{onEditPost && (isMaster || Boolean(viewerId && note.authorId === viewerId)) && <button type="button" onClick={() => beginEdit('note', note)}>Editar</button>}{isMaster && onHidePost && <button type="button" disabled={moderatingId === note.id} onClick={() => void hidePost('note', note.id)}>{moderatingId === note.id ? 'Retirando…' : 'Retirar do mural'}</button>}</div></div></article>)}
          </div> : <CommunityEmpty symbol="◇" title="Este espaço está pronto" text={view === 'all' ? 'Quando o mestre compartilhar conteúdo, ele aparecerá aqui.' : 'Ainda não há publicações nesta seção.'} />}
        </div>
        {isMaster && <div className="community-board-footer"><span>Publicações visíveis para a mesa</span><div><button type="button" onClick={() => onManage('media')}>Gerenciar mídias ↗</button><button type="button" onClick={() => onManage('notes')}>Gerenciar textos ↗</button></div></div>}
      </section>

      <section className="community-chat" aria-labelledby="community-chat-title">
        <header className="community-chat-header"><div><span className="community-section-number">02 / CONVERSA</span><h3 id="community-chat-title">Chat da mesa</h3><p>{persisted ? 'Conversa compartilhada com os participantes.' : 'Conversa demonstrativa desta visita.'}</p></div>{onRefresh && <button type="button" className="community-chat-refresh" disabled={refreshing} onClick={() => void refresh()} aria-label="Atualizar conversa" title="Atualizar conversa">{refreshing ? '…' : '↻'}</button>}</header>
        {refreshError && <p className="community-chat-error" role="alert">{refreshError}</p>}
        <div className="community-chat-log" role="log" aria-label="Mensagens da mesa" aria-live="polite" aria-relevant="additions text" ref={logRef} onScroll={event => { const el = event.currentTarget; stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 72 }}>
          {messages.length ? messages.map(item => <article className="community-message" key={item.id}>
            <div className="community-message-avatar" aria-hidden="true">{item.avatarUrl ? <img src={item.avatarUrl} alt="" /> : <span>{initials(item.author)}</span>}</div>
            <div className="community-message-main">
              <div className="community-message-meta"><strong>{item.author}</strong><span>{item.role === 'master' ? 'Mestre' : 'Jogador'}</span><time dateTime={item.createdAt}>{formatMessageTime(item.createdAt)}</time></div>
              {editingId === item.id ? <form className="community-message-edit" onSubmit={editMessage}><label className="sr-only" htmlFor={`edit-${item.id}`}>Editar mensagem</label><textarea id={`edit-${item.id}`} value={editingBody} maxLength={1500} rows={3} onChange={event => setEditingBody(event.target.value)} />{editError && <p className="field-error" role="alert">{editError}</p>}<div><button type="button" onClick={() => { setEditingId(null); setEditError('') }}>Cancelar</button><button type="submit" disabled={!editingBody.trim() || editSaving}>{editSaving ? 'Salvando…' : 'Salvar'}</button></div></form> : <><p className="community-message-body">{item.body}</p><div className="community-message-actions">{item.editedAt && <small>Editada</small>}{onEditMessage && (isMaster || Boolean(viewerId && item.authorId === viewerId)) && <button type="button" onClick={() => { setEditingId(item.id); setEditingBody(item.body); setEditError('') }}>Editar</button>}</div></>}
            </div>
          </article>) : <div className="community-chat-empty"><span aria-hidden="true">“</span><p>A conversa começa aqui.</p><small>{persisted ? 'Envie a primeira mensagem para os participantes da mesa.' : 'Escreva uma mensagem para experimentar o chat.'}</small></div>}
        </div>
        <form className="community-chat-form" onSubmit={send}>
          <label className="sr-only" htmlFor="community-message">Mensagem para a mesa</label>
          <textarea id="community-message" ref={inputRef} value={message} maxLength={1500} rows={2} placeholder="Escreva uma mensagem para a mesa…" aria-describedby="community-chat-hint" onChange={event => { messageRevision.current += 1; setMessage(event.target.value) }} onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              event.currentTarget.form?.requestSubmit()
            }
          }} />
          {sendError && <p className="field-error" role="alert">{sendError}</p>}
          <div className="community-chat-form-footer"><span id="community-chat-hint">Enter envia · Shift + Enter quebra a linha<small>{message.length}/1500</small></span><button className="hub-button hub-button-primary" type="submit" disabled={!message.trim() || sending}>{sending ? 'Enviando…' : 'Enviar'} <span aria-hidden="true">→</span></button></div>
        </form>
      </section>
    </div>
    {image && <Modal open onClose={() => setImage(null)} titleId="community-image-title" className="community-image-modal">
      <h2 id="community-image-title">{image.title}</h2><img src={image.imageDataUrl || image.mediaUrl} alt={image.title} />{image.description && <p>{image.description}</p>}
    </Modal>}
    {postEditor && <Modal open onClose={() => { if (!postSaving) setPostEditor(null) }} titleId="community-post-title" className="community-post-modal">
      <div className="community-post-modal-heading"><span className="community-section-number">MURAL DA MESA</span><h2 id="community-post-title">{postEditor.mode === 'edit' ? 'Editar publicação' : 'Nova publicação'}</h2><p>O grupo verá este conteúdo na Comunidade.</p></div>
      <form className="community-post-form" onSubmit={savePost}>
        {postEditor.mode === 'create' && <fieldset><legend>Formato</legend><div className="community-post-kind"><button type="button" aria-pressed={postEditor.kind === 'note'} onClick={() => setPostEditor({ ...postEditor, kind: 'note', file: null })}>Texto</button><button type="button" aria-pressed={postEditor.kind === 'media'} onClick={() => setPostEditor({ ...postEditor, kind: 'media' })}>Imagem, GIF ou vídeo</button></div></fieldset>}
        <label htmlFor="community-post-title-input">Título</label><input id="community-post-title-input" value={postEditor.title} maxLength={120} onChange={event => setPostEditor({ ...postEditor, title: event.target.value })} required />
        <label htmlFor="community-post-body">Texto ou descrição</label><textarea id="community-post-body" value={postEditor.body} maxLength={5000} rows={5} onChange={event => setPostEditor({ ...postEditor, body: event.target.value })} />
        {categories.length > 0 && <><label htmlFor="community-post-category">Categoria</label><select id="community-post-category" value={postEditor.categoryId ?? ''} onChange={event => setPostEditor({ ...postEditor, categoryId: event.target.value || null })}><option value="">Sem categoria</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></>}
        {postEditor.kind === 'media' && <><label htmlFor="community-post-file">{postEditor.mode === 'edit' ? 'Substituir arquivo (opcional)' : 'Arquivo'}</label><input id="community-post-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm" onChange={event => setPostEditor({ ...postEditor, file: event.target.files?.[0] ?? null })} />{postEditor.file && <small>{postEditor.file.name}</small>}</>}
        {postError && <p className="field-error" role="alert">{postError}</p>}
        <div className="community-post-form-actions"><button type="button" onClick={() => setPostEditor(null)} disabled={postSaving}>Cancelar</button><button type="submit" disabled={postSaving || !postEditor.title.trim() || (postEditor.mode === 'create' && postEditor.kind === 'media' && !postEditor.file)}>{postSaving ? 'Salvando…' : postEditor.mode === 'edit' ? 'Salvar publicação' : 'Publicar'}</button></div>
      </form>
    </Modal>}
  </section>
}

function CommunityMediaPreview({ item, onOpen }: { item: Media; onOpen: () => void }) {
  const source = item.imageDataUrl || item.mediaUrl
  if (item.type === 'video' && source) return <video className="community-post-video" controls preload="metadata" src={source} aria-label={item.title} />
  if (source) return <button className="community-image-open" type="button" aria-label={`Abrir imagem: ${item.title}`} onClick={onOpen}><img src={source} alt={item.title} loading="lazy" /><span aria-hidden="true">Ampliar ↗</span></button>
  if (item.type === 'text') return null
  return <div className="community-image-placeholder" aria-hidden="true">◇</div>
}

function mediaKind(item: Media): string {
  if (item.type === 'video') return 'Vídeo'
  if (item.type === 'gif') return 'GIF'
  if (item.type === 'text') return 'Publicação'
  return 'Imagem'
}

function initials(name: string): string { return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toLocaleUpperCase('pt-BR')).join('') || '?' }
function formatMessageTime(value: string): string { const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }

function CommunityEmpty({ symbol, title, text }: { symbol: string; title: string; text: string }) {
  return <div className="community-empty"><span aria-hidden="true">{symbol}</span><h3>{title}</h3><p>{text}</p></div>
}
