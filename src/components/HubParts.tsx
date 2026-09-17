import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import '../hubs.css'

export function HubIcon({ kind }: { kind: 'sheet' | 'campaign' | 'plus' | 'search' | 'arrow' | 'key' }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'sheet' && <><path d="M5 3h14v18H5z" /><circle cx="12" cy="9" r="2.5" /><path d="M8 17c0-5 8-5 8 0M3 6v15" /></>}
    {kind === 'campaign' && <><circle cx="12" cy="12" r="8" /><path d="m16 8-2.5 5.5L8 16l2.5-5.5ZM12 1v3m0 16v3M1 12h3m16 0h3" /></>}
    {kind === 'plus' && <path d="M12 5v14M5 12h14" />}
    {kind === 'search' && <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>}
    {kind === 'arrow' && <path d="M4 12h16m-6-6 6 6-6 6" />}
    {kind === 'key' && <><circle cx="8" cy="9" r="5" /><path d="m12 13 8 8m-4-4 3-3m-6 0 3-3" /></>}
  </svg>
}

export function HubHeader({ title, titleRef, description, query, onQueryChange, searchLabel, children }: {
  title: string; titleRef: RefObject<HTMLHeadingElement | null>; description: string
  query: string; onQueryChange: (value: string) => void; searchLabel: string; children: ReactNode
}) {
  const searchRef = useRef<HTMLInputElement>(null)
  return <header className="hub-header">
    <div className="hub-title-line"><div><p className="home-overline">SEU UNIVERSO</p><h1 id="home-title" ref={titleRef} tabIndex={-1}>{title}</h1><p className="hub-description">{description}</p></div><span className="hub-preview-label">PRÉVIA</span></div>
    <div className="hub-toolbar">
      <label className="hub-search"><HubIcon kind="search" /><span className="sr-only">{searchLabel}</span><input ref={searchRef} type="search" placeholder={searchLabel} value={query} onChange={event => onQueryChange(event.target.value)} autoComplete="off" />{query && <button type="button" aria-label="Limpar busca" onClick={() => { onQueryChange(''); searchRef.current?.focus() }}>×</button>}</label>
      <div className="hub-actions">{children}</div>
    </div>
  </header>
}

export function HubRow({ title, count, children, emptyMessage }: { title: string; count: number; children: ReactNode; emptyMessage: string }) {
  const id = useId()
  const rowRef = useRef<HTMLDivElement>(null)
  const [canScroll, setCanScroll] = useState({ left: false, right: false })
  function updateScroll() {
    const row = rowRef.current
    if (row) setCanScroll({ left: row.scrollLeft > 2, right: row.scrollLeft + row.clientWidth < row.scrollWidth - 2 })
  }
  useEffect(() => {
    const row = rowRef.current
    if (!row) return
    const observer = new ResizeObserver(updateScroll)
    observer.observe(row)
    updateScroll()
    return () => observer.disconnect()
  }, [children])
  function scroll(direction: number) {
    const row = rowRef.current
    row?.scrollBy({ left: direction * Math.max(280, row.clientWidth * .8), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }
  return <section className="hub-group" aria-labelledby={id}>
    <div className="hub-group-heading"><h2 id={id}>{title}<span aria-label={`${count} ${count === 1 ? 'item' : 'itens'}`}>{String(count).padStart(2, '0')}</span></h2><span className="hub-group-rule" />
      {(canScroll.left || canScroll.right) && <div className="hub-row-controls"><button type="button" aria-label={`Anteriores em ${title}`} disabled={!canScroll.left} onClick={() => scroll(-1)}><HubIcon kind="arrow" /></button><button type="button" aria-label={`Próximos em ${title}`} disabled={!canScroll.right} onClick={() => scroll(1)}><HubIcon kind="arrow" /></button></div>}
    </div>
    <div className="hub-card-row" ref={rowRef} onScroll={updateScroll}>
      {count ? children : <p className="hub-empty">{emptyMessage}</p>}
    </div>
  </section>
}

export function HubCard({ kind, name, eyebrow, detail, isExample, onClick }: {
  kind: 'sheet' | 'campaign'; name: string; eyebrow: string; detail: string; isExample: boolean; onClick: () => void
}) {
  return <button type="button" className={`hub-card hub-card-${kind}`} onClick={onClick} aria-label={`Abrir ${name}`} title={name} aria-haspopup="dialog">
    <span className="hub-card-art" aria-hidden="true"><span className="hub-card-seal"><HubIcon kind={kind} /></span><span className="hub-card-star">◇</span></span>
    <span className="hub-card-copy"><span className="hub-card-eyebrow">{eyebrow}</span><span className="hub-card-name">{name}</span><span className="hub-card-detail">{detail}</span><span className="hub-card-meta">{isExample ? 'EXEMPLO' : 'NESTA PRÉVIA'}<HubIcon kind="arrow" /></span></span>
  </button>
}
