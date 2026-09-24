import type { CSSProperties } from 'react'
import { availableThemes, themeSlots } from '../themes/themes'
import type { ThemeDefinition } from '../themes/themes'
import { BoxIcon, SymbolIcon } from './Icons'
import { Modal } from './Modal'

interface ThemePickerProps {
  open: boolean
  onClose: () => void
  theme: ThemeDefinition
  onSelect: (id: string) => void
  storageUnavailable: boolean
}

export function ThemePicker({ open, onClose, theme, onSelect, storageUnavailable }: ThemePickerProps) {
  return <Modal open={open} onClose={onClose} titleId="themes-title" descriptionId="themes-description" className="theme-modal">
    <div className="modal-emblem"><BoxIcon /></div>
    <p className="eyebrow">APARÊNCIA</p>
    <h2 id="themes-title">Caixa dos Miraculous</h2>
    <p id="themes-description" className="modal-description">Escolha a atmosfera das suas próximas histórias.</p>
    <fieldset className="theme-fieldset">
      <legend className="sr-only">Aparências disponíveis</legend>
      <div className="theme-box">
        <span className="box-corner box-corner-one" aria-hidden="true" />
        <span className="box-corner box-corner-two" aria-hidden="true" />
        {themeSlots.map(slot => {
          const option = slot.theme
          return option ? <label key={slot.id} className="theme-slot theme-choice" style={{ '--swatch': option.colors['--accent-bright'] } as CSSProperties} title={`${option.name} — tema provisório`}>
            <input type="radio" name="appearance" value={option.id} checked={theme.id === option.id} onChange={() => onSelect(option.id)} aria-label={`Tema ${option.name}`} />
            <span className="theme-symbol"><SymbolIcon symbol={option.symbol} /><span className="theme-check" aria-hidden="true">✓</span></span>
          </label> : <span key={slot.id} className="theme-slot reserved-slot" aria-hidden="true"><span /></span>
        })}
      </div>
      <div className="theme-name-list" aria-hidden="true">{availableThemes.map(option => <span key={option.id} className={theme.id === option.id ? 'is-selected' : ''}>{option.name}</span>)}</div>
    </fieldset>
    <div className="theme-caption" role="status" aria-live="polite" aria-atomic="true">
      <span className="selected-dot" aria-hidden="true" />
      <div><p>{theme.name}<span>TEMA SELECIONADO</span></p><small>{theme.description}</small></div>
    </div>
    <p className="theme-footnote">Símbolo e paleta provisórios. Os outros espaços serão definidos depois.</p>
    {storageUnavailable && <p className="storage-notice" role="status">O navegador não permitiu salvar a preferência. O tema vale enquanto esta página estiver aberta.</p>}
    <button className="secondary-button" onClick={onClose}>Concluir</button>
  </Modal>
}
