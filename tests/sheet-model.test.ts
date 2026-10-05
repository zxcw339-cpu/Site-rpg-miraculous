import assert from 'node:assert/strict'
import test from 'node:test'
import { assignSheetResource, availableForms, editableForm, effectiveValue, emptySheetDetails, formGrant, formResources, normalizeSheetDetails, rollDicePool, rollSheetTest, validateSheetDetails } from '../src/sheet-model.ts'

test('new sheets start blank and keep civil values separate from each form', () => {
  const sheet = emptySheetDetails()
  assert.deepEqual(Object.keys(sheet.resources), ['Vida', 'Sanidade', 'Energia', 'Proteção'])
  assert.equal(sheet.attributes.Força.civil, null)
  assert.equal(sheet.skills.find(skill => skill.name === 'Luta')?.civil, null)
  assert.equal(availableForms.length, 19)
  assert.deepEqual(sheet.forms.map(form => form.id), availableForms.map(form => form.id))
  assert.equal(availableForms.find(form => form.id === 'aranha')?.name, 'Aracne')
  assert.equal(availableForms.find(form => form.id === 'kitsune')?.concept, 'A Persuasão')
  assert.equal(sheet.inventory.length, 0)
  assert.equal(sheet.abilities.length, 0)
})

test('adding new forms preserves existing grants and starts other forms without bonuses', () => {
  const previous = emptySheetDetails()
  const luta = previous.skills.find(skill => skill.name === 'Luta')!
  previous.forms.find(form => form.id === 'aranha')!.skills[luta.id] = 5
  previous.forms = previous.forms.filter(form => form.id === 'aranha' || form.id === 'kitsune')
  const updated = normalizeSheetDetails(previous)
  assert.equal(updated.forms.length, 19)
  assert.equal(formGrant(updated, 'aranha', 'skill', luta.id), 5)
  assert.equal(formGrant(updated, 'pegaso', 'skill', luta.id), 0)
})

test('resource current value cannot exceed the maximum', () => {
  const sheet = emptySheetDetails()
  sheet.resources.Vida = { current: 12, max: 10 }
  assert.match(validateSheetDetails(sheet) ?? '', /Vida.*máximo/)
})

test('civil skill bonus passes into the transformed total and each form adds only its own grant', () => {
  const sheet = emptySheetDetails()
  const luta = sheet.skills.find(skill => skill.name === 'Luta')!
  const pontaria = sheet.skills.find(skill => skill.name === 'Pontaria')!
  luta.civil = 5
  pontaria.civil = 10
  sheet.forms.find(form => form.id === 'kitsune')!.skills[luta.id] = 5
  sheet.forms.find(form => form.id === 'aranha')!.skills[pontaria.id] = 5
  assert.equal(effectiveValue(luta.civil, formGrant(sheet, 'kitsune', 'skill', luta.id)), 10)
  assert.equal(effectiveValue(luta.civil, formGrant(sheet, 'aranha', 'skill', luta.id)), 5)
  assert.equal(effectiveValue(pontaria.civil, formGrant(sheet, 'aranha', 'skill', pontaria.id)), 15)
  assert.equal(validateSheetDetails(sheet), null)
})

test('attribute dice inherit the civil count and transformation grants add whole dice', () => {
  const sheet = emptySheetDetails()
  sheet.attributes.Força.civil = 2
  sheet.forms.find(form => form.id === 'aranha')!.attributes.Força = 1
  assert.equal(effectiveValue(sheet.attributes.Força.civil, formGrant(sheet, 'aranha', 'attribute', 'Força')), 3)
  assert.equal(effectiveValue(sheet.attributes.Força.civil, formGrant(sheet, 'kitsune', 'attribute', 'Força')), 2)
  assert.equal(effectiveValue(null, 1), null)
})

test('civil and granted bonuses obey their increments', () => {
  const sheet = emptySheetDetails()
  sheet.skills[0].civil = 7
  assert.match(validateSheetDetails(sheet) ?? '', /5 em 5/)
  sheet.skills[0].civil = 5
  sheet.forms[0].skills[sheet.skills[0].id] = 3
  assert.match(validateSheetDetails(sheet) ?? '', /passos de 5/)
  sheet.forms[0].skills[sheet.skills[0].id] = 5
  sheet.attributes.Força.civil = 1.5
  assert.match(validateSheetDetails(sheet) ?? '', /inteiro/)
})

test('direct transformed rolls use the combined dice pool and add the combined skill once', () => {
  const sheet = emptySheetDetails()
  const luta = sheet.skills.find(skill => skill.name === 'Luta')!
  sheet.attributes.Força.civil = 2
  luta.civil = 5
  const kitsune = sheet.forms.find(form => form.id === 'kitsune')!
  kitsune.attributes.Força = 1
  kitsune.skills[luta.id] = 5
  const values = [0, 0.95, 0.45]
  const result = rollSheetTest(sheet, 'kitsune', 'Força', luta.id, () => values.shift()!)
  assert.deepEqual(result, { dice: [1, 20, 10], bonus: 10, total: 30 })
  assert.deepEqual(rollSheetTest(sheet, 'civil', 'Força', luta.id, () => 0), { dice: [1, 1], bonus: 5, total: 6 })
})

