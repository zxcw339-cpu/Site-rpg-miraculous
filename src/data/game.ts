import { requireSupabase } from '../auth/client'
import { emptyCampaignWorkspace, normalizeCampaignWorkspace } from '../campaign-model'
import type { CampaignMedia, CampaignMessage, CampaignNote, CampaignWorkspace } from '../campaign-model'
import type { Campaign, CharacterSheet } from '../hub-data'
import { emptySheetDetails, normalizeSheetDetails, validateSheetDetails } from '../sheet-model'
import type { FormGrants, SheetDetails } from '../sheet-model'

type Row = Record<string, unknown>

const campaignColumns = 'id,name,owner_id'
const sheetColumns = 'id,owner_id,campaign_id,name,details'

function object(value: unknown): Row {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}
}

function string(value: unknown): string { return typeof value === 'string' ? value : '' }

function rows(value: unknown): Row[] { return Array.isArray(value) ? value.map(object) : [] }

function problem(error: unknown, fallback: string): Error {
  const code = string(object(error).code)
  if (code === '23505') return new Error('Esse registro já existe. Atualize a página e tente novamente.')
  if (code === '23514' || code === '22023') return new Error('Algum dado não atende às regras da ficha ou campanha. Revise os campos e tente novamente.')
  if (code === '42501' || code === 'PGRST301') return new Error('Sua conta não tem permissão para fazer essa alteração nesta campanha.')
  if (code === 'PGRST116') return new Error('Esse item não foi encontrado ou você não tem acesso a ele.')
  return new Error(fallback)
}

async function userId(): Promise<string> {
  const { data, error } = await requireSupabase().auth.getUser()
  if (error || !data.user) throw new Error('Entre em sua conta para salvar fichas e campanhas.')
  return data.user.id
}

function noInlineImages(value: unknown) {
  const serialized = JSON.stringify(value)
  if (/data:image\//i.test(serialized)) {
    throw new Error('Imagens ainda não podem ser salvas nesta versão. Remova os PNGs desta ficha ou mídia e tente novamente.')
  }
}

function civilDetails(details: SheetDetails) {
  const issue = validateSheetDetails(details)
  if (issue) throw new Error(issue)
  noInlineImages(details)
  // The database keeps master-assigned transformation data in a separate row.
  // Players cannot change it by sending a crafted civil sheet update.
  const { forms: _forms, abilities: _abilities, ...civil } = details
  void _forms
  void _abilities
  return civil
}

function sheetFromRow(row: Row, overlay?: Row): CharacterSheet {
  const civil = normalizeSheetDetails(object(row.details))
  const details = normalizeSheetDetails({
    ...civil,
    forms: Array.isArray(overlay?.forms) ? overlay.forms as FormGrants[] : civil.forms,
    abilities: Array.isArray(overlay?.abilities) ? overlay.abilities as SheetDetails['abilities'] : civil.abilities,
  })
  return { id: string(row.id), name: string(row.name), campaignId: string(row.campaign_id) || null, isExample: false, details }
}

function campaignFromRow(row: Row, currentUserId: string): Campaign {
  return { id: string(row.id), name: string(row.name), role: row.owner_id === currentUserId ? 'master' : 'player', isExample: false }
}

async function loadOverlays(sheetIds: string[]): Promise<Map<string, Row>> {
  if (!sheetIds.length) return new Map()
  const { data, error } = await requireSupabase().from('rpg_sheet_master_data').select('sheet_id,forms,abilities').in('sheet_id', sheetIds)
  if (error) throw problem(error, 'Não foi possível carregar os bônus e habilidades das fichas.')
  return new Map(rows(data).map(row => [string(row.sheet_id), row]))
}

export async function loadGameData(): Promise<{ campaigns: Campaign[]; sheets: CharacterSheet[] }> {
  const currentUserId = await userId()
  const client = requireSupabase()
  const [campaignResult, sheetResult] = await Promise.all([
    client.from('rpg_campaigns').select(campaignColumns).order('created_at', { ascending: false }),
    client.from('rpg_sheets').select(sheetColumns).order('created_at', { ascending: false }),
  ])
  if (campaignResult.error) throw problem(campaignResult.error, 'Não foi possível carregar suas campanhas. Tente novamente.')
  if (sheetResult.error) throw problem(sheetResult.error, 'Não foi possível carregar suas fichas. Tente novamente.')
  const campaignRows = rows(campaignResult.data)
  const allSheetRows = rows(sheetResult.data)
  const ownSheets = allSheetRows.filter(row => row.owner_id === currentUserId)
  const overlays = await loadOverlays(ownSheets.map(row => string(row.id)))
  const campaigns = campaignRows.map(row => campaignFromRow(row, currentUserId))
  const sheets = ownSheets.map(row => sheetFromRow(row, overlays.get(string(row.id))))
  return { campaigns, sheets }
}

