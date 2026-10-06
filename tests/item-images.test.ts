import assert from 'node:assert/strict'
import { test } from 'node:test'
import { hydrateItemImages, itemImageIssue, itemImagePaths, persistItemImages, withoutItemImage } from '../src/item-images.ts'
import { assignSheetResource, editableForm, emptySheetDetails, formResources, normalizeSheetDetails, validateSheetDetails } from '../src/sheet-model.ts'

const png = 'data:image/png;base64,aGVsbG8='
const prefix = 'owner/sheet'

test('item images accept PNG, JPG and WebP, rejecting empty, oversized or unsupported files', () => {
  for (const type of ['image/png', 'image/jpeg', 'image/webp']) assert.equal(itemImageIssue({ type, size: 5 * 1048576 }), null)
  for (const file of [{ type: 'image/gif', size: 10 }, { type: 'image/svg+xml', size: 10 },
    { type: 'image/jpeg', size: 0 }, { type: 'image/png', size: 5 * 1048576 + 1 }]) assert.match(itemImageIssue(file)!, /PNG, JPG ou WebP/)
})

test('civil and transformed images save only private paths and hydrate correctly after reopening', async () => {
  const details = emptySheetDetails()
  details.inventory.push({ id: 'bag', name: 'Mochila', notes: '', imageDataUrl: png })
  editableForm(details, 'corvos-de-odin').inventory.push({ id: 'weapon', name: 'Arma', notes: '', imageDataUrl: png })
  const uploaded: string[] = []
  const files = new Map<string, Blob>()
  const upload = async (path: string, blob: Blob) => { files.set(path, blob) }
  details.inventory = await persistItemImages(details.inventory, prefix, upload, uploaded)
  const corvo = editableForm(details, 'corvos-de-odin')
  corvo.inventory = await persistItemImages(corvo.inventory, prefix, upload, uploaded)
  assert.equal(files.size, 2)
  assert.equal(uploaded.length, 2)
  assert.match(uploaded[0], /^owner\/sheet\/items\/.+\.png$/)
  assert.ok(!JSON.stringify(details).includes('data:image'))
  const urls = new Map(uploaded.map(path => [path, `https://storage.example/signed/${path}`]))
  const reloaded = hydrateItemImages(normalizeSheetDetails(JSON.parse(JSON.stringify(details))), urls)
  assert.equal(reloaded.inventory[0].imageDataUrl, urls.get(uploaded[0]))
  assert.equal(formResources(reloaded, 'corvos-de-odin').inventory[0].imageDataUrl, urls.get(uploaded[1]))
  assert.equal(formResources(reloaded, 'civil').inventory.length, 0)
  assert.equal(formResources(reloaded, 'kitsune').inventory.length, 0)
  assert.deepEqual(itemImagePaths(reloaded), uploaded)
  // Ordinary edits reuse existing storage files and never persist signed URLs.
  reloaded.inventory = await persistItemImages(reloaded.inventory, prefix, upload, uploaded)
  assert.equal(uploaded.length, 2)
  assert.equal(reloaded.inventory[0].imageDataUrl, undefined)
})

test('replacing and removing an image preserves the item and allows old-file cleanup', async () => {
  const original = { id: 'bag', name: 'Mochila', notes: 'Civil', imagePath: `${prefix}/items/old.png`, imageDataUrl: png }
  const uploaded: string[] = []
  const [changed] = await persistItemImages([original], prefix, async () => {}, uploaded)
  assert.notEqual(changed.imagePath, original.imagePath)
  assert.equal(changed.name, original.name)
  assert.deepEqual(withoutItemImage(changed), { id: 'bag', name: 'Mochila', notes: 'Civil' })
  assert.equal(original.imageDataUrl, png)
})

test('master reassignment carries the image without duplicate uploads or lost cleanup references', () => {
  const details = emptySheetDetails()
  const path = `${prefix}/items/weapon.jpg`
  details.inventory.push({ id: 'weapon', name: 'Arma', notes: '', imagePath: path })
  assignSheetResource(details, 'inventory', 'weapon', 'civil', 'corvos-de-odin')
  assert.deepEqual(details.inventory, [])
  assert.deepEqual(itemImagePaths(details), [path])
  assignSheetResource(details, 'inventory', 'weapon', 'corvos-de-odin', 'civil')
  assert.equal(details.inventory[0].imagePath, path)
  assert.deepEqual(itemImagePaths(details), [path])
})

test('foreign paths and invalid inline formats are refused, successful uploads remain available for rollback', async () => {
  const uploaded: string[] = []
  await assert.rejects(persistItemImages([
    { id: 'valid', name: 'Valid', notes: '', imageDataUrl: png },
    { id: 'foreign', name: 'Foreign', notes: '', imagePath: 'another/sheet/items/a.png' },
  ], prefix, async () => {}, uploaded), /não pertence/)
  assert.equal(uploaded.length, 1)
  await assert.rejects(persistItemImages([{ id: 'bad', name: 'Bad', notes: '', imageDataUrl: 'data:image/svg+xml;base64,aA==' }], prefix, async () => {}, []), /PNG/)
})

test('a selected form image does not exhaust the JSON quota before it is uploaded', () => {
  const details = emptySheetDetails()
  const item = { id: 'weapon', name: 'Arma', notes: '', imageDataUrl: png + 'A'.repeat(100_000) }
  editableForm(details, 'corvos-de-odin').inventory.push(item)
  assert.equal(validateSheetDetails(details), null)
  item.notes = 'A'.repeat(70_000)
  assert.match(validateSheetDetails(details)!, /detalhes/)
})
