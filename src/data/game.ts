import { requireSupabase } from '../auth/client'
import { emptyCampaignWorkspace, normalizeCampaignWorkspace } from '../campaign-model'
import type { CampaignCategory, CampaignMedia, CampaignMessage, CampaignNote, CampaignNpc, CampaignRoll, CampaignWorkspace } from '../campaign-model'
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
  // The database validates the JWT/RLS on every write. The local session
  // supplies only the ID for rows and avoids a network request per action.
  const { data, error } = await requireSupabase().auth.getSession()
  if (error || !data.session?.user) throw new Error('Entre em sua conta para salvar fichas e campanhas.')
  return data.session.user.id
}

const sheetBucket = 'rpg-sheet-images'
const mediaBucket = 'rpg-campaign-media'
const npcBucket = 'rpg-npc-images'
const imageExtensions: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }
const mediaExtensions: Record<string, string> = { ...imageExtensions, 'image/gif': 'gif', 'video/mp4': 'mp4', 'video/webm': 'webm' }
const signedUrlCache = new Map<string, { url: string; until: number }>()

function validUpload(file: Blob, extensions: Record<string, string>, maxSize: number): string {
  const extension = extensions[file.type]
  if (!extension || file.size > maxSize || file.size === 0) throw new Error(`Arquivo inválido. Envie um formato aceito de até ${Math.round(maxSize / 1048576)} MB.`)
  return extension
}

async function blobFromDataUrl(value: string): Promise<Blob> {
  if (!/^data:(image\/(png|jpeg|webp|gif)|video\/(mp4|webm));base64,/i.test(value)) throw new Error('Imagem ou vídeo inválido. Escolha outro arquivo.')
  const response = await fetch(value)
  return response.blob()
}

async function signedUrls(bucket: string, paths: string[]): Promise<Map<string, string>> {
  if (!paths.length) return new Map()
  const unique = [...new Set(paths)]
  const client = requireSupabase()
  const { data: session } = await client.auth.getSession()
  const principal = session.session?.user.id ?? ''
  const key = (path: string) => `${principal}:${bucket}:${path}`
  const result = new Map<string, string>()
  const stale = unique.filter(path => {
    const cached = signedUrlCache.get(key(path))
    if (cached && cached.until > Date.now()) { result.set(path, cached.url); return false }
    return true
  })
  if (stale.length) {
    const { data } = await client.storage.from(bucket).createSignedUrls(stale, 3600)
    stale.forEach((path, index) => {
      const url = data?.[index]?.signedUrl
      if (url) {
        signedUrlCache.set(key(path), { url, until: Date.now() + 50 * 60_000 })
        result.set(path, url)
      }
    })
  }
  return result
}

async function hydrateSheet(sheet: CharacterSheet): Promise<CharacterSheet> {
  return (await hydrateSheets([sheet]))[0]
}

async function hydrateSheets(sheets: CharacterSheet[]): Promise<CharacterSheet[]> {
  const paths = sheets.flatMap(sheet => characterImagePaths(sheet.details))
  const signed = await signedUrls(sheetBucket, paths)
  return sheets.map(sheet => {
    if (!sheet.details) return sheet
    const details = sheet.details
    return { ...sheet, details: {
      ...details,
      portraitDataUrl: details.portraitPath ? signed.get(details.portraitPath) || undefined : details.portraitDataUrl,
      appearanceImages: details.appearanceImages.map(image => ({ ...image, dataUrl: image.path ? signed.get(image.path) || '' : image.dataUrl })),
    } }
  })
}

function characterImagePaths(details?: SheetDetails): string[] {
  if (!details) return []
  return [details.portraitPath, ...details.appearanceImages.map(image => image.path)]
    .filter((path): path is string => Boolean(path))
}

async function hydrateNpcs(npcs: CampaignNpc[]): Promise<CampaignNpc[]> {
  const paths = npcs.flatMap(npc => characterImagePaths(npc.details))
  const signed = await signedUrls(npcBucket, paths)
  return npcs.map(npc => {
    if (!npc.details) return npc
    const details = normalizeSheetDetails(npc.details)
    return { ...npc, details: {
      ...details,
      portraitDataUrl: details.portraitPath ? signed.get(details.portraitPath) || undefined : details.portraitDataUrl,
      appearanceImages: details.appearanceImages.map(image => ({
        ...image, dataUrl: image.path ? signed.get(image.path) || '' : image.dataUrl,
      })),
    } }
  })
}

