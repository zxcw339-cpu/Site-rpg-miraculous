import assert from 'node:assert/strict'
import test from 'node:test'
import { isValidEmail, isValidUsername, normalizeUsername, validateRegistration } from '../src/auth/validation.ts'

const valid = { username: 'gabriel.rpg', name: 'Gabriel', email: 'gabriel@example.com', password: 'uma-senha-forte', bio: '' }

test('normalizes login names without accepting accents, whitespace or e-mail syntax', () => {
  assert.equal(normalizeUsername('  GABRIEL.RPG '), 'gabriel.rpg')
  for (const username of ['gabriel.rpg', 'gabriel_rpg', 'rpg-123', 'abc', 'a'.repeat(32)]) assert.equal(isValidUsername(username), true, username)
  for (const username of ['ab', 'a'.repeat(33), 'joão', 'dois nomes', 'nome@site', '-nome', 'ADMIN']) assert.equal(isValidUsername(username), false, username)
})

test('registration validates e-mail and matching passwords without trimming the password', () => {
  assert.deepEqual(validateRegistration(valid, valid.password), {})
  assert.ok(validateRegistration({ ...valid, email: 'not-an-email' }, valid.password).email)
  assert.ok(validateRegistration({ ...valid, password: '1234567' }, '1234567').password)
  assert.ok(validateRegistration({ ...valid, password: 'x'.repeat(257) }, 'x'.repeat(257)).password)
  assert.ok(validateRegistration(valid, `${valid.password} `).confirmation)
  assert.ok(validateRegistration(valid, '').confirmation)
})

test('registration preserves display-name and bio limits independently of unique username', () => {
  assert.deepEqual(validateRegistration({ ...valid, name: 'João da Silva', username: ' JOAO.RPG ' }, valid.password), {})
  assert.ok(validateRegistration({ ...valid, name: '  ' }, valid.password).name)
  assert.ok(validateRegistration({ ...valid, name: 'a'.repeat(81) }, valid.password).name)
  assert.ok(validateRegistration({ ...valid, bio: 'a'.repeat(301) }, valid.password).bio)
})

test('e-mail validation rejects malformed and oversized recovery destinations', () => {
  assert.equal(isValidEmail('name+game@example.com'), true)
  for (const email of ['person', 'person@', '@example.com', 'a b@example.com', 'a@b@c.com', `${'a'.repeat(250)}@b.com`]) assert.equal(isValidEmail(email), false, email)
})
