import type { SheetDetails } from './sheet-model'
import type { CampaignWorkspace } from './campaign-model'

export interface Campaign {
  id: string
  name: string
  role: 'player' | 'master'
  isExample: boolean
  workspace?: CampaignWorkspace
}

export interface CharacterSheet {
  id: string
  name: string
  campaignId: string | null
  isExample: boolean
  details?: SheetDetails
}

// Personal character sheets only belong to campaigns where this user is a player.
// Unknown, removed or master-only campaigns are treated as an unlinked sheet.
export function findPlayerCampaign(campaigns: readonly Campaign[], campaignId: string | null) {
  return campaigns.find(campaign => campaign.id === campaignId && campaign.role === 'player')
}

// Neutral examples for exploring the hubs. Nothing here defines RPG lore.
export const exampleCampaigns: Campaign[] = [
  { id: 'example-player', name: 'Campanha de exemplo 01', role: 'player', isExample: true },
  { id: 'example-master', name: 'Campanha de exemplo 02', role: 'master', isExample: true },
]

export const exampleSheets: CharacterSheet[] = [
  { id: 'example-sheet-01', name: 'Ficha de exemplo 01', campaignId: null, isExample: true },
  { id: 'example-sheet-02', name: 'Ficha de exemplo 02', campaignId: null, isExample: true },
  { id: 'example-sheet-03', name: 'Ficha de exemplo 03', campaignId: 'example-player', isExample: true },
]

export function matchesSearch(name: string, query: string) {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
  return normalize(name).includes(normalize(query.trim()))
}
