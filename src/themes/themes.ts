export type ThemeSymbol = 'diamond' | 'star' | 'bloom' | 'spider' | 'wings' | 'raven' | 'cerberus' | 'owl' | 'kraken' | 'phoenix'

export interface ThemeDefinition {
  id: string
  name: string
  description: string
  symbol: ThemeSymbol
  atmosphere: 'threads' | 'lanterns' | 'feathers' | 'runes' | 'chains' | 'night' | 'abyss' | 'embers' | 'sigil'
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
  {
    id: 'preview-corvo',
    name: 'Corvo de Odin',
    description: 'Carvão, prata e roxo discreto, com uma casa nórdica e poucas runas.',
    symbol: 'raven',
    atmosphere: 'runes',
    colors: {
      '--accent': '#655477',
      '--accent-hover': '#7b6590',
      '--accent-bright': '#c5b3d6',
      '--accent-soft': 'rgba(158, 130, 188, 0.13)',
      '--ambient': 'rgba(104, 77, 134, 0.12)',
      '--ornament': '#a9a8b9',
      '--button-text': '#ffffff',
      '--panel-glow': 'rgba(148, 123, 178, 0.07)',
      '--hub-surface': '#82728f18',
      '--hub-surface-hover': '#9a83b322',
      '--hub-art-glow': '#a28abb20',
      '--hub-border': '#a69ab64a',
      '--hub-border-hover': '#b3a0c6',
      '--hub-ink': '#c7bed1',
      '--hub-ink-muted': '#aba1b8',
    },
  },
  {
    id: 'preview-cerbero',
    name: 'Cérbero',
    description: 'Grafite e bronze, com a caixa de Pandora selada ao fundo.',
    symbol: 'cerberus',
    atmosphere: 'chains',
    colors: {
      '--accent': '#78483b',
      '--accent-hover': '#965b46',
      '--accent-bright': '#d5ad89',
      '--accent-soft': 'rgba(170, 103, 66, 0.14)',
      '--ambient': 'rgba(113, 53, 32, 0.13)',
      '--ornament': '#ad8c71',
      '--button-text': '#ffffff',
      '--panel-glow': 'rgba(172, 107, 69, 0.07)',
      '--hub-surface': '#80604c18',
      '--hub-surface-hover': '#ab785224',
      '--hub-art-glow': '#cb895420',
      '--hub-border': '#ab8b704a',
      '--hub-border-hover': '#cba581',
      '--hub-ink': '#d1b89f',
      '--hub-ink-muted': '#ae9785',
    },
  },
  {
    id: 'preview-strix',
    name: 'Strix (Coruja)',
    description: 'Azul de noite, prata fria e olhos âmbar entre penas escuras.',
    symbol: 'owl',
    atmosphere: 'night',
    colors: {
      '--accent': '#4c607b',
      '--accent-hover': '#637997',
      '--accent-bright': '#b7c7dc',
      '--accent-soft': 'rgba(132, 157, 193, 0.13)',
      '--ambient': 'rgba(48, 73, 111, 0.14)',
      '--ornament': '#99a8bd',
      '--button-text': '#ffffff',
      '--panel-glow': 'rgba(132, 157, 193, 0.06)',
      '--hub-surface': '#6882a018',
      '--hub-surface-hover': '#88a0be22',
      '--hub-art-glow': '#8cacc920',
      '--hub-border': '#97a8c04a',
      '--hub-border-hover': '#b7c7dc',
      '--hub-ink': '#bdc9db',
      '--hub-ink-muted': '#9baac0',
    },
  },
  {
    id: 'preview-kraken',
    name: 'Kraken',
    description: 'Azul abissal, prata e tentáculos com luzes suaves nas profundezas.',
    symbol: 'kraken',
    atmosphere: 'abyss',
    colors: {
      '--accent': '#32616f',
      '--accent-hover': '#468391',
      '--accent-bright': '#a0d1d7',
      '--accent-soft': 'rgba(110, 171, 184, 0.13)',
      '--ambient': 'rgba(28, 74, 92, 0.15)',
      '--ornament': '#8eafba',
      '--button-text': '#ffffff',
      '--panel-glow': 'rgba(110, 171, 184, 0.06)',
      '--hub-surface': '#578ca018',
      '--hub-surface-hover': '#70a9b722',
      '--hub-art-glow': '#73bdc820',
      '--hub-border': '#89b2bf4a',
      '--hub-border-hover': '#a0d1d7',
      '--hub-ink': '#b6d3db',
      '--hub-ink-muted': '#8daab8',
    },
  },
  {
    id: 'preview-fenix',
    name: 'Fênix',
    description: 'Carvão, cobre e dourado, com asas luminosas e brasas em ascensão.',
    symbol: 'phoenix',
    atmosphere: 'embers',
    colors: {
      '--accent': '#975f3b',
      '--accent-hover': '#b7794b',
      '--accent-bright': '#e1ba87',
      '--accent-soft': 'rgba(192, 136, 79, 0.13)',
      '--ambient': 'rgba(128, 64, 30, 0.14)',
      '--ornament': '#bfa17d',
      '--button-text': '#ffffff',
      '--panel-glow': 'rgba(192, 136, 79, 0.06)',
      '--hub-surface': '#a77d5118',
      '--hub-surface-hover': '#c0905d22',
      '--hub-art-glow': '#daa05c20',
      '--hub-border': '#c5a17a4a',
      '--hub-border-hover': '#e1ba87',
      '--hub-ink': '#dfc39e',
      '--hub-ink-muted': '#b9a084',
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

const formThemeIds: Record<string, string> = {
  aranha: 'preview-wine', kitsune: 'preview-kitsune', valquiria: 'preview-valquiria',
  'corvos-de-odin': 'preview-corvo', cerbero: 'preview-cerbero', strix: 'preview-strix', kraken: 'preview-kraken', fenix: 'preview-fenix',
}
const formColors: Record<string, [string, string]> = {
  pegaso: ['#617b9b', '#c5d7ef'], jormungandr: ['#4a7567', '#abd4bc'], hidra: ['#66773d', '#c4d796'],
  minotauro: ['#805242', '#d4ac8b'], fenrir: ['#536b83', '#bbcbdc'], sereia: ['#427f85', '#a5d8d9'],
  gargula: ['#6c7279', '#c6c8cb'], qilin: ['#5f846b', '#c6dfc7'], esfinge: ['#9a794c', '#dfc8a2'],
  grifo: ['#927446', '#dfc18c'], morcego: ['#695180', '#bda4d5'],
}
// Forms without finished artwork receive a quiet palette, keeping the sheet readable.
export function getFormTheme(form: { id: string; name: string; concept: string; themeId?: string }): ThemeDefinition {
  const existing = availableThemes.find(theme => theme.id === (form.themeId || formThemeIds[form.id]))
  if (existing) return existing
  const [accent, bright] = formColors[form.id] ?? ['#717084', '#d0cadb']
  return { ...defaultTheme, id: `form-${form.id}`, name: form.name, description: form.concept, symbol: 'diamond', atmosphere: 'sigil',
    colors: { ...defaultTheme.colors, '--accent': accent, '--accent-hover': accent, '--accent-bright': bright,
      '--accent-soft': `${accent}55`, '--ambient': accent, '--ornament': bright, '--panel-glow': `${accent}22`,
      '--hub-surface': `linear-gradient(135deg, ${accent}20, #17191b)`, '--hub-surface-hover': `linear-gradient(135deg, ${accent}35, #1e2022)`,
      '--hub-art-glow': `${accent}35`, '--hub-border': `${bright}55`, '--hub-border-hover': bright, '--hub-ink': '#e9e6df', '--hub-muted': '#b2ada7' } }
}