export async function createCampaign(name: string): Promise<Campaign> {
  const trimmed = name.trim()
  if (!trimmed || trimmed.length > 80) throw new Error('Dê um nome de até 80 caracteres para a campanha.')
  const currentUserId = await userId()
  const { data, error } = await requireSupabase().from('rpg_campaigns').insert({ owner_id: currentUserId, name: trimmed }).select(campaignColumns).single()
  if (error || !data) throw problem(error, 'Não foi possível criar a campanha. Tente novamente.')
  return campaignFromRow(object(data), currentUserId)
}

export async function createInviteCode(campaignId: string): Promise<string> {
  await userId()
  const { data, error } = await requireSupabase().rpc('rpg_create_campaign_invite', { p_campaign_id: campaignId })
  if (error || typeof data !== 'string') throw problem(error, 'Não foi possível gerar o convite desta campanha.')
  return data
}

export async function revokeInviteCode(campaignId: string): Promise<void> {
  await userId()
  const { error } = await requireSupabase().rpc('rpg_revoke_campaign_invite', { p_campaign_id: campaignId })
  if (error) throw problem(error, 'Não foi possível cancelar o convite desta campanha.')
}

export async function joinCampaign(code: string): Promise<Campaign> {
  const normalized = code.trim().toLowerCase()
  if (!/^[a-f0-9]{32}$/.test(normalized)) throw new Error('Digite o código completo do convite, com 32 caracteres.')
  const currentUserId = await userId()
  const { data: campaignId, error: joinError } = await requireSupabase().rpc('rpg_join_campaign_by_code', { p_code: normalized })
  if (joinError || typeof campaignId !== 'string') throw new Error('Convite inválido ou vencido. Peça um novo código ao mestre.')
  const { data, error } = await requireSupabase().from('rpg_campaigns').select(campaignColumns).eq('id', campaignId).single()
  if (error || !data) throw problem(error, 'Você entrou na campanha, mas não foi possível carregar seus dados. Atualize a página.')
  return campaignFromRow(object(data), currentUserId)
}

export async function createSheet(name: string, campaignId: string | null): Promise<CharacterSheet> {
  const trimmed = name.trim()
  if (!trimmed || trimmed.length > 80) throw new Error('Dê um nome de até 80 caracteres para a ficha.')
  const currentUserId = await userId()
  const { data, error } = await requireSupabase().from('rpg_sheets').insert({
    owner_id: currentUserId, name: trimmed, campaign_id: campaignId, details: civilDetails(emptySheetDetails()),
  }).select(sheetColumns).single()
  if (string(object(error).code) === '23505') throw new Error('Você já tem uma ficha vinculada a esta campanha. Crie esta ficha sem vínculo ou desvincule a anterior primeiro.')
  if (error || !data) throw problem(error, 'Não foi possível criar a ficha. Escolha uma campanha em que você joga e tente novamente.')
  return sheetFromRow(object(data))
}

export async function saveSheet(sheetId: string, name: string, details: SheetDetails): Promise<CharacterSheet> {
  const trimmed = name.trim()
  if (!trimmed || trimmed.length > 80) throw new Error('Dê um nome de até 80 caracteres para a ficha.')
  const civil = civilDetails(details)
  await userId()
  const { data, error } = await requireSupabase().from('rpg_sheets').update({ name: trimmed, details: civil }).eq('id', sheetId).select(sheetColumns).single()
  if (error || !data) throw problem(error, 'Não foi possível salvar a ficha. Confira sua conexão e tente novamente.')
  const overlays = await loadOverlays([sheetId])
  return sheetFromRow(object(data), overlays.get(sheetId))
}

export async function linkSheet(sheetId: string, campaignId: string | null): Promise<CharacterSheet> {
  await userId()
  const { data, error } = await requireSupabase().from('rpg_sheets').update({ campaign_id: campaignId }).eq('id', sheetId).select(sheetColumns).single()
  if (string(object(error).code) === '23505') throw new Error('Você já tem uma ficha vinculada a esta campanha. Desvincule a anterior primeiro.')
  if (error || !data) throw problem(error, 'Não foi possível vincular a ficha. Você só pode escolher uma campanha em que joga.')
  const overlays = await loadOverlays([sheetId])
  return sheetFromRow(object(data), overlays.get(sheetId))
}

