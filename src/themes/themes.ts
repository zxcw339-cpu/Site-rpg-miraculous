export type ThemeSymbol = 'diamond' | 'star' | 'bloom' | 'spider'

export interface ThemeDefinition {
  id: string
  name: string
  description: string
  symbol: ThemeSymbol
  colors: Record<`--${string}`, string>
}

// Aranha é a aparência em desenvolvimento. O símbolo e a paleta são
// provisórios e poderão ser substituídos pelos materiais definitivos.
export const previewThemes: readonly ThemeDefinition[] = [
  {
    id: 'preview-wine',
    name: 'Aranha',
    description: 'Grafite, prata e detalhes em vinho.',
    symbol: 'spider',
    colors: {
      '--accent': '#85384f',
      '--accent-hover': '#98425e',
      '--accent-bright': '#e4a1b5',
      '--accent-soft': 'rgba(164, 73, 101, 0.16)',
      '--ambient': 'rgba(128, 42, 69, 0.13)',
      '--ornament': '#83727a',
      '--button-text': '#ffffff',
      '--panel-glow': 'rgba(164, 73, 101, 0.08)',
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

// A aparência Aranha ocupa provisoriamente um espaço central da caixa.
// Uma definição definitiva substituirá o estudo sem alterar a navegação.
export const themeSlots = futureMiraculousSlots.map((slot, index) => ({
  ...slot,
  theme: slot.theme ?? previewThemes[index - 7] ?? null,
}))

export const availableThemes = themeSlots.flatMap(slot => slot.theme ? [slot.theme] : [])

export function getTheme(id: string | null): ThemeDefinition {
  return availableThemes.find(theme => theme.id === id) ?? defaultTheme
}
