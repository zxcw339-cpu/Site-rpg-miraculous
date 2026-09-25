import assert from 'node:assert/strict'
import test from 'node:test'
import { registrationOutcome } from '../src/auth/registration.ts'

test('a confirmed address returned as an obfuscated signup never appears as a created account', () => {
  const result = registrationOutcome({ user: { identities: [] }, session: null })
  assert.equal(result.kind, 'existing')
  if (result.kind === 'existing') assert.match(result.message, /Nenhuma conta nova foi criada/)
})

test('only a new email identity with no session asks for confirmation', () => {
  const result = registrationOutcome({ user: { identities: [{ provider: 'email' }] }, session: null })
  assert.equal(result.kind, 'confirmation')
  if (result.kind === 'confirmation') assert.match(result.message, /Confir/)
})

test('a usable session is authenticated, while an unclassifiable signup does not claim success', () => {
  assert.equal(registrationOutcome({ user: { identities: [] }, session: {} }).kind, 'authenticated')
  assert.equal(registrationOutcome({ user: { }, session: null }).kind, 'unknown')
  assert.equal(registrationOutcome({ user: null, session: null }).kind, 'unknown')
})
