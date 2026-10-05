import type { CampaignMedia, MediaAttachment } from './campaign-model.ts'

export const maxPostAttachments = 8
export const mediaAccept = 'image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm'
export function attachmentIssue(files: readonly { type: string; size: number }[], existing = 0): string | null {
  if (files.length + existing > maxPostAttachments) return `Cada publicação aceita até ${maxPostAttachments} arquivos.`
  if (files.some(file => !mediaAccept.split(',').includes(file.type) || file.size > (file.type.startsWith('video/') ? 20_000_000 : 5_000_000)))
    return 'Use PNG, JPG, WebP ou GIF até 5 MB; MP4 ou WebM até 20 MB por arquivo.'
  return null
}
export function mediaAttachments(item: CampaignMedia): MediaAttachment[] {
  if (item.attachments) return item.attachments
  const url = item.mediaUrl || item.imageDataUrl
  return url || item.mediaPath ? [{ id: item.id, name: item.title, type: item.type === 'video' ? 'video' : item.type === 'gif' ? 'gif' : 'image', url, path: item.mediaPath }] : []
}
export function readMediaDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Não foi possível abrir o arquivo.'))
    reader.onerror = () => reject(new Error('Não foi possível abrir o arquivo.'))
    reader.readAsDataURL(file)
  })
}
