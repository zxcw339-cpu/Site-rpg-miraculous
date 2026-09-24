import assert from 'node:assert/strict'
import test from 'node:test'
import { communityContent, emptyCampaignWorkspace, normalizeCampaignWorkspace } from '../src/campaign-model.ts'

test('community never includes private or legacy master notes and media', () => {
  const workspace = emptyCampaignWorkspace()
  workspace.notes = [
    { id: 'legacy', title: 'Antiga', body: 'Privada por padrão' },
    { id: 'private', title: 'Segredo', body: 'Somente mestre', shared: false },
    { id: 'visible', title: 'Para a mesa', body: 'Visível', shared: true },
  ]
  workspace.media = [
    { id: 'hidden', title: 'Imagem privada', subtitle: '', description: '', shared: false },
    { id: 'shown', title: 'Imagem visível', subtitle: '', description: '', shared: true },
  ]
  assert.deepEqual(communityContent(workspace).notes.map(note => note.id), ['visible'])
  assert.deepEqual(communityContent(workspace).media.map(image => image.id), ['shown'])
  workspace.notes[2].shared = false
  workspace.media[1].shared = false
  assert.deepEqual(communityContent(workspace), { notes: [], media: [] })
})

test('community message lists are independent across campaigns and older previews open empty', () => {
  const first = emptyCampaignWorkspace()
  const second = emptyCampaignWorkspace()
  first.messages.push({ id: '1', author: 'Visitante', role: 'player', body: 'Olá', createdAt: '2026-09-24T15:00:00Z' })
  assert.equal(second.messages.length, 0)
  const restored = normalizeCampaignWorkspace({ notes: [{ id: 'old', title: 'Antiga', body: 'Privada' }] })
  assert.deepEqual(restored.messages, [])
  assert.equal(restored.notes.length, 1)
  assert.equal(communityContent(restored).notes.length, 0)
})