export async function saveMasterSheetData(sheetId: string, forms: FormGrants[], abilities: SheetDetails['abilities']): Promise<void> {
  await userId()
  const { error } = await requireSupabase().from('rpg_sheet_master_data').upsert({ sheet_id: sheetId, forms, abilities }, { onConflict: 'sheet_id' })
  if (error) throw problem(error, 'Não foi possível salvar os bônus e habilidades desta ficha.')
}

function mediaFromRow(row: Row): CampaignMedia {
  return { id: string(row.id), title: string(row.title), subtitle: string(row.subtitle), description: string(row.description), shared: row.shared === true }
}

function noteFromRow(row: Row): CampaignNote {
  return { id: string(row.id), title: string(row.title), body: string(row.body), shared: row.shared === true }
}

function messageFromRow(row: Row, masterId: string): CampaignMessage {
  return { id: string(row.id), author: string(row.author_name) || 'Jogador', role: row.author_id === masterId ? 'master' : 'player', body: string(row.body), createdAt: string(row.created_at) }
}

export async function loadCampaignMessages(campaignId: string): Promise<CampaignMessage[]> {
  const client = requireSupabase()
  const [campaignResult, messagesResult] = await Promise.all([
    client.from('rpg_campaigns').select('owner_id').eq('id', campaignId).single(),
    client.from('rpg_campaign_messages').select('id,author_id,author_name,body,created_at').eq('campaign_id', campaignId).order('created_at'),
  ])
  if (campaignResult.error || !campaignResult.data || messagesResult.error) throw new Error('Não foi possível atualizar o chat desta campanha.')
  const ownerId = string(object(campaignResult.data).owner_id)
  return rows(messagesResult.data).map(row => messageFromRow(row, ownerId))
}

export async function loadCampaignWorkspace(campaignId: string): Promise<CampaignWorkspace> {
  const currentUserId = await userId()
  const client = requireSupabase()
  const campaignResult = await client.from('rpg_campaigns').select(campaignColumns).eq('id', campaignId).single()
  if (campaignResult.error || !campaignResult.data) throw problem(campaignResult.error, 'Campanha não encontrada ou sem acesso.')
  const campaign = object(campaignResult.data)
  const isMaster = campaign.owner_id === currentUserId
  const [masterResult, mediaResult, notesResult, messagesResult] = await Promise.all([
    isMaster ? client.from('rpg_campaign_master_data').select('data').eq('campaign_id', campaignId).maybeSingle() : Promise.resolve({ data: null, error: null }),
    client.from('rpg_campaign_media').select('id,title,subtitle,description,image_path,shared').eq('campaign_id', campaignId).order('created_at'),
    client.from('rpg_campaign_notes').select('id,title,body,shared').eq('campaign_id', campaignId).order('created_at'),
    client.from('rpg_campaign_messages').select('id,author_id,author_name,body,created_at').eq('campaign_id', campaignId).order('created_at'),
  ])
  if (masterResult.error) throw problem(masterResult.error, 'Não foi possível carregar o painel do mestre.')
  if (mediaResult.error) throw problem(mediaResult.error, 'Não foi possível carregar as imagens da comunidade.')
  if (notesResult.error) throw problem(notesResult.error, 'Não foi possível carregar as anotações da comunidade.')
  if (messagesResult.error) throw problem(messagesResult.error, 'Não foi possível carregar as mensagens da campanha.')
  const privateData = isMaster ? normalizeCampaignWorkspace(object(object(masterResult.data).data)) : emptyCampaignWorkspace()
  const workspace: CampaignWorkspace = {
    ...privateData,
    media: rows(mediaResult.data).map(mediaFromRow),
    notes: rows(notesResult.data).map(noteFromRow),
    messages: rows(messagesResult.data).map(row => messageFromRow(row, string(campaign.owner_id))),
  }
  if (isMaster) {
    const { data, error } = await client.rpc('rpg_campaign_participants', { p_campaign_id: campaignId })
    if (error) throw problem(error, 'Não foi possível carregar os participantes da campanha.')
    const participants = rows(data)
    const { data: memberSheetsData, error: memberSheetsError } = await client.from('rpg_sheets').select(sheetColumns).eq('campaign_id', campaignId)
    if (memberSheetsError) throw problem(memberSheetsError, 'Não foi possível carregar as fichas dos participantes.')
    const memberSheets = rows(memberSheetsData)
    const overlays = await loadOverlays(memberSheets.map(row => string(row.id)))
    workspace.members = participants.map(participant => {
      const sheetRow = memberSheets.find(row => row.owner_id === participant.user_id)
      const sheet = sheetRow && sheetFromRow(sheetRow, overlays.get(string(sheetRow.id)))
      return {
        id: string(participant.user_id), name: string(participant.display_name) || string(participant.username) || 'Jogador',
        sheetId: sheet?.id, characterName: sheet?.name, status: 'Ativo' as const, details: sheet?.details,
      }
    })
  }
  return workspace
}

