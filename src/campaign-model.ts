import type { SheetDetails } from './sheet-model'

export interface CampaignMember { id: string; name: string; characterName?: string; sheetId?: string; status: 'Ativo' | 'Ausente'; details?: SheetDetails }
export interface CampaignNpc { id: string; name: string; notes: string; details?: SheetDetails }
export interface CampaignItem { id: string; name: string; notes: string }
export interface CampaignCategory { id: string; name: string; description: string; sortOrder: number }
export interface CampaignMedia { id: string; title: string; subtitle: string; description: string; imageDataUrl?: string; mediaUrl?: string; mediaPath?: string; type?: 'image' | 'gif' | 'video' | 'text'; categoryId?: string | null; authorId?: string; shared: boolean }
export interface CampaignNote { id: string; title: string; body: string; categoryId?: string | null; authorId?: string; shared?: boolean }
export interface CampaignRoll { id: string; label: string; expression: string; result: number; authorId?: string; author?: string; createdAt?: string; dice?: number[] }
export interface CampaignMessage { id: string; author: string; authorId?: string; avatarUrl?: string; role: 'player' | 'master'; body: string; createdAt: string; editedAt?: string }

export interface CampaignWorkspace {
  members: CampaignMember[]
  npcs: CampaignNpc[]
  items: CampaignItem[]
  categories: CampaignCategory[]
  media: CampaignMedia[]
  notes: CampaignNote[]
  rolls: CampaignRoll[]
  messages: CampaignMessage[]
}

export function emptyCampaignWorkspace(): CampaignWorkspace {
  return { members: [], npcs: [], items: [], categories: [], media: [], notes: [], rolls: [], messages: [] }
}

export function normalizeCampaignWorkspace(workspace?: Partial<CampaignWorkspace>): CampaignWorkspace {
  return { ...emptyCampaignWorkspace(), ...workspace, categories: workspace?.categories ?? [], messages: workspace?.messages ?? [] }
}

// Only explicitly visible content belongs on the community board, including for the master.
// Legacy notes with no visibility flag remain private.
export function communityContent(workspace: CampaignWorkspace) {
  return {
    media: workspace.media.filter(item => item.shared === true),
    notes: workspace.notes.filter(item => item.shared === true),
  }
}
