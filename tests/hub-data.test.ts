import assert from 'node:assert/strict'
import test from 'node:test'
import { findPlayerCampaign } from '../src/hub-data.ts'
import type { Campaign } from '../src/hub-data.ts'

const campaigns: Campaign[] = [
  { id: 'player-table', name: 'Mesa de jogador', role: 'player', isExample: true },
  { id: 'master-table', name: 'Mesa de mestre', role: 'master', isExample: true },
]

test('personal sheets can link to a campaign where the user is a player', () => {
  assert.equal(findPlayerCampaign(campaigns, 'player-table'), campaigns[0])
})

test('personal sheets cannot link to a campaign where the user is master', () => {
  assert.equal(findPlayerCampaign(campaigns, 'master-table'), undefined)
})

test('missing, removed and null campaign links are treated as unlinked', () => {
  assert.equal(findPlayerCampaign(campaigns, 'unknown-table'), undefined)
  assert.equal(findPlayerCampaign([], 'player-table'), undefined)
  assert.equal(findPlayerCampaign(campaigns, null), undefined)
})

test('an existing link stops resolving if the user becomes master', () => {
  const changedRoles = campaigns.map(campaign => ({ ...campaign, role: 'master' as const }))
  assert.equal(findPlayerCampaign(changedRoles, 'player-table'), undefined)
})
