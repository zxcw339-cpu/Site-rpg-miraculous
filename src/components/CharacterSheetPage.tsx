import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, RefObject } from 'react'
import type { CharacterSheet } from '../hub-data'
import type { CampaignRoll } from '../campaign-model'
import { attributeNames, availableForms, effectiveValue, formGrant, normalizeSheetDetails, parseAmount, resourceNames, rollDicePool, rollSheetTest, validateSheetDetails } from '../sheet-model'
import type { AbilityKind, AttributeName, SheetDetails, SheetForm, SheetRoll } from '../sheet-model'
import { Modal } from './Modal'
import '../sheet-page.css'

interface Props {
  sheet: CharacterSheet
  titleRef: RefObject<HTMLHeadingElement | null>
  onSave: (name: string, details: SheetDetails) => SheetDetails | void | Promise<SheetDetails | void>
  backHref?: string
  backLabel?: string
  headingContext?: string
  pageTitle?: string
  masterManaged?: boolean
  civilEditable?: boolean
  contextNote?: string
  persisted?: boolean
  onRecordRoll?: (label: string, count: number, sides: number, bonus: number, mode: 'sum' | 'max') => Promise<CampaignRoll>
}

type RollResult = SheetRoll & { label: string }

function NumberField({ label, value, step, onChange, disabled = false }: { label: string; value: number | null; step: number; onChange: (value: number | null) => void; disabled?: boolean }) {
  return <input aria-label={label} type="number" min="0" step={step} inputMode="numeric" value={value ?? ''} placeholder="—" disabled={disabled}
    onChange={event => onChange(parseAmount(event.target.value))} />
}

function readPng(file: File): Promise<string> {
  if (file.type !== 'image/png' || file.size > 5_000_000) return Promise.reject(new Error('Use um PNG de até 5 MB.'))
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Não foi possível abrir a imagem.'))
    reader.onerror = () => reject(new Error('Não foi possível abrir a imagem.'))
    reader.readAsDataURL(file)
  })
}

