import { availableForms } from './sheet-model.ts'
import type { MiraculousDefinition } from './sheet-model.ts'

export interface MiraculousRules {
  customForms: MiraculousDefinition[]
  disabledFormIds: string[]
  sheetDisabledFormIds: Record<string, string[]>
}
export function emptyMiraculousRules(): MiraculousRules {
  return { customForms: [], disabledFormIds: [], sheetDisabledFormIds: {} }
}
export function normalizeMiraculousRules(input?: Partial<MiraculousRules>): MiraculousRules {
  const ids = new Set<string>(availableForms.map(form => form.id))
  const customForms = (Array.isArray(input?.customForms) ? input.customForms : []).filter(form => {
    if (!form || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(form.id) || form.id === 'civil' || ids.has(form.id) || !form.name?.trim()) return false
    ids.add(form.id)
    return true
  }).map(form => ({ id: form.id, name: form.name.trim().slice(0, 80), concept: (form.concept ?? '').slice(0, 120), themeId: form.themeId }))
  const cleanIds = (values: unknown): string[] => Array.isArray(values) ? [...new Set(values.filter((id): id is string => typeof id === 'string' && ids.has(id)))] : []
  const sheetDisabledFormIds = Object.fromEntries(Object.entries(input?.sheetDisabledFormIds ?? {}).map(([id, values]) => [id, cleanIds(values)]))
  return { customForms, disabledFormIds: cleanIds(input?.disabledFormIds), sheetDisabledFormIds }
}
export function miraculousCatalog(rules?: Partial<MiraculousRules>): MiraculousDefinition[] {
  return [...availableForms, ...normalizeMiraculousRules(rules).customForms]
}
export function allowedMiraculous(rules?: Partial<MiraculousRules>, sheetId?: string): MiraculousDefinition[] {
  const normalized = normalizeMiraculousRules(rules)
  const blocked = new Set([...normalized.disabledFormIds, ...(sheetId ? normalized.sheetDisabledFormIds[sheetId] ?? [] : [])])
  return miraculousCatalog(normalized).filter(form => !blocked.has(form.id))
}
