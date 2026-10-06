import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import type { AbilityKind, FormResources, MiraculousDefinition, SheetAbility, SheetItem } from '../sheet-model'
import { itemImageAccept, readItemImage, withoutItemImage } from '../item-images'
import { Modal } from './Modal'

function ItemImage({ item, onChange }: { item: SheetItem; onChange?: (image: string | null) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !onChange) return
    setLoading(true); setError('')
    try {
      const image = await readItemImage(file)
      if (alive.current) onChange(image)
    } catch (cause) {
      if (alive.current) setError(cause instanceof Error ? cause.message : 'Não foi possível abrir a imagem do item.')
    } finally { if (alive.current) setLoading(false) }
  }
  return <div className="sheet-item-image">
    {item.imageDataUrl && <button className="sheet-item-thumbnail" type="button" aria-label={`Ampliar imagem de ${item.name || 'item'}`} onClick={() => setExpanded(true)}><img src={item.imageDataUrl} alt={item.name || 'Imagem do item'} loading="lazy" /></button>}
    {onChange && <div className="sheet-item-image-controls"><label className="sheet-field">Imagem do item<input type="file" accept={itemImageAccept} disabled={loading} onChange={choose} /></label>
      <small>{loading ? 'Preparando imagem…' : 'PNG, JPG ou WebP · até 5 MB · salve a ficha após alterar.'}</small>
      {(item.imageDataUrl || item.imagePath) && <button className="sheet-remove-text" type="button" onClick={() => { onChange(null); setError('') }}>Remover imagem</button>}
      {error && <p className="sheet-item-image-error" role="alert">{error}</p>}
    </div>}
    {expanded && item.imageDataUrl && <Modal open onClose={() => setExpanded(false)} titleId={`item-image-${item.id}`} className="sheet-item-image-modal"><h2 id={`item-image-${item.id}`}>{item.name || 'Imagem do item'}</h2><img src={item.imageDataUrl} alt={item.name || 'Imagem do item'} /></Modal>}
  </div>
}

export function InventoryEntries({ items, onChange, addLabel = '＋ Adicionar item', assignment }: {
  items: SheetItem[]
  onChange?: (items: SheetItem[]) => void
  addLabel?: string
  assignment?: (item: SheetItem) => ReactNode
}) {
  const latest = useRef({ items, onChange })
  latest.current = { items, onChange }
  function changeImage(id: string, image: string | null) {
    const current = latest.current
    if (!current.items.some(item => item.id === id)) return
    current.onChange?.(current.items.map(item => item.id !== id ? item : image ? { ...item, imageDataUrl: image } : withoutItemImage(item)))
  }
  return <>
    {items.map(item => onChange ? <div className="sheet-entry" key={item.id}>
      {assignment?.(item)}
      <label className="sheet-field">Item<input value={item.name} maxLength={80} placeholder="Nome do item" onChange={event => onChange(items.map(entry => entry.id === item.id ? { ...entry, name: event.target.value } : entry))} /></label>
      <ItemImage item={item} onChange={image => changeImage(item.id, image)} />
      <label className="sheet-field">Detalhes<textarea value={item.notes} maxLength={500} placeholder="Dano, alcance ou observações" onChange={event => onChange(items.map(entry => entry.id === item.id ? { ...entry, notes: event.target.value } : entry))} /></label>
      <button className="sheet-remove-text" type="button" onClick={() => onChange(items.filter(entry => entry.id !== item.id))}>Remover item</button>
    </div> : <article className="sheet-resource-card" key={item.id}><h4>{item.name || 'Item sem nome'}</h4><ItemImage item={item} />{item.notes && <p>{item.notes}</p>}</article>)}
    {onChange && <button className="hub-button sheet-add" type="button" onClick={() => onChange([...items, { id: crypto.randomUUID(), name: '', notes: '' }])}>{addLabel}</button>}
  </>
}

