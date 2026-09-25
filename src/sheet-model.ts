export const resourceNames = ['Vida', 'Sanidade', 'Energia', 'Proteção'] as const
export const attributeNames = ['Força', 'Vigor', 'Agilidade', 'Intelecto', 'Presença'] as const
export const baseSkillNames = [
  'Luta', 'Pontaria', 'Atletismo', 'Furtividade', 'Percepção', 'Investigação',
  'Intuição', 'Persuasão', 'Enganação', 'Intimidação', 'Vontade', 'Sobrevivência',
  'Conhecimento', 'Ofício',
] as const

// Names and concepts supplied by the project owner. IDs for the two existing
// forms remain stable so previously configured grants are retained.
export const availableForms = [
  { id: 'pegaso', name: 'Pégaso', concept: 'A Ascensão' },
  { id: 'fenix', name: 'Fênix', concept: 'A Renovação' },
  { id: 'strix', name: 'Strix', concept: 'O Pânico' },
  { id: 'jormungandr', name: 'Jörmungandr', concept: 'A Contenção' },
  { id: 'hidra', name: 'Hidra', concept: 'A Adaptação' },
  { id: 'minotauro', name: 'Minotauro', concept: 'A Invasão' },
  { id: 'fenrir', name: 'Fenrir', concept: 'A Superação' },
  { id: 'aranha', name: 'Aracne', concept: 'A Intenção' },
  { id: 'valquiria', name: 'Valquíria', concept: 'O Sacrifício' },
  { id: 'sereia', name: 'Sereia', concept: 'A Atração' },
  { id: 'kraken', name: 'Kraken', concept: 'O Vazio' },
  { id: 'gargula', name: 'Gárgula', concept: 'A Estabilidade' },
  { id: 'qilin', name: 'Qilin', concept: 'A Purificação' },
  { id: 'corvos-de-odin', name: 'Corvos de Odin', concept: 'A Memória' },
  { id: 'cerbero', name: 'Cérbero', concept: 'A Restrição' },
  { id: 'esfinge', name: 'Esfinge', concept: 'A Verdade' },
  { id: 'grifo', name: 'Grifo', concept: 'O Julgamento' },
  { id: 'kitsune', name: 'Kitsune', concept: 'A Persuasão' },
  { id: 'morcego', name: 'Morcego', concept: 'As Sombras' },
] as const

export type ResourceName = typeof resourceNames[number]
export type AttributeName = typeof attributeNames[number]
export type AbilityKind = 'Passiva' | 'Técnica' | 'Miraculous'
export type FormId = typeof availableForms[number]['id']
export type SheetForm = 'civil' | FormId
export interface SheetRoll { dice: number[]; bonus: number; total: number }
type Amount = number | null

export interface FormGrants {
  id: FormId
  attributes: Partial<Record<AttributeName, number>>
  skills: Record<string, number> // Keyed by stable skill id, not its editable name.
}

export interface SheetDetails {
  gender: string
  age: string
  height: string
  portraitDataUrl?: string
  portraitPath?: string
  appearance: string
  appearanceImages: { id: string; name: string; dataUrl: string; path?: string }[]
  lore: string
  resources: Record<ResourceName, { current: Amount; max: Amount }>
  attributes: Record<AttributeName, { civil: Amount }>
  skills: { id: string; name: string; civil: Amount }[]
  forms: FormGrants[]
  inventory: { id: string; name: string; notes: string }[]
  abilities: { id: string; kind: AbilityKind; name: string; description: string }[]
  notes: string
}

export function emptySheetDetails(): SheetDetails {
  return {
    gender: '', age: '', height: '', appearance: '', appearanceImages: [], lore: '',
    resources: Object.fromEntries(resourceNames.map(name => [name, { current: null, max: null }])) as SheetDetails['resources'],
    attributes: Object.fromEntries(attributeNames.map(name => [name, { civil: null }])) as SheetDetails['attributes'],
    skills: baseSkillNames.map(name => ({ id: crypto.randomUUID(), name, civil: null })),
    forms: availableForms.map(form => ({ id: form.id, attributes: {}, skills: {} })),
    inventory: [], abilities: [], notes: '',
  }
}

