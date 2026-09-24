import type { SheetDetails } from './sheet-model'

export interface CampaignMember { id: string; name: string; characterName?: string; status: 'Ativo' | 'Ausente'; details?: SheetDetails }
export interface CampaignNpc { id: string; name: string; notes: string; details?: SheetDetails }
export interface CampaignItem { id: string; name: string; notes: string }
export interface CampaignMedia { id: string; title: string; subtitle: string; description: string; imageDataUrl?: string; shared: boolean }
export interface CampaignNote { id: string; title: string; body: string; shared?: boolean }
export interface CampaignRoll { id: string; label: string; expression: string; result: number }
export interface CampaignMessage { id: string; author: string; role: 'player' | 'master'; body: string; createdAt: string }

export interface CampaignWorkspace {
  members: CampaignMember[]
  npcs: CampaignNpc[]
  items: CampaignItem[]
  media: CampaignMedia[]
  notes: CampaignNote[]
  rolls: CampaignRoll[]
  messages: CampaignMessage[]
}

export function emptyCampaignWorkspace(): CampaignWorkspace {
  return { members: [], npcs: [], items: [], media: [], notes: [], rolls: [], messages: [] }
}

export function normalizeCampaignWorkspace(workspace?: Partial<CampaignWorkspace>): CampaignWorkspace {
  return { ...emptyCampaignWorkspace(), ...workspace, messages: workspace?.messages ?? [] }
}

// Only explicitly visible content belongs on the community board, including for the master.
// Legacy notes with no visibility flag remain private.
export function communityContent(workspace: CampaignWorkspace) {
  return {
    media: workspace.media.filter(item => item.shared === true),
    notes: workspace.notes.filter(item => item.shared === true),
  }
}
