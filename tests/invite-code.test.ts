import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeInviteCode } from '../src/invite-code.ts'

test('six-digit codes preserve leading zeroes', () => {
  assert.equal(normalizeInviteCode(' 004219 '), '004219')
})

test('legacy invites remain valid without case sensitivity', () => {
  assert.equal(normalizeInviteCode('ABCDEF0123456789ABCDEF0123456789'), 'abcdef0123456789abcdef0123456789')
})

test('partial or malformed codes cannot be sent to the database', () => {
  for (const value of ['12345', '1234567', 'ABC123', '1 23456']) {
    assert.throws(() => normalizeInviteCode(value), /6 dígitos/)
  }
})
