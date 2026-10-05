import assert from 'node:assert/strict'
import test from 'node:test'
import { allowedMiraculous, emptyMiraculousRules, miraculousCatalog, normalizeMiraculousRules } from '../src/miraculous-model.ts'
import { emptySheetDetails, formGrant, normalizeSheetDetails, rollSheetTest, skillLabel } from '../src/sheet-model.ts'
import { getFormTheme, defaultTheme, baseFormTheme } from '../src/themes/themes.ts'

test('campaign veto wins over individual permission and other campaigns remain independent', () => {
  const rules = emptyMiraculousRules()
  rules.disabledFormIds = ['kitsune']
  rules.sheetDisabledFormIds.a = ['aranha']
  assert.equal(allowedMiraculous(rules, 'a').length, 17)
  assert.equal(allowedMiraculous(rules, 'b').length, 18)
  assert.equal(allowedMiraculous(emptyMiraculousRules(), 'a').length, 19)
  assert.ok(allowedMiraculous(rules, 'a').every(form => form.id !== 'kitsune' && form.id !== 'aranha'))
  rules.disabledFormIds = []
  assert.ok(allowedMiraculous(rules, 'a').some(form => form.id === 'kitsune'))
  assert.ok(!allowedMiraculous(rules, 'a').some(form => form.id === 'aranha'))
})
test('custom forms survive saving and add their own bonuses without modifying civil values', () => {
  const rules = emptyMiraculousRules()
  rules.customForms.push({ id: 'custom-londres', name: 'Relógio', concept: 'O Ritmo' })
  const sheet = emptySheetDetails()
  const luta = sheet.skills[0]
  luta.civil = 5; sheet.attributes.Força.civil = 2
  sheet.forms.push({ id: 'custom-londres', attributes: { Força: 1 }, skills: { [luta.id]: 5 } })
  const restored = normalizeSheetDetails(JSON.parse(JSON.stringify(sheet)))
  assert.equal(formGrant(restored, 'custom-londres', 'skill', luta.id), 5)
  assert.equal(rollSheetTest(restored, 'custom-londres', 'Força', luta.id, () => .45).total, 20)
  assert.equal(restored.attributes.Força.civil, 2)
  rules.disabledFormIds.push('custom-londres')
  assert.ok(!allowedMiraculous(rules).some(form => form.id === 'custom-londres'))
  rules.disabledFormIds = []
  assert.ok(allowedMiraculous(rules).some(form => form.id === 'custom-londres'))
  assert.equal(formGrant(restored, 'custom-londres', 'skill', luta.id), 5)
})
test('catalog normalization excludes duplicate and reserved identities', () => {
  const rules = normalizeMiraculousRules({ customForms: [
    { id: 'kitsune', name: 'Outro', concept: '' }, { id: 'civil', name: 'Civil', concept: '' },
    { id: 'custom-a', name: 'Novo', concept: '' }, { id: 'custom-a', name: 'Duplicado', concept: '' },
  ], disabledFormIds: ['custom-a', 'custom-a', 'inexistente'] })
  assert.equal(miraculousCatalog(rules).length, 20)
  assert.deepEqual(rules.disabledFormIds, ['custom-a'])
})
test('forms without finished themes use the white base and custom forms can select finished artwork', () => {
  const forms = miraculousCatalog()
  for (const form of forms) assert.ok(getFormTheme(form).id !== defaultTheme.id || form.id === 'aranha')
  assert.equal(getFormTheme(forms.find(form => form.id === 'kitsune')!).id, 'preview-kitsune')
  for (const id of ['pegaso', 'jormungandr', 'hidra', 'minotauro', 'fenrir', 'sereia', 'gargula', 'qilin', 'esfinge', 'grifo', 'morcego'])
    assert.equal(getFormTheme(forms.find(form => form.id === id)!), baseFormTheme)
  assert.equal(getFormTheme({ id: 'custom-a', name: 'Novo', concept: '' }), baseFormTheme)
  assert.equal(getFormTheme({ id: 'custom-a', name: 'Novo', concept: '', themeId: 'preview-corvo' }).id, 'preview-corvo')
})
test('knowledge and craft specialties persist without changing skill identities or roll bonuses', () => {
  const sheet = emptySheetDetails()
  const knowledge = sheet.skills.find(skill => skill.name === 'Conhecimento')!
  knowledge.specialty = 'Mecânica'; knowledge.civil = 5; sheet.attributes.Intelecto.civil = 2
  const restored = normalizeSheetDetails(JSON.parse(JSON.stringify(sheet)))
  const skill = restored.skills.find(item => item.id === knowledge.id)!
  assert.equal(skillLabel(skill), 'Conhecimento (Mecânica)')
  assert.equal(rollSheetTest(restored, 'civil', 'Intelecto', skill.id, () => 0).total, 6)
  assert.equal(skillLabel({ name: 'Ofício', specialty: 'Design gráfico' }), 'Ofício (Design gráfico)')
})
