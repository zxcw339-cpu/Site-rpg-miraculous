import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import '../campaign-page.css'

interface Props {
  name?: string
  isMaster?: boolean
  titleRef: RefObject<HTMLHeadingElement | null>
  error?: string
  onRetry: () => void
}

export function CampaignOpeningState({ name, isMaster, titleRef, error, onRetry }: Props) {
  const [takingLonger, setTakingLonger] = useState(false)

  useEffect(() => {
    setTakingLonger(false)
    if (error) return
    const timer = window.setTimeout(() => setTakingLonger(true), 7_000)
    return () => window.clearTimeout(timer)
  }, [error, name])

  return <div className="campaign-page campaign-opening">
    <header className="campaign-page-header">
      <div>
        <p className="home-overline">{isMaster === undefined ? 'CAMPANHAS' : `CAMPANHAS / ${isMaster ? 'MESTRANDO' : 'JOGANDO'}`}</p>
        <h1 id="home-title" ref={titleRef} tabIndex={-1}>{name || 'Sua campanha'}</h1>
        <p>{error ? 'Não foi possível abrir esta mesa.' : 'Preparando o espaço da sua campanha.'}</p>
      </div>
      <a className="hub-button" href="#campanhas">← Todas as campanhas</a>
    </header>

    <div className="campaign-page-layout">
      <aside className="campaign-page-nav campaign-opening-nav" aria-hidden="true">
        <span>Visão geral</span>
        <span>Comunidade</span>
        <span>{isMaster ? 'Jogadores' : 'Minha ficha'}</span>
        <span>Dados</span>
      </aside>

      <div className="campaign-page-scroll campaign-opening-scroll">
        <section className={`campaign-opening-card${error ? ' campaign-opening-card-error' : ''}`} aria-labelledby="campaign-opening-title">
          <div className="campaign-opening-emblem" aria-hidden="true"><span>◇</span></div>
          <p className="home-overline">{error ? 'ACESSO INTERROMPIDO' : 'SUA MESA ESTÁ SENDO PREPARADA'}</p>
          <h2 id="campaign-opening-title">{error ? 'A mesa não abriu.' : 'Entrando na campanha.'}</h2>
          <p className="campaign-opening-message" role={error ? 'alert' : 'status'}>{error || (takingLonger ? 'A conexão está demorando mais que o esperado. Você pode aguardar ou tentar novamente.' : 'Buscando os dados da mesa e conferindo seu acesso…')}</p>
          {!error && <div className="campaign-opening-track" aria-hidden="true"><span /></div>}
          {(error || takingLonger) && <div className="campaign-opening-actions">
            <button className="hub-button hub-button-primary" type="button" onClick={() => { setTakingLonger(false); onRetry() }}>Tentar novamente</button>
            <a className="hub-button" href="#campanhas">Voltar às campanhas</a>
          </div>}
        </section>

        {!error && <div className="campaign-opening-preview" aria-hidden="true">
          <div><span>01 / COMUNIDADE</span><i /><i /></div>
          <div><span>02 / PERSONAGENS</span><i /><i /></div>
          <div><span>03 / ROLAGENS</span><i /><i /></div>
        </div>}
      </div>
    </div>
  </div>
}