async function persistCharacterImages(bucketName: string, prefix: string, details: SheetDetails): Promise<{ details: SheetDetails; uploaded: string[] }> {
  const persistent: SheetDetails = structuredClone(details)
  const uploaded: string[] = []
  const bucket = requireSupabase().storage.from(bucketName)
  try {
    if (persistent.portraitDataUrl?.startsWith('data:')) {
      const image = await blobFromDataUrl(persistent.portraitDataUrl)
      const ext = validUpload(image, imageExtensions, 5 * 1048576)
      const path = `${prefix}/portrait/${crypto.randomUUID()}.${ext}`
      const { error } = await bucket.upload(path, image, { contentType: image.type, upsert: false })
      if (error) throw problem(error, 'Não foi possível enviar o retrato da ficha.')
      persistent.portraitPath = path
      uploaded.push(path)
    }
    delete persistent.portraitDataUrl
    const appearance: SheetDetails['appearanceImages'] = []
    for (const item of persistent.appearanceImages) {
      if (!item.dataUrl.startsWith('data:')) { appearance.push({ ...item, dataUrl: '' }); continue }
      const image = await blobFromDataUrl(item.dataUrl)
      const ext = validUpload(image, imageExtensions, 5 * 1048576)
      const path = `${prefix}/appearance/${crypto.randomUUID()}.${ext}`
      const { error } = await bucket.upload(path, image, { contentType: image.type, upsert: false })
      if (error) throw problem(error, 'Não foi possível enviar uma imagem de aparência.')
      uploaded.push(path)
      appearance.push({ ...item, path, dataUrl: '' })
    }
    persistent.appearanceImages = appearance
    for (const path of [persistent.portraitPath, ...persistent.appearanceImages.map(item => item.path)]) {
      if (path && !path.startsWith(`${prefix}/`)) throw new Error('Uma imagem da ficha não pertence a esta ficha.')
    }
    return { details: persistent, uploaded }
  } catch (error) {
    if (uploaded.length) await bucket.remove(uploaded)
    throw error
  }
}