test('free d20 works without a sheet and undefined attributes return a clear error', () => {
  assert.deepEqual(rollDicePool(1, 0, () => 0.95), { dice: [20], bonus: 0, total: 20 })
  assert.throws(() => rollSheetTest(emptySheetDetails(), 'civil', 'Força'), /Preencha Força/)
  assert.throws(() => rollDicePool(31), /1 a 30/)
})

test('Corvo items and abilities are visible only in Corvo and survive repeated form changes', () => {
  const sheet = emptySheetDetails()
  sheet.inventory.push({ id: 'civil', name: 'Mochila', notes: 'Itens pessoais' })
  sheet.abilities.push({ id: 'common', kind: 'Passiva', name: 'Observador', description: 'Sempre disponível' })
  const corvo = editableForm(sheet, 'corvos-de-odin')
  corvo.inventory.push({ id: 'weapon', name: 'Arma do Corvo', notes: '1d12' })
  corvo.abilities.push({ id: 'memory', kind: 'Miraculous', name: 'Memória', description: 'Poder da forma' })
  const before = JSON.stringify(sheet)
  for (const form of ['civil', 'corvos-de-odin', 'kitsune', 'civil', 'corvos-de-odin']) {
    assert.equal(formResources(sheet, form).inventory.length, form === 'corvos-de-odin' ? 1 : 0)
    assert.equal(formResources(sheet, form).abilities.length, form === 'corvos-de-odin' ? 1 : 0)
    assert.equal(sheet.inventory[0].name, 'Mochila')
    assert.equal(sheet.abilities[0].name, 'Observador')
  }
  assert.equal(JSON.stringify(sheet), before)
  const reloaded = normalizeSheetDetails(JSON.parse(JSON.stringify(sheet)))
  assert.deepEqual(formResources(reloaded, 'corvos-de-odin'), { inventory: corvo.inventory, abilities: corvo.abilities })
  assert.deepEqual(formResources(reloaded, 'civil'), { inventory: [], abilities: [] })
})

test('master can assign existing civil resources to a form without copying them', () => {
  const sheet = emptySheetDetails()
  sheet.inventory.push({ id: 'weapon', name: 'Arma do Corvo', notes: 'Alcance médio' })
  sheet.abilities.push({ id: 'power', kind: 'Técnica', name: 'Memória', description: '3 energia' })
  assignSheetResource(sheet, 'inventory', 'weapon', 'civil', 'corvos-de-odin')
  assignSheetResource(sheet, 'abilities', 'power', 'civil', 'corvos-de-odin')
  assert.deepEqual(sheet.inventory, [])
  assert.deepEqual(sheet.abilities, [])
  assert.equal(formResources(sheet, 'corvos-de-odin').inventory[0].id, 'weapon')
  assignSheetResource(sheet, 'inventory', 'weapon', 'corvos-de-odin', 'kitsune')
  assert.deepEqual(formResources(sheet, 'corvos-de-odin').inventory, [])
  assert.equal(formResources(sheet, 'kitsune').inventory[0].notes, 'Alcance médio')
  assignSheetResource(sheet, 'inventory', 'weapon', 'kitsune', 'civil')
  assert.equal(sheet.inventory.length, 1)
  assert.deepEqual(formResources(sheet, 'kitsune').inventory, [])
  assert.equal(formResources(sheet, 'corvos-de-odin').abilities[0].id, 'power')
})

test('old sheets and custom Miraculous retain grants and gain empty resource boxes', () => {
  const sheet = normalizeSheetDetails({ forms: [{ id: 'custom-foo', attributes: { Força: 2 }, skills: { luta: 5 } }] })
  assert.equal(formGrant(sheet, 'custom-foo', 'attribute', 'Força'), 2)
  assert.deepEqual(formResources(sheet, 'custom-foo'), { inventory: [], abilities: [] })
  editableForm(sheet, 'custom-foo').inventory.push({ id: 'staff', name: 'Cajado', notes: '' })
  const reloaded = normalizeSheetDetails(JSON.parse(JSON.stringify(sheet)))
  assert.equal(formResources(reloaded, 'custom-foo').inventory[0].name, 'Cajado')
  assert.deepEqual(formResources(reloaded, 'civil').inventory, [])
  assert.throws(() => editableForm(sheet, 'civil'), /recursos civis/)
})

test('incomplete form resources are rejected before saving', () => {
  const sheet = emptySheetDetails()
  const form = editableForm(sheet, 'corvos-de-odin')
  form.inventory.push({ id: 'weapon', name: '', notes: '' })
  assert.match(validateSheetDetails(sheet) ?? '', /nome.*item/)
  form.inventory[0].name = 'Arma'
  form.abilities.push({ id: 'power', kind: 'Técnica', name: '', description: '' })
  assert.match(validateSheetDetails(sheet) ?? '', /nome.*habilidade/)
  form.abilities[0].name = 'Memória'
  assert.equal(validateSheetDetails(sheet), null)
})
