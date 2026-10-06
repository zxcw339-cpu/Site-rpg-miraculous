import type { SheetDetails, SheetItem } from './sheet-model'

export const itemImageAccept = 'image/png,image/jpeg,image/webp'
const extensions: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }

export function itemImageIssue(file: Pick<Blob, 'type' | 'size'>): string | null {
  return !extensions[file.type] || !file.size || file.size > 5 * 1048576 ? 'Use PNG, JPG ou WebP de até 5 MB.' : null
}

export function readItemImage(file: File): Promise<string> {
  const issue = itemImageIssue(file)
  if (issue) return Promise.reject(new Error(issue))
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Não foi possível abrir a imagem do item.'))
    reader.onerror = () => reject(new Error('Não foi possível abrir a imagem do item.'))
    reader.readAsDataURL(file)
  })
}

export function itemImagePaths(details: SheetDetails): string[] {
  return [...details.inventory, ...details.forms.flatMap(form => form.inventory ?? [])]
    .flatMap(item => item.imagePath ? [item.imagePath] : [])
}

export function hydrateItemImages(details: SheetDetails, urls: Map<string, string>): SheetDetails {
  const hydrate = (items: SheetItem[]) => items.map(item => ({ ...item,
    imageDataUrl: item.imagePath ? urls.get(item.imagePath) : item.imageDataUrl }))
  return { ...details, inventory: hydrate(details.inventory),
    forms: details.forms.map(form => ({ ...form, inventory: hydrate(form.inventory ?? []) })) }
}

// The enclosing save owns rollback: append every successful upload immediately.
export async function persistItemImages(items: SheetItem[], prefix: string,
  upload: (path: string, image: Blob) => Promise<void>, uploaded: string[]): Promise<SheetItem[]> {
  const result: SheetItem[] = []
  for (const entry of items) {
    const item = { ...entry }
    if (item.imageDataUrl?.startsWith('data:')) {
      if (!/^data:image\/(png|jpeg|webp);base64,/i.test(item.imageDataUrl)) throw new Error('Use PNG, JPG ou WebP de até 5 MB.')
      const image = await (await fetch(item.imageDataUrl)).blob()
      const issue = itemImageIssue(image)
      if (issue) throw new Error(issue)
      const path = `${prefix}/items/${crypto.randomUUID()}.${extensions[image.type]}`
      await upload(path, image)
      uploaded.push(path)
      item.imagePath = path
    }
    delete item.imageDataUrl
    if (item.imagePath && !item.imagePath.startsWith(`${prefix}/`)) throw new Error('Uma imagem do item não pertence a esta ficha.')
    result.push(item)
  }
  return result
}

export function withoutItemImage(item: SheetItem): SheetItem {
  const { imageDataUrl: _preview, imagePath: _path, ...plain } = item
  return plain
}