// Also accepts sheets created by an older in-memory preview while Vite refreshes.
export function normalizeSheetDetails(input?: Partial<SheetDetails>): SheetDetails {
  const empty = emptySheetDetails()
  if (!input) return empty
  return {
    ...empty, ...input,
    age: input.age ?? '', height: input.height ?? '',
    appearance: input.appearance ?? '', appearanceImages: input.appearanceImages ?? [], lore: input.lore ?? '',
    attributes: Object.fromEntries(attributeNames.map(name => [name, { civil: input.attributes?.[name]?.civil ?? null }])) as SheetDetails['attributes'],
    skills: (input.skills ?? empty.skills).map(skill => ({ id: skill.id, name: skill.name, civil: skill.civil ?? null })),
    forms: availableForms.map(form => input.forms?.find(entry => entry.id === form.id) ?? { id: form.id, attributes: {}, skills: {} }),
  }
}

export function parseAmount(value: string): number | null {
  if (value === '') return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null
}

export function formGrant(details: SheetDetails, formId: FormId, kind: 'attribute' | 'skill', key: string): number {
  const form = details.forms.find(item => item.id === formId)
  if (!form) return 0
  return kind === 'attribute' ? (form.attributes[key as AttributeName] ?? 0) : (form.skills[key] ?? 0)
}

export function effectiveValue(base: Amount, bonus: number): Amount {
  return base === null ? null : base + bonus
}

export function rollDicePool(count: number, bonus = 0, random = Math.random): SheetRoll {
  if (!Number.isSafeInteger(count) || count < 1 || count > 30) throw new Error('Use de 1 a 30 dados por rolagem.')
  if (!Number.isSafeInteger(bonus) || bonus < 0) throw new Error('O bônus da rolagem precisa ser um inteiro a partir de zero.')
  const dice = Array.from({ length: count }, () => Math.floor(random() * 20) + 1)
  return { dice, bonus, total: Math.max(...dice) + bonus }
}

export function rollSheetTest(details: SheetDetails, form: SheetForm, attribute: AttributeName, skillId = '', random = Math.random): SheetRoll {
  const attributeBonus = form === 'civil' ? 0 : formGrant(details, form, 'attribute', attribute)
  const count = effectiveValue(details.attributes[attribute].civil, attributeBonus)
  if (!count) throw new Error(`Preencha ${attribute} com pelo menos 1 dado para rolar.`)
  const skill = details.skills.find(item => item.id === skillId)
  const skillBonus = skill ? effectiveValue(skill.civil, form === 'civil' ? 0 : formGrant(details, form, 'skill', skill.id)) ?? 0 : 0
  if (skillBonus % 5 !== 0) throw new Error('O bônus da perícia deve ser um múltiplo de 5.')
  return rollDicePool(count, skillBonus, random)
}

export function validateSheetDetails(details: SheetDetails): string | null {
  for (const name of resourceNames) {
    const { current, max } = details.resources[name]
    if ((current !== null && (!Number.isSafeInteger(current) || current < 0)) ||
        (max !== null && (!Number.isSafeInteger(max) || max < 0))) return `${name}: use números inteiros a partir de zero.`
    if (current !== null && max !== null && current > max) return `${name}: o valor atual não pode superar o máximo.`
  }
  for (const name of attributeNames) {
    const value = details.attributes[name].civil
    if (value !== null && (!Number.isSafeInteger(value) || value < 0)) return `${name}: use um número inteiro de dados.`
  }
  for (const skill of details.skills) {
    if (!skill.name.trim()) return 'Dê um nome para cada perícia.'
    if (skill.civil !== null && (!Number.isSafeInteger(skill.civil) || skill.civil < 0 || skill.civil % 5 !== 0))
      return `${skill.name}: os bônus sobem de 5 em 5.`
  }
  for (const form of details.forms) {
    for (const bonus of Object.values(form.attributes)) {
      if (!Number.isSafeInteger(bonus) || bonus < 0) return 'Bônus de atributo da transformação: use dados inteiros.'
    }
    for (const bonus of Object.values(form.skills)) {
      if (!Number.isSafeInteger(bonus) || bonus < 0 || bonus % 5 !== 0) return 'Bônus de perícia da transformação: use passos de 5.'
    }
  }
  return null
}
