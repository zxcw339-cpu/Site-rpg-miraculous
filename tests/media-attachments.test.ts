import assert from 'node:assert/strict'
import test from 'node:test'
import { attachmentIssue, mediaAttachments } from '../src/media-model.ts'
test('mixed images and videos respect per-file limits and the combined gallery size', () => {
  const files = [ { type: 'image/png', size: 100 }, { type: 'image/jpeg', size: 200 }, { type: 'image/gif', size: 300 }, { type: 'image/webp', size: 400 }, { type: 'video/mp4', size: 19_000_000 } ]
  assert.equal(attachmentIssue(files), null)
  assert.match(attachmentIssue(files, 4)!, /8 arquivos/)
  assert.match(attachmentIssue([{ type: 'image/svg+xml', size: 100 }])!, /PNG/)
  assert.match(attachmentIssue([{ type: 'image/jpeg', size: 5_000_001 }])!, /5 MB/)
})
test('older single-file publications still render and new galleries preserve each attachment', () => {
  const old = { id: 'post', title: 'Foto', subtitle: '', description: '', shared: true, mediaPath: 'saved/path.png', mediaUrl: 'https://example.org/signed' }
  assert.equal(mediaAttachments(old)[0].path, 'saved/path.png')
  const gallery = { ...old, attachments: [{ id: 'a', name: 'a.jpg', type: 'image' as const, path: 'a.jpg' }, { id: 'b', name: 'b.png', type: 'image' as const, path: 'b.png' }] }
  assert.deepEqual(mediaAttachments(gallery).map(file => file.id), ['a', 'b'])
  assert.deepEqual(mediaAttachments({ ...old, attachments: [] }), [])
})