function changed<T extends { id: string }>(before: T[], after: T[]) {
  const old = new Map(before.map(item => [item.id, item]))
  const current = new Map(after.map(item => [item.id, item]))
  return {
    added: after.filter(item => !old.has(item.id)),
    edited: after.filter(item => old.has(item.id) && JSON.stringify(old.get(item.id)) !== JSON.stringify(item)),
    removed: before.filter(item => !current.has(item.id)),
  }
}

export async function saveCampaignWorkspace(campaignId: string, before: CampaignWorkspace, after: CampaignWorkspace): Promise<void> {
  await userId()
  if (JSON.stringify(before.members) !== JSON.stringify(after.members)) {
    throw new Error('Participantes entram por convite. Use o código da campanha para adicioná-los.')
  }
  noInlineImages(after)
  const client = requireSupabase()
  const media = changed(before.media, after.media)
  const notes = changed(before.notes, after.notes)
  // Messages are inserted independently so two people can talk without replacing each other's history.
  if (JSON.stringify(before.messages) !== JSON.stringify(after.messages)) {
    throw new Error('Use o chat da Comunidade para enviar mensagens.')
  }
  for (const item of media.added) {
    const { error } = await client.from('rpg_campaign_media').insert({ id: item.id, campaign_id: campaignId, title: item.title, subtitle: item.subtitle, description: item.description, shared: item.shared })
    if (error) throw problem(error, 'Não foi possível adicionar a imagem da campanha.')
  }
  for (const item of media.edited) {
    const { error } = await client.from('rpg_campaign_media').update({ title: item.title, subtitle: item.subtitle, description: item.description, shared: item.shared }).eq('id', item.id).eq('campaign_id', campaignId)
    if (error) throw problem(error, 'Não foi possível atualizar a imagem da campanha.')
  }
  for (const item of media.removed) {
    const { error } = await client.from('rpg_campaign_media').delete().eq('id', item.id).eq('campaign_id', campaignId)
    if (error) throw problem(error, 'Não foi possível remover a imagem da campanha.')
  }
  for (const item of notes.added) {
    const { error } = await client.from('rpg_campaign_notes').insert({ id: item.id, campaign_id: campaignId, title: item.title, body: item.body, shared: item.shared === true })
    if (error) throw problem(error, 'Não foi possível adicionar a anotação da campanha.')
  }
  for (const item of notes.edited) {
    const { error } = await client.from('rpg_campaign_notes').update({ title: item.title, body: item.body, shared: item.shared === true }).eq('id', item.id).eq('campaign_id', campaignId)
    if (error) throw problem(error, 'Não foi possível atualizar a anotação da campanha.')
  }
  for (const item of notes.removed) {
    const { error } = await client.from('rpg_campaign_notes').delete().eq('id', item.id).eq('campaign_id', campaignId)
    if (error) throw problem(error, 'Não foi possível remover a anotação da campanha.')
  }
  if (JSON.stringify({ npcs: before.npcs, items: before.items, rolls: before.rolls }) !== JSON.stringify({ npcs: after.npcs, items: after.items, rolls: after.rolls })) {
    const { error } = await client.from('rpg_campaign_master_data').upsert({ campaign_id: campaignId, data: { npcs: after.npcs, items: after.items, rolls: after.rolls } }, { onConflict: 'campaign_id' })
    if (error) throw problem(error, 'Não foi possível salvar o painel do mestre.')
  }
}

export async function sendCampaignMessage(campaignId: string, body: string): Promise<CampaignMessage> {
  const trimmed = body.trim()
  if (!trimmed || trimmed.length > 1500) throw new Error('Escreva uma mensagem de até 1.500 caracteres.')
  const currentUserId = await userId()
  const client = requireSupabase()
  const { data: campaignData, error: campaignError } = await client.from('rpg_campaigns').select('owner_id').eq('id', campaignId).single()
  if (campaignError || !campaignData) throw problem(campaignError, 'Não foi possível localizar a campanha. Reabra a mesa e tente novamente.')
  const { data, error } = await client.from('rpg_campaign_messages').insert({ campaign_id: campaignId, author_id: currentUserId, body: trimmed }).select('id,author_id,author_name,body,created_at').single()
  if (error || !data) throw problem(error, 'Não foi possível enviar sua mensagem. Tente novamente.')
  return messageFromRow(object(data), string(object(campaignData).owner_id))
}