function noInlineImages(value: unknown) {
  const serialized = JSON.stringify(value)
  if (/data:image\//i.test(serialized)) {
    throw new Error('Não foi possível concluir o envio de uma imagem. Escolha o arquivo novamente e tente salvar.')
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

export async function loadSheet(sheetId: string): Promise<CharacterSheet> {
  await userId()
  const { data, error } = await requireSupabase().from('rpg_sheets').select(sheetColumns).eq('id', sheetId).single()
  if (error || !data) throw problem(error, 'Ficha não encontrada ou sem acesso.')
  const overlays = await loadOverlays([sheetId])
  return hydrateSheet(sheetFromRow(object(data), overlays.get(sheetId)))
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

// This RPC creates the code only once. Every subsequent call returns the
// permanent code for this campaign.
export const getInviteCode = createInviteCode

export async function revokeInviteCode(campaignId: string): Promise<void> {
  void campaignId
  throw new Error('O código da mesa é permanente e não pode ser revogado.')
}

export async function joinCampaign(code: string): Promise<Campaign> {
  const normalized = code.trim().toLowerCase()
  if (!/^[a-f0-9]{32}$/.test(normalized)) throw new Error('Digite o código completo do convite, com 32 caracteres.')
  const currentUserId = await userId()
  const { data: campaignId, error: joinError } = await requireSupabase().rpc('rpg_join_campaign_by_code', { p_code: normalized })
  if (joinError || typeof campaignId !== 'string') throw new Error('Código de mesa inválido. Confira com o mestre.')
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
  await userId()
  const { data: ownership, error: ownershipError } = await requireSupabase().from('rpg_sheets').select('owner_id,details').eq('id', sheetId).single()
  if (ownershipError || !ownership) throw problem(ownershipError, 'Ficha não encontrada.')
  const stored = await persistCharacterImages(sheetBucket, `${string(object(ownership).owner_id)}/${sheetId}`, details)
  let saved: Row
  try {
    const civil = civilDetails(stored.details)
    const { data, error } = await requireSupabase().from('rpg_sheets').update({ name: trimmed, details: civil }).eq('id', sheetId).select(sheetColumns).single()
    if (error || !data) throw problem(error, 'Não foi possível salvar a ficha. Confira sua conexão e tente novamente.')
    saved = object(data)
  } catch (error) {
    if (stored.uploaded.length) await requireSupabase().storage.from(sheetBucket).remove(stored.uploaded)
    throw error
  }
  const old = normalizeSheetDetails(object(object(ownership).details))
  const oldPaths = [old.portraitPath, ...old.appearanceImages.map(image => image.path)].filter((path): path is string => Boolean(path))
  const newPaths = new Set([stored.details.portraitPath, ...stored.details.appearanceImages.map(image => image.path)].filter(Boolean))
  const removed = oldPaths.filter(path => !newPaths.has(path))
  if (removed.length) await requireSupabase().storage.from(sheetBucket).remove(removed)
  const overlays = await loadOverlays([sheetId])
  return hydrateSheet(sheetFromRow(saved, overlays.get(sheetId)))
}

export async function saveSheetAsMaster(sheetId: string, name: string, details: SheetDetails): Promise<CharacterSheet> {
  // Database RLS permits this only while the sheet is linked to a campaign
  // owned by the caller. Civil fields may be edited; transforms/abilities are
  // maintained separately and cannot be overwritten by this method.
  return saveSheet(sheetId, name, details)
}

export async function linkSheet(sheetId: string, campaignId: string | null): Promise<CharacterSheet> {
  await userId()
  const { data, error } = await requireSupabase().from('rpg_sheets').update({ campaign_id: campaignId }).eq('id', sheetId).select(sheetColumns).single()
  if (string(object(error).code) === '23505') throw new Error('Você já tem uma ficha vinculada a esta campanha. Desvincule a anterior primeiro.')
  if (error || !data) throw problem(error, 'Não foi possível vincular a ficha. Você só pode escolher uma campanha em que joga.')
  const overlays = await loadOverlays([sheetId])
  return hydrateSheet(sheetFromRow(object(data), overlays.get(sheetId)))
}

export async function saveMasterSheetData(sheetId: string, forms: FormGrants[], abilities: SheetDetails['abilities']): Promise<void> {
  await userId()
  const { error } = await requireSupabase().from('rpg_sheet_master_data').upsert({ sheet_id: sheetId, forms, abilities }, { onConflict: 'sheet_id' })
  if (error) throw problem(error, 'Não foi possível salvar os bônus e habilidades desta ficha.')
}

function mediaFromRow(row: Row): CampaignMedia {
  return { id: string(row.id), title: string(row.title), subtitle: string(row.subtitle), description: string(row.description),
    categoryId: string(row.category_id) || null, authorId: string(row.author_id), mediaPath: string(row.image_path) || undefined,
    type: (string(row.media_type) || 'image') as CampaignMedia['type'], mediaUrl: string(row.media_url) || undefined, shared: row.shared === true }
}

function noteFromRow(row: Row): CampaignNote {
  return { id: string(row.id), title: string(row.title), body: string(row.body), categoryId: string(row.category_id) || null,
    authorId: string(row.author_id), shared: row.shared === true }
}

function categoryFromRow(row: Row): CampaignCategory {
  return { id: string(row.id), name: string(row.name), description: string(row.description), sortOrder: Number(row.sort_order) || 0 }
}

async function hydrateMedia(media: CampaignMedia[]): Promise<CampaignMedia[]> {
  const signed = await signedUrls(mediaBucket, media.map(item => item.mediaPath).filter((path): path is string => Boolean(path)))
  return media.map(item => {
    const url = item.mediaPath ? signed.get(item.mediaPath) || undefined : item.mediaUrl
    return { ...item, mediaUrl: url, imageDataUrl: item.type === 'video' ? undefined : url }
  })
}

function messageFromRow(row: Row, masterId: string, avatarUrl?: string): CampaignMessage {
  return { id: string(row.id), author: string(row.author_name) || 'Jogador', authorId: string(row.author_id),
    avatarUrl, role: row.author_id === masterId ? 'master' : 'player', body: string(row.body),
    createdAt: string(row.created_at), editedAt: string(row.edited_at) || undefined }
}

function rollFromRow(row: Row): CampaignRoll {
  return { id: string(row.id), label: string(row.label), expression: string(row.expression),
    result: Number(row.result), dice: Array.isArray(row.dice) ? row.dice.map(Number) : [],
    authorId: string(row.author_id), createdAt: string(row.created_at) }
}

async function messageRows(campaignId: string, ownerId: string): Promise<CampaignMessage[]> {
  const { data, error } = await requireSupabase().rpc('rpg_campaign_messages_view', { p_campaign_id: campaignId })
  if (error) throw problem(error, 'Não foi possível atualizar o chat desta campanha.')
  const messageData = rows(data)
  const signed = await signedUrls('rpg-avatars', messageData.map(row => string(row.avatar_path)).filter(Boolean))
  return messageData.map(row => messageFromRow(row, ownerId, signed.get(string(row.avatar_path)) || undefined))
}

export async function loadCampaignMessages(campaignId: string): Promise<CampaignMessage[]> {
  const { data, error } = await requireSupabase().from('rpg_campaigns').select('owner_id').eq('id', campaignId).single()
  if (error || !data) throw problem(error, 'Não foi possível atualizar o chat desta campanha.')
  return messageRows(campaignId, string(object(data).owner_id))
}

export async function loadCampaignWorkspace(campaignId: string): Promise<CampaignWorkspace> {
  const currentUserId = await userId()
  const client = requireSupabase()
  const campaignResult = await client.from('rpg_campaigns').select(campaignColumns).eq('id', campaignId).single()
  if (campaignResult.error || !campaignResult.data) throw problem(campaignResult.error, 'Campanha não encontrada ou sem acesso.')
  const campaign = object(campaignResult.data)
  const isMaster = campaign.owner_id === currentUserId
  const [masterResult, mediaResult, notesResult, categoryResult, messages, rollResult] = await Promise.all([
    isMaster ? client.from('rpg_campaign_master_data').select('data').eq('campaign_id', campaignId).maybeSingle() : Promise.resolve({ data: null, error: null }),
    client.from('rpg_campaign_media').select('id,title,subtitle,description,image_path,media_url,media_type,category_id,author_id,shared').eq('campaign_id', campaignId).order('created_at'),
    client.from('rpg_campaign_notes').select('id,title,body,category_id,author_id,shared').eq('campaign_id', campaignId).order('created_at'),
    client.from('rpg_campaign_categories').select('id,name,description,sort_order').eq('campaign_id', campaignId).order('sort_order'),
    messageRows(campaignId, string(campaign.owner_id)),
    client.from('rpg_campaign_rolls').select('id,label,expression,dice,result,author_id,created_at').eq('campaign_id', campaignId).order('created_at', { ascending: false }).limit(200),
  ])
  if (masterResult.error) throw problem(masterResult.error, 'Não foi possível carregar o painel do mestre.')
  if (mediaResult.error) throw problem(mediaResult.error, 'Não foi possível carregar as imagens da comunidade.')
  if (notesResult.error) throw problem(notesResult.error, 'Não foi possível carregar as anotações da comunidade.')
  if (categoryResult.error) throw problem(categoryResult.error, 'Não foi possível carregar as categorias da comunidade.')
  if (rollResult.error) throw problem(rollResult.error, 'Não foi possível carregar o histórico das rolagens.')
  const privateData = isMaster ? normalizeCampaignWorkspace(object(object(masterResult.data).data)) : emptyCampaignWorkspace()
  if (isMaster) privateData.npcs = await hydrateNpcs(privateData.npcs)
  const workspace: CampaignWorkspace = {
    ...privateData,
    categories: rows(categoryResult.data).map(categoryFromRow),
    media: await hydrateMedia(rows(mediaResult.data).map(mediaFromRow)),
    notes: rows(notesResult.data).map(noteFromRow),
    messages,
    rolls: rows(rollResult.data).map(rollFromRow),
  }
  if (isMaster) {
    const { data, error } = await client.rpc('rpg_campaign_participants', { p_campaign_id: campaignId })
    if (error) throw problem(error, 'Não foi possível carregar os participantes da campanha.')
    const participants = rows(data)
    const { data: memberSheetsData, error: memberSheetsError } = await client.from('rpg_sheets').select(sheetColumns).eq('campaign_id', campaignId)
    if (memberSheetsError) throw problem(memberSheetsError, 'Não foi possível carregar as fichas dos participantes.')
    const memberSheets = rows(memberSheetsData)
    const overlays = await loadOverlays(memberSheets.map(row => string(row.id)))
    const hydratedSheets = await hydrateSheets(memberSheets.map(row => sheetFromRow(row, overlays.get(string(row.id)))))
    const sheetByOwner = new Map(memberSheets.map((row, index) => [string(row.owner_id), hydratedSheets[index]]))
    workspace.members = participants.map(participant => {
      const sheet = sheetByOwner.get(string(participant.user_id))
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
  const currentUserId = await userId()
  if (JSON.stringify(before.members) !== JSON.stringify(after.members)) {
    throw new Error('Participantes entram por convite. Use o código da campanha para adicioná-los.')
  }
  const client = requireSupabase()
  const categories = changed(before.categories, after.categories)
  const media = changed(before.media, after.media)
  const notes = changed(before.notes, after.notes)
  // Messages are inserted independently so two people can talk without replacing each other's history.
  if (JSON.stringify(before.messages) !== JSON.stringify(after.messages)) {
    throw new Error('Use o chat da Comunidade para enviar mensagens.')
  }
  for (const item of categories.added) {
    const { error } = await client.from('rpg_campaign_categories').insert({ id: item.id, campaign_id: campaignId,
      name: item.name, description: item.description, sort_order: item.sortOrder })
    if (error) throw problem(error, 'Não foi possível criar a categoria da comunidade.')
  }
  for (const item of categories.edited) {
    const { error } = await client.from('rpg_campaign_categories').update({ name: item.name, description: item.description,
      sort_order: item.sortOrder }).eq('id', item.id).eq('campaign_id', campaignId)
    if (error) throw problem(error, 'Não foi possível editar a categoria da comunidade.')
  }
  for (const item of media.added) {
    const { error } = await client.from('rpg_campaign_media').insert({ id: item.id, campaign_id: campaignId,
      title: item.title, subtitle: item.subtitle, description: item.description, shared: item.shared,
      category_id: item.categoryId || null, media_type: item.type || 'image',
      media_url: item.mediaPath ? null : item.mediaUrl?.startsWith('https://') ? item.mediaUrl : null })
    if (error) throw problem(error, 'Não foi possível adicionar a imagem da campanha.')
    try {
      const upload = await uploadMediaDataUrl(campaignId, item.id, item.imageDataUrl)
      if (upload) {
        const { error: updateError } = await client.from('rpg_campaign_media').update({ image_path: upload.path, media_type: upload.type })
          .eq('campaign_id', campaignId).eq('id', item.id)
        if (updateError) {
          await client.storage.from(mediaBucket).remove([upload.path])
          throw problem(updateError, 'Não foi possível salvar o arquivo da comunidade.')
        }
        applyUploadedMedia(item, upload)
      }
    } catch (cause) {
      await client.from('rpg_campaign_media').delete().eq('id', item.id).eq('campaign_id', campaignId)
      throw cause
    }
  }
  for (const item of media.edited) {
    const upload = await uploadMediaDataUrl(campaignId, item.id, item.imageDataUrl)
    const { error } = await client.from('rpg_campaign_media').update({ title: item.title, subtitle: item.subtitle,
      description: item.description, shared: item.shared, category_id: item.categoryId || null,
      media_type: upload?.type || item.type || 'image',
      ...(upload ? { image_path: upload.path, media_url: null } : {}) })
      .eq('id', item.id).eq('campaign_id', campaignId)
    if (error && upload) await client.storage.from(mediaBucket).remove([upload.path])
    if (error) throw problem(error, 'Não foi possível atualizar a imagem da campanha.')
    if (upload) {
      const old = before.media.find(entry => entry.id === item.id)
      if (old?.mediaPath) await client.storage.from(mediaBucket).remove([old.mediaPath])
      applyUploadedMedia(item, upload)
    }
  }
  for (const item of media.removed) {
    const { error } = await client.from('rpg_campaign_media').delete().eq('id', item.id).eq('campaign_id', campaignId)
    if (error) throw problem(error, 'Não foi possível remover a imagem da campanha.')
    // A publicação deve desaparecer mesmo se a limpeza posterior do arquivo falhar.
    if (item.mediaPath) await client.storage.from(mediaBucket).remove([item.mediaPath])
  }
  for (const item of notes.added) {
    const { error } = await client.from('rpg_campaign_notes').insert({ id: item.id, campaign_id: campaignId,
      title: item.title, body: item.body, category_id: item.categoryId || null, shared: item.shared === true })
    if (error) throw problem(error, 'Não foi possível adicionar a anotação da campanha.')
  }
  for (const item of notes.edited) {
    const { error } = await client.from('rpg_campaign_notes').update({ title: item.title, body: item.body,
      category_id: item.categoryId || null, shared: item.shared === true }).eq('id', item.id).eq('campaign_id', campaignId)
    if (error) throw problem(error, 'Não foi possível atualizar a anotação da campanha.')
  }
  for (const item of notes.removed) {
    const { error } = await client.from('rpg_campaign_notes').delete().eq('id', item.id).eq('campaign_id', campaignId)
    if (error) throw problem(error, 'Não foi possível remover a anotação da campanha.')
  }
  for (const item of categories.removed) {
    const { error } = await client.from('rpg_campaign_categories').delete().eq('id', item.id).eq('campaign_id', campaignId)
    if (error) throw problem(error, 'Não foi possível remover a categoria da comunidade.')
  }
  if (JSON.stringify({ npcs: before.npcs, items: before.items, rolls: before.rolls }) !== JSON.stringify({ npcs: after.npcs, items: after.items, rolls: after.rolls })) {
    const uploaded: string[] = []
    const persistentNpcs: CampaignNpc[] = []
    try {
      for (const npc of after.npcs) {
        if (!npc.details) { persistentNpcs.push(npc); continue }
        const details = normalizeSheetDetails(npc.details)
        const issue = validateSheetDetails(details)
        if (issue) throw new Error(issue)
        const stored = await persistCharacterImages(npcBucket, `${currentUserId}/${campaignId}/${npc.id}`, details)
        uploaded.push(...stored.uploaded)
        noInlineImages(stored.details)
        persistentNpcs.push({ ...npc, details: stored.details })
      }
      const { error } = await client.from('rpg_campaign_master_data').upsert({ campaign_id: campaignId,
        data: { npcs: persistentNpcs, items: after.items, rolls: after.rolls } }, { onConflict: 'campaign_id' })
      if (error) throw problem(error, 'Não foi possível salvar o painel do mestre.')
    } catch (error) {
      if (uploaded.length) await client.storage.from(npcBucket).remove(uploaded)
      throw error
    }
    const currentPaths = new Set(persistentNpcs.flatMap(npc => characterImagePaths(npc.details)))
    const removedPaths = [...new Set(before.npcs.flatMap(npc => characterImagePaths(npc.details)))].filter(path => !currentPaths.has(path))
    if (removedPaths.length) await client.storage.from(npcBucket).remove(removedPaths)
    // The caller keeps this workspace in memory after saving. Return signed
    // URLs there while keeping the database JSON free of inline images.
    after.npcs = await hydrateNpcs(persistentNpcs)
  }
}

export async function sendCampaignMessage(campaignId: string, body: string): Promise<CampaignMessage> {
  const trimmed = body.trim()
  if (!trimmed || trimmed.length > 1500) throw new Error('Escreva uma mensagem de até 1.500 caracteres.')
  const currentUserId = await userId()
  const client = requireSupabase()
  const { data: campaignData, error: campaignError } = await client.from('rpg_campaigns').select('owner_id').eq('id', campaignId).single()
  if (campaignError || !campaignData) throw problem(campaignError, 'Não foi possível localizar a campanha. Reabra a mesa e tente novamente.')
  const { data, error } = await client.from('rpg_campaign_messages').insert({ campaign_id: campaignId, author_id: currentUserId, body: trimmed }).select('id,author_id,author_name,body,created_at,edited_at').single()
  if (error || !data) throw problem(error, 'Não foi possível enviar sua mensagem. Tente novamente.')
  return messageFromRow(object(data), string(object(campaignData).owner_id))
}

function mediaType(file: Blob): CampaignMedia['type'] {
  return file.type.startsWith('video/') ? 'video' : file.type === 'image/gif' ? 'gif' : 'image'
}

async function uploadMediaFile(campaignId: string, mediaId: string, file: Blob): Promise<{ path: string; url: string; type: CampaignMedia['type'] }> {
  const limit = file.type.startsWith('video/') ? 20 * 1048576 : 5 * 1048576
  const ext = validUpload(file, mediaExtensions, limit)
  const { data: campaign, error: campaignError } = await requireSupabase().from('rpg_campaigns').select('owner_id').eq('id', campaignId).single()
  if (campaignError || !campaign) throw problem(campaignError, 'Mesa não encontrada para receber o arquivo.')
  const path = `${string(object(campaign).owner_id)}/${campaignId}/${mediaId}/${crypto.randomUUID()}.${ext}`
  const bucket = requireSupabase().storage.from(mediaBucket)
  const { error } = await bucket.upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw problem(error, 'Não foi possível anexar o arquivo à comunidade.')
  const { data } = await bucket.createSignedUrl(path, 3600)
  return { path, url: data?.signedUrl ?? '', type: mediaType(file) }
}

async function uploadMediaDataUrl(campaignId: string, mediaId: string, value?: string) {
  return value?.startsWith('data:') ? uploadMediaFile(campaignId, mediaId, await blobFromDataUrl(value)) : null
}

function applyUploadedMedia(item: CampaignMedia, upload: { path: string; url: string; type: CampaignMedia['type'] }) {
  item.mediaPath = upload.path
  item.mediaUrl = upload.url
  item.type = upload.type
  item.imageDataUrl = upload.type === 'video' ? undefined : upload.url
}

export async function editCampaignMessage(campaignId: string, messageId: string, body: string): Promise<CampaignMessage> {
  const trimmed = body.trim()
  if (!trimmed || trimmed.length > 1500) throw new Error('Escreva uma mensagem de até 1.500 caracteres.')
  const client = requireSupabase()
  const { data, error } = await client.from('rpg_campaign_messages').update({ body: trimmed })
    .eq('campaign_id', campaignId).eq('id', messageId).select('id,author_id,author_name,body,created_at,edited_at').single()
  if (error || !data) throw problem(error, 'Não foi possível editar a mensagem. Somente o autor ou mestre pode fazer isso.')
  const { data: campaign } = await client.from('rpg_campaigns').select('owner_id').eq('id', campaignId).single()
  return messageFromRow(object(data), string(object(campaign).owner_id))
}

export interface CommunityPostInput {
  kind: 'media' | 'note'
  title: string
  body: string
  categoryId?: string | null
  file?: File
  mediaType?: CampaignMedia['type']
  mediaUrl?: string
}

export async function createCommunityPost(campaignId: string, input: CommunityPostInput): Promise<CampaignMedia | CampaignNote> {
  const client = requireSupabase()
  const currentUserId = await userId()
  const title = input.title.trim()
  if (!title || title.length > 120) throw new Error('Dê um título de até 120 caracteres à publicação.')
  if (input.kind === 'note') {
    const { data, error } = await client.from('rpg_campaign_notes').insert({ campaign_id: campaignId, author_id: currentUserId,
      title, body: input.body, category_id: input.categoryId || null, shared: true })
      .select('id,title,body,category_id,author_id,shared').single()
    if (error || !data) throw problem(error, 'Não foi possível publicar o texto.')
    return noteFromRow(object(data))
  }
  const { data, error } = await client.from('rpg_campaign_media').insert({ campaign_id: campaignId, author_id: currentUserId,
    title, subtitle: '', description: input.body, category_id: input.categoryId || null,
    media_type: input.mediaType || (input.file ? mediaType(input.file) : 'text'),
    media_url: input.mediaUrl || null, shared: true })
    .select('id,title,subtitle,description,image_path,media_url,media_type,category_id,author_id,shared').single()
  if (error || !data) throw problem(error, 'Não foi possível criar a publicação.')
  const post = mediaFromRow(object(data))
  if (!input.file) return post
  try {
    const upload = await uploadMediaFile(campaignId, post.id, input.file)
    const { error: updateError } = await client.from('rpg_campaign_media').update({ image_path: upload.path, media_type: upload.type })
      .eq('id', post.id).eq('campaign_id', campaignId)
    if (updateError) {
      await client.storage.from(mediaBucket).remove([upload.path])
      throw problem(updateError, 'Não foi possível vincular o arquivo à publicação.')
    }
    applyUploadedMedia(post, upload)
    return post
  } catch (cause) {
    await client.from('rpg_campaign_media').delete().eq('id', post.id).eq('campaign_id', campaignId)
    throw cause
  }
}

export async function editCommunityPost(campaignId: string, kind: 'media' | 'note', id: string,
  changes: { title: string; body: string; categoryId?: string | null; file?: File }): Promise<CampaignMedia | CampaignNote> {
  const client = requireSupabase()
  const title = changes.title.trim()
  if (!title || title.length > 120) throw new Error('Dê um título de até 120 caracteres à publicação.')
  if (kind === 'note') {
    const { data, error } = await client.from('rpg_campaign_notes').update({ title, body: changes.body,
      category_id: changes.categoryId || null }).eq('campaign_id', campaignId).eq('id', id)
      .select('id,title,body,category_id,author_id,shared').single()
    if (error || !data) throw problem(error, 'Somente o autor ou mestre pode editar esta publicação.')
    return noteFromRow(object(data))
  }
  const { data: oldRow, error: oldError } = await client.from('rpg_campaign_media').select('image_path')
    .eq('campaign_id', campaignId).eq('id', id).single()
  if (oldError || !oldRow) throw problem(oldError, 'Publicação não encontrada.')
  const upload = changes.file ? await uploadMediaFile(campaignId, id, changes.file) : null
  const { data, error } = await client.from('rpg_campaign_media').update({ title, description: changes.body,
    category_id: changes.categoryId || null, ...(upload ? { image_path: upload.path, media_type: upload.type, media_url: null } : {}) })
    .eq('campaign_id', campaignId).eq('id', id)
    .select('id,title,subtitle,description,image_path,media_url,media_type,category_id,author_id,shared').single()
  if (error || !data) {
    if (upload) await client.storage.from(mediaBucket).remove([upload.path])
    throw problem(error, 'Somente o autor ou mestre pode editar esta publicação.')
  }
  if (upload && oldRow.image_path) await client.storage.from(mediaBucket).remove([oldRow.image_path])
  return (await hydrateMedia([mediaFromRow(object(data))]))[0]
}

export async function loadCampaignRolls(campaignId: string): Promise<CampaignRoll[]> {
  const { data, error } = await requireSupabase().from('rpg_campaign_rolls')
    .select('id,label,expression,dice,result,author_id,created_at').eq('campaign_id', campaignId)
    .order('created_at', { ascending: false }).limit(200)
  if (error) throw problem(error, 'Não foi possível carregar o histórico de rolagens.')
  return rows(data).map(rollFromRow)
}

export async function recordCampaignRoll(campaignId: string, label: string, count: number, sides: number,
  bonus = 0, mode: 'sum' | 'max' = 'sum'): Promise<CampaignRoll> {
  const { data, error } = await requireSupabase().rpc('rpg_record_roll', {
    p_campaign_id: campaignId, p_label: label, p_count: count, p_sides: sides, p_bonus: bonus, p_mode: mode,
  })
  if (error || !data) throw problem(error, 'Não foi possível registrar a rolagem. Tente novamente.')
  return rollFromRow(object(data))
}

export interface CampaignLog { id: string; actorId?: string; action: string; entityType: string; entityId?: string; details: Row; createdAt: string }

export async function loadCampaignLogs(campaignId: string): Promise<CampaignLog[]> {
  const { data, error } = await requireSupabase().from('rpg_campaign_logs')
    .select('id,actor_id,action,entity_type,entity_id,details,created_at').eq('campaign_id', campaignId)
    .order('created_at', { ascending: false }).limit(200)
  if (error) throw problem(error, 'Não foi possível carregar o registro de atividades desta mesa.')
  return rows(data).map(row => ({ id: string(row.id) || String(row.id), actorId: string(row.actor_id) || undefined,
    action: string(row.action), entityType: string(row.entity_type), entityId: string(row.entity_id) || undefined,
    details: object(row.details), createdAt: string(row.created_at) }))
}

export function subscribeCampaign(campaignId: string, onChange: (table: string) => void): () => void {
  const client = requireSupabase()
  const channel = client.channel(`rpg-campaign-${campaignId}-${crypto.randomUUID()}`)
  for (const table of ['rpg_campaign_messages', 'rpg_campaign_media', 'rpg_campaign_notes',
    'rpg_campaign_categories', 'rpg_campaign_rolls', 'rpg_campaign_master_data', 'rpg_sheets']) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table,
      filter: `campaign_id=eq.${campaignId}` }, () => onChange(table))
  }
  channel.subscribe()
  return () => { void client.removeChannel(channel) }
}

export async function deleteSheet(sheetId: string): Promise<void> {
  const currentUserId = await userId()
  const client = requireSupabase()
  const { data: existing, error: readError } = await client.from('rpg_sheets').select('owner_id,details').eq('id', sheetId).single()
  if (readError || !existing) throw problem(readError, 'Ficha não encontrada.')
  if (existing.owner_id !== currentUserId) throw new Error('Somente o dono pode excluir esta ficha.')
  const details = normalizeSheetDetails(object(object(existing).details))
  const paths = [details.portraitPath, ...details.appearanceImages.map(image => image.path)].filter((path): path is string => Boolean(path))
  const { data, error } = await client.from('rpg_sheets').delete().eq('id', sheetId).select('id').single()
  if (error || !data) throw problem(error, 'Não foi possível excluir a ficha.')
  if (paths.length) {
    // The row is gone; image cleanup is best effort and never reverses the deletion.
    await client.storage.from(sheetBucket).remove(paths)
  }
}

export async function deleteCampaign(campaignId: string): Promise<void> {
  const currentUserId = await userId()
  const client = requireSupabase()
  const { data: campaign, error: campaignError } = await client.from('rpg_campaigns').select('owner_id').eq('id', campaignId).single()
  if (campaignError || !campaign || campaign.owner_id !== currentUserId) throw new Error('Apenas o mestre pode excluir esta mesa.')
  const { data: mediaData, error: readError } = await client.from('rpg_campaign_media').select('image_path').eq('campaign_id', campaignId)
  if (readError) throw problem(readError, 'Não foi possível verificar os arquivos da mesa.')
  const paths = rows(mediaData).map(row => string(row.image_path)).filter(Boolean)
  const { data: masterData, error: masterReadError } = await client.from('rpg_campaign_master_data').select('data')
    .eq('campaign_id', campaignId).maybeSingle()
  if (masterReadError) throw problem(masterReadError, 'Não foi possível verificar as imagens dos NPCs.')
  const npcPaths = normalizeCampaignWorkspace(object(object(masterData).data)).npcs
    .flatMap(npc => characterImagePaths(npc.details))
  const { data, error } = await client.from('rpg_campaigns').delete().eq('id', campaignId).select('id').single()
  if (error || !data) throw problem(error, 'Apenas o mestre pode excluir esta mesa.')
  if (paths.length) {
    await client.storage.from(mediaBucket).remove(paths)
  }
  if (npcPaths.length) await client.storage.from(npcBucket).remove(npcPaths)
}