export function AbilityEntries({ abilities, onChange, addLabel = '＋ Adicionar habilidade', assignment }: {
  abilities: SheetAbility[]
  onChange?: (abilities: SheetAbility[]) => void
  addLabel?: string
  assignment?: (ability: SheetAbility) => ReactNode
}) {
  return <>
    {abilities.map(ability => onChange ? <div className="sheet-entry" key={ability.id}>
      {assignment?.(ability)}
      <label className="sheet-field">Tipo<select value={ability.kind} onChange={event => onChange(abilities.map(entry => entry.id === ability.id ? { ...entry, kind: event.target.value as AbilityKind } : entry))}><option>Passiva</option><option>Técnica</option><option>Miraculous</option></select></label>
      <label className="sheet-field">Nome<input value={ability.name} maxLength={80} onChange={event => onChange(abilities.map(entry => entry.id === ability.id ? { ...entry, name: event.target.value } : entry))} /></label>
      <label className="sheet-field">Descrição<textarea value={ability.description} maxLength={1200} onChange={event => onChange(abilities.map(entry => entry.id === ability.id ? { ...entry, description: event.target.value } : entry))} /></label>
      <button className="sheet-remove-text" type="button" onClick={() => onChange(abilities.filter(entry => entry.id !== ability.id))}>Remover habilidade</button>
    </div> : <article className="sheet-resource-card" key={ability.id}><small>{ability.kind}</small><h4>{ability.name || 'Habilidade sem nome'}</h4>{ability.description && <p>{ability.description}</p>}</article>)}
    {onChange && <button className="hub-button sheet-add" type="button" onClick={() => onChange([...abilities, { id: crypto.randomUUID(), kind: 'Técnica', name: '', description: '' }])}>{addLabel}</button>}
  </>
}

export function FormResourcesEditor({ forms, formId, resources, onFormChange, onInventoryChange, onAbilitiesChange, inventoryAssignment, abilityAssignment, onClose }: {
  forms: MiraculousDefinition[]
  formId: string
  resources: FormResources
  onFormChange: (id: string) => void
  onInventoryChange: (items: SheetItem[]) => void
  onAbilitiesChange: (abilities: SheetAbility[]) => void
  inventoryAssignment: (item: SheetItem) => ReactNode
  abilityAssignment: (ability: SheetAbility) => ReactNode
  onClose: () => void
}) {
  const name = forms.find(form => form.id === formId)?.name ?? 'Miraculous'
  return <Modal open onClose={onClose} titleId="sheet-form-box-title" className="sheet-grant-modal sheet-form-modal">
    <div className="sheet-panel">
      <p className="home-overline">CONFIGURAÇÃO DO MESTRE</p><h2 id="sheet-form-box-title">Caixa do Miraculous</h2>
      <label className="sheet-field">Miraculous<select value={formId} onChange={event => onFormChange(event.target.value)}>{forms.map(form => <option key={form.id} value={form.id}>{form.name}</option>)}</select></label>
      <p className="sheet-panel-help">Estes recursos aparecem somente na forma de {name}. O inventário civil continua separado.</p>
      <section className="sheet-resource-group" aria-label={`Itens de ${name}`}><h3>Itens de {name}</h3>
        {!resources.inventory.length && <p className="sheet-panel-help">Nenhum item exclusivo desta forma.</p>}
        <InventoryEntries key={formId} items={resources.inventory} onChange={onInventoryChange} addLabel="＋ Adicionar item ao Miraculous" assignment={inventoryAssignment} />
      </section>
      <section className="sheet-resource-group" aria-label={`Habilidades de ${name}`}><h3>Habilidades de {name}</h3>
        {!resources.abilities.length && <p className="sheet-panel-help">Nenhuma habilidade exclusiva desta forma.</p>}
        <AbilityEntries abilities={resources.abilities} onChange={onAbilitiesChange} addLabel="＋ Adicionar habilidade ao Miraculous" assignment={abilityAssignment} />
      </section>
      <p className="sheet-panel-help">Conclua a edição e clique em Salvar ficha para guardar as alterações.</p>
      <button type="button" className="hub-button hub-button-primary sheet-add" onClick={onClose}>Concluir edição</button>
    </div>
  </Modal>
}
