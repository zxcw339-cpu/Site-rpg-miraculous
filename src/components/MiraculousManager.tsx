import { useState } from 'react'
import type { FormEvent } from 'react'
import { miraculousCatalog, type MiraculousRules } from '../miraculous-model'
import { availableThemes } from '../themes/themes'

export function MiraculousManager({ rules, characters, onChange, saving }: {
  rules: MiraculousRules
  characters: { id: string; name: string }[]
  onChange: (rules: MiraculousRules) => Promise<boolean>
  saving: boolean
}) {
  const [scope, setScope] = useState('')
  const [name, setName] = useState('')
  const [concept, setConcept] = useState('')
  const [themeId, setThemeId] = useState('')
  const [error, setError] = useState('')
  const catalog = miraculousCatalog(rules)
  const selectedScope = characters.some(character => character.id === scope) ? scope : ''
  async function toggle(id: string, permitted: boolean) {
    const next = structuredClone(rules)
    const ids = selectedScope ? next.sheetDisabledFormIds[selectedScope] ?? [] : next.disabledFormIds
    const updated = permitted ? ids.filter(value => value !== id) : [...new Set([...ids, id])]
    if (selectedScope) next.sheetDisabledFormIds[selectedScope] = updated
    else next.disabledFormIds = updated
    await onChange(next)
  }
  async function add(event: FormEvent) {
    event.preventDefault(); setError('')
    if (!name.trim()) return
    if (catalog.some(form => form.name.toLocaleLowerCase('pt-BR') === name.trim().toLocaleLowerCase('pt-BR'))) { setError('Já existe um Miraculous com esse nome.'); return }
    if (rules.customForms.length >= 64) { setError('Esta mesa já tem 64 Miraculous adicionais.'); return }
    const next = structuredClone(rules)
    next.customForms.push({ id: `custom-${crypto.randomUUID()}`, name: name.trim(), concept: concept.trim(), ...(themeId ? { themeId } : {}) })
    if (await onChange(next)) { setName(''); setConcept(''); setThemeId('') }
  }
  return <section className="campaign-panel miraculous-manager">
    <p className="home-overline">CONTROLE DO MESTRE</p><h2>Caixa de Miraculous</h2>
    <p>Os 18 Miraculous de Paris e o Morcego de Londres estão disponíveis inicialmente. Desmarque os que não podem aparecer nas transformações.</p>
    <label>Aplicar permissões a<select value={selectedScope} disabled={saving} onChange={event => setScope(event.target.value)}><option value="">Toda a mesa</option>{characters.map(character => <option key={character.id} value={character.id}>{character.name}</option>)}</select></label>
    <p className="miraculous-scope-hint">{selectedScope ? 'O veto desta ficha se soma ao veto da mesa.' : 'Este controle vale para todas as fichas e NPCs vinculados a esta mesa.'} Os bônus já configurados são preservados.</p>
    <div className="miraculous-permissions">{catalog.map(form => {
      const globalVeto = rules.disabledFormIds.includes(form.id)
      const localVeto = selectedScope && (rules.sheetDisabledFormIds[selectedScope] ?? []).includes(form.id)
      return <label key={form.id} className={globalVeto || localVeto ? 'miraculous-vetoed' : ''}>
        <input type="checkbox" checked={!globalVeto && !localVeto} disabled={saving || Boolean(selectedScope && globalVeto)} onChange={event => { void toggle(form.id, event.target.checked) }} />
        <span><strong>{form.name}</strong><small>{form.concept}{globalVeto && selectedScope ? ' · Vetado na mesa' : ''}</small></span>
        <span className="miraculous-access">{globalVeto || localVeto ? 'Vetado' : 'Permitido'}</span>
      </label>
    })}</div>
    <details className="miraculous-custom-form"><summary>＋ Adicionar Miraculous à mesa</summary><form onSubmit={add}>
      <div className="campaign-form-grid"><label>Nome<input value={name} maxLength={80} required disabled={saving} onChange={event => setName(event.target.value)} /></label><label>Conceito<input value={concept} maxLength={120} placeholder="Ex.: A Memória" disabled={saving} onChange={event => setConcept(event.target.value)} /></label></div>
      <label>Tema na transformação<select value={themeId} disabled={saving} onChange={event => setThemeId(event.target.value)}><option value="">Paleta discreta</option>{availableThemes.map(theme => <option key={theme.id} value={theme.id}>{theme.name}</option>)}</select></label>
      {error && <p role="alert">{error}</p>}<button className="hub-button hub-button-primary" disabled={saving}>Adicionar Miraculous</button>
    </form></details>
  </section>
}
