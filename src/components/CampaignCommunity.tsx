import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { communityContent, type CampaignMedia, type CampaignWorkspace } from '../campaign-model'
import { Modal } from './Modal'
import '../community.css'

interface Props {
  workspace: CampaignWorkspace
  isMaster: boolean
  onManage: (area: 'media' | 'notes') => void
  onSend: (body: string) => void | Promise<void>
  persisted?: boolean
}

export function CampaignCommunity({ workspace, isMaster, onManage, onSend, persisted = false }: Props) {
  const [view, setView] = useState<'media' | 'notes'>('media')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [image, setImage] = useState<CampaignMedia | null>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messageRevision = useRef(0)
  const { media, notes } = communityContent(workspace)
  const lastMessageId = workspace.messages.at(-1)?.id

  useEffect(() => {
    const log = logRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [lastMessageId])

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
      inputRef.current?.focus({ preventScroll: true })
    } catch (cause) {
      setSendError(cause instanceof Error ? cause.message : 'Não foi possível enviar a mensagem.')
    } finally { setSending(false) }
  }

  return <section className="campaign-community" aria-labelledby="community-title">
    <header className="community-heading">
      <div><p className="home-overline">ESPAÇO DA MESA</p><h2 id="community-title">Comunidade</h2><p>Imagens, anotações e conversas da sua campanha.</p></div>
      <span className="community-preview-badge">{persisted ? 'MESA' : 'PRÉVIA'}</span>
    </header>
    <div className="community-layout">
      <section className="community-board" aria-label="Mural da campanha">
        <div className="community-board-header">
          <div className="community-filters" role="group" aria-label="Conteúdo do mural">
            <button type="button" aria-pressed={view === 'media'} aria-controls="community-board-content" onClick={() => setView('media')}>Imagens <span>{media.length}</span></button>
            <button type="button" aria-pressed={view === 'notes'} aria-controls="community-board-content" onClick={() => setView('notes')}>Anotações <span>{notes.length}</span></button>
          </div>
          {isMaster && <button type="button" className="community-manage" onClick={() => onManage(view)}>Gerenciar {view === 'media' ? 'imagens' : 'anotações'} ↗</button>}
        </div>
        <div className="community-board-content" id="community-board-content">
          {view === 'media' ? media.length ? <div className="community-image-grid">
            {media.map(item => <article className="community-image-card" key={item.id}>
              {item.imageDataUrl ? <button className="community-image-open" type="button" aria-label={`Abrir imagem: ${item.title}`} onClick={() => setImage(item)}><img src={item.imageDataUrl} alt={item.title} /><span aria-hidden="true">Ampliar ↗</span></button> : <div className="community-image-placeholder" aria-hidden="true">◇</div>}
              <div><h3>{item.title}</h3>{item.subtitle && <p className="community-image-subtitle">{item.subtitle}</p>}{item.description && <p>{item.description}</p>}</div>
            </article>)}
          </div> : <CommunityEmpty symbol="▧" title="Um espaço para ver a história" text="As imagens que o mestre disponibilizar aparecerão aqui." />
          : notes.length ? <div className="community-notes">
            {notes.map(note => <article className="community-note" key={note.id}><span className="community-note-mark" aria-hidden="true">≡</span><div><h3>{note.title}</h3>{note.body && <p>{note.body}</p>}</div></article>)}
          </div> : <CommunityEmpty symbol="≡" title="As anotações da mesa" text="As anotações que o mestre tornar visíveis aparecerão aqui." />}
        </div>
        <p className="community-board-footer">Conteúdos disponibilizados pelo mestre para os jogadores.</p>
      </section>

      <section className="community-chat" aria-labelledby="community-chat-title">
        <header className="community-chat-header"><span aria-hidden="true">◌</span><div><h3 id="community-chat-title">Chat da mesa</h3><p>Um lugar para conversar.</p></div></header>
        <p className="community-chat-preview" id="community-chat-preview">{persisted ? 'Mensagens salvas para os participantes desta mesa.' : 'Nesta prévia, só você vê as mensagens. Elas desaparecem ao recarregar.'}</p>
        <div className="community-chat-log" role="log" aria-label="Mensagens da mesa" aria-live="polite" aria-relevant="additions" ref={logRef}>
          {workspace.messages.length ? workspace.messages.map(item => <article className="community-message" key={item.id}>
            <div className="community-message-meta"><strong>{item.author}</strong><span>{item.role === 'master' ? 'Mestre' : 'Jogador'}</span><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time></div>
            <p>{item.body}</p>
          </article>) : <div className="community-chat-empty"><span aria-hidden="true">“</span><p>A conversa começa aqui.</p><small>{persisted ? 'Envie a primeira mensagem para os participantes da mesa.' : 'Escreva uma mensagem para experimentar o chat.'}</small></div>}
        </div>
        <form className="community-chat-form" onSubmit={send}>
          <label className="sr-only" htmlFor="community-message">Mensagem para a mesa</label>
          <textarea id="community-message" ref={inputRef} value={message} maxLength={1500} rows={2} placeholder="Escreva uma mensagem…" aria-describedby="community-chat-preview community-chat-hint" onChange={event => { messageRevision.current += 1; setMessage(event.target.value) }} onKeyDown={event => {
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
      <h2 id="community-image-title">{image.title}</h2><img src={image.imageDataUrl} alt={image.title} />{image.description && <p>{image.description}</p>}
    </Modal>}
  </section>
}

function CommunityEmpty({ symbol, title, text }: { symbol: string; title: string; text: string }) {
  return <div className="community-empty"><span aria-hidden="true">{symbol}</span><h3>{title}</h3><p>{text}</p></div>
}
