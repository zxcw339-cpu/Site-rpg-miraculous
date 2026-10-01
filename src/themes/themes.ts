export type ThemeSymbol = 'diamond' | 'star' | 'bloom' | 'spider' | 'wings'

export interface ThemeDefinition {
  id: string
  name: string
  description: string
  symbol: ThemeSymbol
  atmosphere: 'threads' | 'lanterns' | 'feathers'
  colors: Record<`--${string}`, string>
}

// Aparências em desenvolvimento a partir das referências visuais.
// Símbolos e paletas podem ser substituídos pelos materiais definitivos.
export const previewThemes: readonly ThemeDefinition[] = [
  {
    id: 'preview-wine',
    name: 'Aranha',
    description: 'Grafite, prata e detalhes em vinho.',
    symbol: 'spider',
    atmosphere: 'threads',
    colors: {
      '--accent': '#85384f',
      '--accent-hover': '#98425e',
      '--accent-bright': '#e4a1b5',
      '--accent-soft': 'rgba(164, 73, 101, 0.16)',
      '--ambient': 'rgba(128, 42, 69, 0.13)',
      '--ornament': '#83727a',
      '--button-text': '#ffffff',
      '--panel-glow': 'rgba(164, 73, 101, 0.08)',
      '--hub-surface': '#30232950',
      '--hub-surface-hover': '#43283342',
      '--hub-art-glow': '#8146592b',
      '--hub-border': '#86777a57',
      '--hub-border-hover': '#b9869a',
      '--hub-ink': '#bc9da4',
      '--hub-ink-muted': '#ae919b',
    },
  },
  {
    id: 'preview-kitsune',
    name: 'Kitsune',
    description: 'Grafite, vermelho profundo e lanternas em dourado suave.',
    symbol: 'bloom',
    atmosphere: 'lanterns',
    colors: {
      '--accent': '#822e2b',
      '--accent-hover': '#a13d34',
      '--accent-bright': '#d6b17c',
      '--accent-soft': 'rgba(171, 91, 54, 0.14)',
      '--ambient': 'rgba(108, 41, 31, 0.17)',
      '--ornament': '#b99a70',
      '--button-text': '#ffffff',
      '--panel-glow': 'rgba(183, 128, 73, 0.06)',
      '--hub-surface': '#382c1f50',
      '--hub-surface-hover': '#58402742',
      '--hub-art-glow': '#bc88342b',
      '--hub-border': '#b3936257',
      '--hub-border-hover': '#cfab74',
      '--hub-ink': '#d0b28a',
      '--hub-ink-muted': '#b49b78',
    },
  },
  {
    id: 'preview-valquiria',
    name: 'Valquíria',
    description: 'Prata, branco de plumas e detalhes em ouro envelhecido.',
    symbol: 'wings',
    atmosphere: 'feathers',
    colors: {
      '--accent': '#c4cbd0',
      '--accent-hover': '#e3e7e9',
      '--accent-bright': '#e0e5e8',
      '--accent-soft': 'rgba(193, 203, 212, 0.11)',
      '--ambient': 'rgba(140, 160, 179, 0.10)',
      '--ornament': '#b09a6b',
      '--button-text': '#171a1f',
      '--panel-glow': 'rgba(188, 203, 218, 0.06)',
      '--hub-surface': '#aab9c514',
      '--hub-surface-hover': '#c3ccd41a',
      '--hub-art-glow': '#c0d1de20',
      '--hub-border': '#aebac34a',
      '--hub-border-hover': '#b5a078',
      '--hub-ink': '#d2dae0',
      '--hub-ink-muted': '#a8b2bc',
    },
  },
]

export const defaultTheme = previewThemes[0]!
export const themeStorageKey = 'miraculous.theme'

// Ao receber os 18 temas definitivos, preencher cada espaço com a definição
// fornecida. O seletor e a recuperação de preferência usam o mesmo catálogo.
export type MiraculousSlotId = `miraculous-${string}`
export const miraculousThemes: Partial<Record<MiraculousSlotId, ThemeDefinition>> = {}

export const futureMiraculousSlots: readonly {
  readonly id: MiraculousSlotId
  readonly theme: ThemeDefinition | null
}[] = Array.from({ length: 18 }, (_, index) => {
  const id: MiraculousSlotId = `miraculous-${String(index + 1).padStart(2, '0')}`
  return { id, theme: miraculousThemes[id] ?? null }
})

// As aparências em estudo ocupam provisoriamente espaços centrais da caixa.
// Uma definição definitiva substituirá o estudo sem alterar a navegação.
export const themeSlots = futureMiraculousSlots.map((slot, index) => ({
  ...slot,
  theme: slot.theme ?? previewThemes[index - 7] ?? null,
}))

export const availableThemes = themeSlots.flatMap(slot => slot.theme ? [slot.theme] : [])

export function getTheme(id: string | null): ThemeDefinition {
  return availableThemes.find(theme => theme.id === id) ?? defaultTheme
}