export function CharacterSheetPage({ sheet, titleRef, onSave, onRecordRoll, backHref = '#fichas', backLabel = 'Voltar às fichas', headingContext = 'SEUS PERSONAGENS / FICHA', pageTitle = 'Ficha de personagem', masterManaged = false, civilEditable = true, contextNote, persisted = false }: Props) {
  const [name, setName] = useState(sheet.name)
  const [draft, setDraft] = useState<SheetDetails>(() => normalizeSheetDetails(sheet.details))
  const [activeForm, setActiveForm] = useState<SheetForm>('civil')
  const [miraculousOpen, setMiraculousOpen] = useState(false)
  const [grantEditorOpen, setGrantEditorOpen] = useState(false)
  const [rollAttribute, setRollAttribute] = useState<AttributeName>('Força')
  const [rollResult, setRollResult] = useState<RollResult | null>(null)
  const [rollError, setRollError] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const editRevision = useRef(0)
  const savedRevision = useRef(0)
  const iconClicks = useRef({ count: 0, last: 0 })
  const formName = activeForm === 'civil' ? 'Civil' : availableForms.find(form => form.id === activeForm)?.name ?? 'Transformada'

  useEffect(() => {
    if (editRevision.current !== savedRevision.current) return
    setName(sheet.name)
    setDraft(normalizeSheetDetails(sheet.details))
  }, [sheet.name, sheet.details])

  useEffect(() => {
    if (!rollResult && !rollError) return
    const timer = window.setTimeout(() => { setRollResult(null); setRollError('') }, 5_000)
    return () => window.clearTimeout(timer)
  }, [rollResult, rollError])

  function edit(change: (next: SheetDetails) => void) {
    editRevision.current += 1
    setDraft(current => { const next = structuredClone(current); change(next); return next })
    setMessage('')
    setError('')
  }
  async function save() {
    if (saving) return
    if (!name.trim()) { setError('Dê um nome à ficha.'); return }
    const problem = validateSheetDetails(draft)
    if (problem) { setError(problem); return }
    setSaving(true)
    setError('')
    setMessage('')
    const revisionAtSave = editRevision.current
    try {
      const canonical = await onSave(name.trim(), structuredClone(draft))
      savedRevision.current = revisionAtSave
      if (editRevision.current === revisionAtSave && canonical) setDraft(normalizeSheetDetails(canonical))
      setMessage(editRevision.current === revisionAtSave
        ? persisted ? 'Ficha salva na sua conta.' : 'Ficha salva nesta prévia. Os dados serão descartados ao recarregar ou sair.'
        : 'As alterações anteriores foram salvas. Há edições novas: salve novamente antes de sair.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar a ficha. Tente novamente.')
    } finally { setSaving(false) }
  }
  function clickIcon() {
    const now = performance.now()
    iconClicks.current.count = now - iconClicks.current.last < 1200 ? iconClicks.current.count + 1 : 1
    iconClicks.current.last = now
    if (iconClicks.current.count === 3) { setMiraculousOpen(current => !current); iconClicks.current.count = 0 }
  }
  function bonusForAttribute(attribute: AttributeName) { return activeForm === 'civil' ? 0 : formGrant(draft, activeForm, 'attribute', attribute) }
  function bonusForSkill(id: string) { return activeForm === 'civil' ? 0 : formGrant(draft, activeForm, 'skill', id) }
  function setAttributeGrant(attribute: AttributeName, value: number | null) {
    if (activeForm === 'civil' || !masterManaged) return
    edit(next => { const form = next.forms.find(item => item.id === activeForm)!; if (value === null) delete form.attributes[attribute]; else form.attributes[attribute] = value })
  }
  function setSkillGrant(id: string, value: number | null) {
    if (activeForm === 'civil' || !masterManaged) return
    edit(next => { const form = next.forms.find(item => item.id === activeForm)!; if (value === null) delete form.skills[id]; else form.skills[id] = value })
  }
  async function choosePortrait(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try { const dataUrl = await readPng(file); edit(next => { next.portraitDataUrl = dataUrl }) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível abrir o PNG.') }
    event.target.value = ''
  }
  async function chooseAppearanceImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return
    if (files.length + draft.appearanceImages.length > 6) { setError('A aparência aceita até seis imagens PNG.'); event.target.value = ''; return }
    try {
      const images = await Promise.all(files.map(async file => ({ id: crypto.randomUUID(), name: file.name, dataUrl: await readPng(file) })))
      edit(next => { next.appearanceImages.push(...images) })
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível abrir as imagens.') }
    event.target.value = ''
  }
  async function doRoll(attribute: AttributeName, skillId = '') {
    try {
      const skill = draft.skills.find(item => item.id === skillId)
      const label = `${attribute}${skill ? ` + ${skill.name}` : ''} · ${formName}`
      if (onRecordRoll) {
        const count = effectiveValue(draft.attributes[attribute].civil, bonusForAttribute(attribute))
        if (!count) throw new Error(`Preencha ${attribute} com pelo menos 1 dado para rolar.`)
        const bonus = skill ? effectiveValue(skill.civil, bonusForSkill(skill.id)) ?? 0 : 0
        const recorded = await onRecordRoll(label, count, 20, bonus, 'max')
        setRollResult({ dice: recorded.dice ?? [], bonus, total: recorded.result, label })
      } else {
        const result = rollSheetTest(draft, activeForm, attribute, skillId)
        setRollResult({ ...result, label })
      }
      setRollError('')
    } catch (cause) {
      setRollResult(null)
      setRollError(cause instanceof Error ? cause.message : 'Não foi possível rolar os dados.')
    }
  }
  async function rollD20() {
    try {
      const label = 'Rolagem livre · 1d20'
      if (onRecordRoll) {
        const recorded = await onRecordRoll(label, 1, 20, 0, 'sum')
        setRollResult({ dice: recorded.dice ?? [], bonus: 0, total: recorded.result, label })
      } else setRollResult({ ...rollDicePool(1), label })
      setRollError('')
    } catch (cause) {
      setRollResult(null)
      setRollError(cause instanceof Error ? cause.message : 'Não foi possível registrar a rolagem.')
    }
  }

  return <div className="sheet-page">
    <header className="sheet-page-header">
      <div><p className="home-overline">{headingContext}</p><h1 id="home-title" ref={titleRef} tabIndex={-1}>{pageTitle}</h1><p>Forma atual: <strong>{formName}</strong></p></div>
      <div className="sheet-page-actions"><a className="hub-button" href={backHref}>← {backLabel}</a><button className="hub-button" type="button" onClick={rollD20}>⚄ Rolar 1d20</button><button className="hub-button hub-button-primary" type="button" onClick={save} disabled={saving}>{saving ? 'Salvando…' : 'Salvar ficha'}</button></div>
    </header>
    {contextNote && <p className="sheet-page-context-note">{contextNote}</p>}
    {(error || message) && <p className={`sheet-page-feedback ${error ? 'sheet-page-error' : ''}`} role={error ? 'alert' : 'status'}>{error || message}</p>}
    <div className="sheet-page-scroll">
      <nav className="sheet-page-index" aria-label="Seções da ficha">
        {([['sheet-identity-title', 'Identidade'], ['sheet-status-title', 'Status'], ['sheet-attributes-title', 'Atributos'], ['sheet-skills-title', 'Perícias'], ['sheet-inventory-title', 'Inventário'], ['sheet-abilities-title', 'Habilidades'], ['sheet-lore-title', 'Lore'], ['sheet-appearance-title', 'Aparência']] as const).map(([target, label]) => <button key={target} type="button" onClick={() => document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>{label}</button>)}
      </nav>
      <div className="sheet-page-grid">
        <div className="sheet-page-column">
          <section className="sheet-panel" aria-labelledby="sheet-identity-title">
            <div className="sheet-panel-title"><span>01</span><h2 id="sheet-identity-title">Identidade</h2></div>
            <div className="sheet-portrait-row"><button className="sheet-avatar" type="button" onClick={clickIcon} aria-label="Ícone do personagem: clique três vezes para abrir o menu Miraculous" title="Três cliques abrem o menu Miraculous">{draft.portraitDataUrl ? <img src={draft.portraitDataUrl} alt="" /> : '◇'}</button><div><strong>{name || 'Sem nome'}</strong><small>Três cliques no ícone abrem o menu Miraculous.</small><button className="sr-only" type="button" onClick={() => setMiraculousOpen(current => !current)}>Abrir menu Miraculous</button></div></div>
            {miraculousOpen && <div className="sheet-miraculous-menu" role="group" aria-label="Menu Miraculous"><p>Escolha a forma da ficha</p><div className="sheet-form-list"><button type="button" aria-pressed={activeForm === 'civil'} className={activeForm === 'civil' ? 'active' : ''} onClick={() => setActiveForm('civil')}>Civil</button>{availableForms.map(form => <button key={form.id} type="button" aria-pressed={activeForm === form.id} className={activeForm === form.id ? 'active' : ''} onClick={() => setActiveForm(form.id)}><span>{form.name}</span><small>{form.concept}</small></button>)}</div>{masterManaged && activeForm !== 'civil' && <button className="sheet-manage-form" type="button" onClick={() => setGrantEditorOpen(true)}>Configurar bônus de {formName}</button>}<small>Os bônus são definidos pelo mestre. A aparência do site é escolhida separadamente.</small></div>}
            {civilEditable && <label className="sheet-field">Retrato PNG<input type="file" accept="image/png" onChange={choosePortrait} /></label>}
            {draft.portraitDataUrl && civilEditable && <button className="sheet-remove-text" type="button" onClick={() => edit(next => { delete next.portraitDataUrl; delete next.portraitPath })}>Remover retrato</button>}
            <label className="sheet-field">Nome<input value={name} maxLength={80} disabled={!civilEditable} onChange={event => { editRevision.current += 1; setName(event.target.value); setMessage('') }} /></label>
            <label className="sheet-field">Gênero<input value={draft.gender} maxLength={60} disabled={!civilEditable} onChange={event => edit(next => { next.gender = event.target.value })} /></label>
            <div className="sheet-identity-pair"><label className="sheet-field">Idade<input value={draft.age} maxLength={30} disabled={!civilEditable} placeholder="Opcional" onChange={event => edit(next => { next.age = event.target.value })} /></label><label className="sheet-field">Altura<input value={draft.height} maxLength={30} disabled={!civilEditable} placeholder="Opcional" onChange={event => edit(next => { next.height = event.target.value })} /></label></div>
          </section>
          <section className="sheet-panel" aria-labelledby="sheet-status-title">
            <div className="sheet-panel-title"><span>02</span><h2 id="sheet-status-title">Status</h2></div>
            <p className="sheet-panel-help">Valor atual e máximo. Proteção absorve dano antes da Vida.</p>
            {resourceNames.map(resource => { const item = draft.resources[resource]; const percentage = item.max && item.current !== null ? Math.min(100, item.current / item.max * 100) : 0; return <div className="sheet-resource" key={resource}><div className="sheet-resource-heading"><strong>{resource}</strong><span>{item.current ?? '—'} / {item.max ?? '—'}</span></div><div className="sheet-resource-bar" aria-hidden="true"><span style={{ width: `${percentage}%` }} /></div><div className="sheet-resource-fields"><label>Atual<NumberField label={`${resource} atual`} value={item.current} step={1} disabled={!civilEditable} onChange={value => edit(next => { next.resources[resource].current = value })} /></label><label>Máximo<NumberField label={`${resource} máximo`} value={item.max} step={1} disabled={!civilEditable} onChange={value => edit(next => { next.resources[resource].max = value })} /></label></div></div> })}
          </section>
        </div>
        <div className="sheet-page-column sheet-page-main">
          <section className="sheet-panel" aria-labelledby="sheet-attributes-title">
            <div className="sheet-panel-title"><span>03</span><h2 id="sheet-attributes-title">Atributos</h2><small>{formName.toUpperCase()}</small></div>
            <p className="sheet-panel-help">Cada ponto é um d20. Clique no dado para rolar e usar o maior resultado.</p>
            <div className="sheet-table-head"><span>Atributo</span><span>Dados</span><span>Rolar</span></div>
            {attributeNames.map(attribute => {
              const total = effectiveValue(draft.attributes[attribute].civil, bonusForAttribute(attribute))
              return <div className="sheet-value-row" key={attribute}>
                <strong>{attribute}</strong>
                {activeForm === 'civil' && civilEditable
                  ? <NumberField label={`${attribute} — dados`} value={draft.attributes[attribute].civil} step={1} onChange={value => edit(next => { next.attributes[attribute].civil = value })} />
                  : <output className="sheet-total" aria-label={`${attribute} total: ${total ?? 'não definido'} dados`}>{total === null ? '—' : `${total}d20`}</output>}
                <button className="sheet-roll-button" type="button" aria-label={`Rolar ${attribute}`} onClick={() => doRoll(attribute)}>⚄</button>
              </div>
            })}
          </section>
          <section className="sheet-panel" aria-labelledby="sheet-skills-title">
            <div className="sheet-panel-title"><span>04</span><h2 id="sheet-skills-title">Perícias</h2><small>{formName.toUpperCase()}</small></div>
            <label className="sheet-skill-attribute">Atributo para os testes<select value={rollAttribute} onChange={event => setRollAttribute(event.target.value as AttributeName)}>{attributeNames.map(attribute => <option key={attribute}>{attribute}</option>)}</select></label>
            <div className="sheet-table-head"><span>Perícia</span><span>Bônus</span><span>Rolar</span></div>
            {draft.skills.map(skill => {
              const total = effectiveValue(skill.civil, bonusForSkill(skill.id))
              return <div className="sheet-value-row" key={skill.id}>
                <strong>{skill.name}</strong>
                {activeForm === 'civil' && civilEditable
                  ? <NumberField label={`${skill.name} — bônus`} value={skill.civil} step={5} onChange={value => edit(next => { next.skills.find(item => item.id === skill.id)!.civil = value })} />
                  : <output className="sheet-total" aria-label={`${skill.name} total: ${total ?? 'não definido'}`}>{total === null ? '—' : `+${total}`}</output>}
                <button className="sheet-roll-button" type="button" aria-label={`Rolar ${skill.name}`} title={`${rollAttribute} + ${skill.name}`} onClick={() => doRoll(rollAttribute, skill.id)}>⚄</button>
              </div>
            })}
          </section>
        </div>
      </div>
      <div className="sheet-page-sections">
        <section className="sheet-panel" aria-labelledby="sheet-inventory-title"><div className="sheet-panel-title"><span>05</span><h2 id="sheet-inventory-title">Inventário</h2></div>{draft.inventory.length === 0 && <p className="sheet-panel-help">Nenhum item adicionado.</p>}{draft.inventory.map(item => <div className="sheet-entry" key={item.id}><label className="sheet-field">Item<input value={item.name} maxLength={80} disabled={!civilEditable} placeholder="Nome do item" onChange={event => edit(next => { next.inventory.find(entry => entry.id === item.id)!.name = event.target.value })} /></label><label className="sheet-field">Detalhes<textarea value={item.notes} maxLength={500} disabled={!civilEditable} placeholder="Dano, alcance ou observações" onChange={event => edit(next => { next.inventory.find(entry => entry.id === item.id)!.notes = event.target.value })} /></label>{civilEditable && <button className="sheet-remove-text" type="button" onClick={() => edit(next => { next.inventory = next.inventory.filter(entry => entry.id !== item.id) })}>Remover item</button>}</div>)}{civilEditable && <button className="hub-button sheet-add" type="button" onClick={() => edit(next => { next.inventory.push({ id: crypto.randomUUID(), name: '', notes: '' }) })}>＋ Adicionar item</button>}</section>
        <section className="sheet-panel" aria-labelledby="sheet-abilities-title"><div className="sheet-panel-title"><span>06</span><h2 id="sheet-abilities-title">Habilidades</h2><small>GESTÃO DO MESTRE</small></div>{draft.abilities.length === 0 && <p className="sheet-panel-help">O mestre ainda não adicionou habilidades a esta ficha.</p>}{draft.abilities.map(ability => <div className="sheet-entry" key={ability.id}><label className="sheet-field">Tipo<select value={ability.kind} disabled={!masterManaged} onChange={event => edit(next => { next.abilities.find(entry => entry.id === ability.id)!.kind = event.target.value as AbilityKind })}><option>Passiva</option><option>Técnica</option><option>Miraculous</option></select></label><label className="sheet-field">Nome<input value={ability.name} maxLength={80} disabled={!masterManaged} onChange={event => edit(next => { next.abilities.find(entry => entry.id === ability.id)!.name = event.target.value })} /></label><label className="sheet-field">Descrição<textarea value={ability.description} maxLength={1200} disabled={!masterManaged} onChange={event => edit(next => { next.abilities.find(entry => entry.id === ability.id)!.description = event.target.value })} /></label>{masterManaged && <button className="sheet-remove-text" type="button" onClick={() => edit(next => { next.abilities = next.abilities.filter(entry => entry.id !== ability.id) })}>Remover habilidade</button>}</div>)}{masterManaged && <button className="hub-button sheet-add" type="button" onClick={() => edit(next => { next.abilities.push({ id: crypto.randomUUID(), kind: 'Técnica', name: '', description: '' }) })}>＋ Adicionar habilidade</button>}</section>
      </div>
      <div className="sheet-page-lower">
        <section className="sheet-panel" aria-labelledby="sheet-lore-title"><div className="sheet-panel-title"><span>07</span><h2 id="sheet-lore-title">Lore</h2></div><label className="sheet-field">História do personagem<textarea value={draft.lore} maxLength={5000} disabled={!civilEditable} placeholder="Origem, acontecimentos e motivações" onChange={event => edit(next => { next.lore = event.target.value })} /></label></section>
        <section className="sheet-panel" aria-labelledby="sheet-appearance-title"><div className="sheet-panel-title"><span>08</span><h2 id="sheet-appearance-title">Aparência</h2></div><label className="sheet-field">Descrição visual<textarea value={draft.appearance} maxLength={3000} disabled={!civilEditable} placeholder="Traços, roupas e detalhes visuais" onChange={event => edit(next => { next.appearance = event.target.value })} /></label>{civilEditable && <label className="sheet-field">Adicionar PNGs<input type="file" accept="image/png" multiple onChange={chooseAppearanceImages} /></label>}<div className="sheet-appearance-gallery">{draft.appearanceImages.map(image => <figure key={image.id}><img src={image.dataUrl} alt={image.name} /><figcaption>{image.name}</figcaption>{civilEditable && <button type="button" onClick={() => edit(next => { next.appearanceImages = next.appearanceImages.filter(entry => entry.id !== image.id) })}>Remover</button>}</figure>)}</div></section>
      </div>
      <p className="sheet-page-disclaimer">{persisted ? 'Salve antes de sair da ficha. Seus dados ficam na sua conta.' : 'Prévia visual: salve antes de sair da ficha. Tudo será descartado ao recarregar ou encerrar a demonstração.'}</p>
    </div>
    {(rollResult || rollError) && <aside className="sheet-roll-toast" aria-label="Resultado da rolagem">
      <button className="sheet-roll-close" type="button" aria-label="Fechar resultado" onClick={() => { setRollResult(null); setRollError('') }}>×</button>
      {rollError ? <p role="alert" className="sheet-roll-error">{rollError}</p> : rollResult && <div className="sheet-roll-result" role="status">
        <span>{rollResult.label}</span><strong>{rollResult.total}</strong>
        <small>{rollResult.dice.length}d20: {rollResult.dice.join(', ')} · maior {Math.max(...rollResult.dice)}{rollResult.bonus ? ` + ${rollResult.bonus}` : ''}</small>
      </div>}
      <small className="sheet-roll-local">{onRecordRoll ? 'Rolagem registrada no histórico da mesa.' : 'Rolagem local · não enviada à mesa.'}</small>
    </aside>}
    {masterManaged && grantEditorOpen && activeForm !== 'civil' && <Modal open onClose={() => setGrantEditorOpen(false)} titleId="sheet-grant-title" className="sheet-grant-modal">
      <div className="sheet-panel">
        <p className="home-overline">CONFIGURAÇÃO DO MESTRE</p><h2 id="sheet-grant-title">Bônus de {formName}</h2>
        <p className="sheet-panel-help">Informe apenas o que a transformação acrescenta. A ficha soma os valores civis automaticamente.</p>
        <h3>Atributos</h3>
        {attributeNames.map(attribute => <label className="sheet-grant-field" key={attribute}>{attribute}<NumberField label={`${attribute} — bônus de ${formName} em dados`} value={draft.forms.find(item => item.id === activeForm)?.attributes[attribute] ?? null} step={1} onChange={value => setAttributeGrant(attribute, value)} /></label>)}
        <h3>Perícias</h3>
        {draft.skills.map(skill => <label className="sheet-grant-field" key={skill.id}>{skill.name}<NumberField label={`${skill.name} — bônus de ${formName}`} value={draft.forms.find(item => item.id === activeForm)?.skills[skill.id] ?? null} step={5} onChange={value => setSkillGrant(skill.id, value)} /></label>)}
        <button type="button" className="hub-button hub-button-primary sheet-add" onClick={() => setGrantEditorOpen(false)}>Concluir</button>
      </div>
    </Modal>}
  </div>
}
