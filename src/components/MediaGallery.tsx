import type { CampaignMedia, MediaAttachment } from '../campaign-model'
import { mediaAttachments } from '../media-model'

export function MediaGallery({ item, onZoom }: { item: CampaignMedia; onZoom?: (attachment: MediaAttachment) => void }) {
  const attachments = mediaAttachments(item)
  if (!attachments.length) return <div className="community-media-placeholder" aria-hidden="true">◇</div>
  return <div className={`media-gallery ${attachments.length > 1 ? 'media-gallery-multiple' : ''}`}>
    {attachments.map(attachment => attachment.type === 'video'
      ? <video key={attachment.id} src={attachment.url} controls playsInline preload="metadata" aria-label={attachment.name || item.title} />
      : <button key={attachment.id} type="button" className="community-media-image" onClick={() => onZoom ? onZoom(attachment) : window.open(attachment.url, '_blank', 'noopener,noreferrer')} aria-label={`Ampliar ${attachment.name || item.title}`}><img src={attachment.url} alt={attachment.name || item.title} loading="lazy" /></button>)}
  </div>
}
