import { useId, type CSSProperties } from 'react'
import '../cerberus-theme.css'

// Alternating face and edge links give the chain depth using only thin lines.
export function CerberusChain({ links, delay = 0 }: { links: number; delay?: number }) {
  const end = (links - 1) * 18 + 30
  return <g className="cerberus-chain-sway" style={{ '--chain-delay': `${delay}s`, '--chain-wind-duration': `${14 + links * .12}s` } as CSSProperties}>
    <g className="cerberus-chain-glow">
      {Array.from({ length: links }, (_, index) => <g key={index} transform={`translate(0 ${index * 18})`}>
        {index % 2 === 0 ? <>
          <rect x="-7" y="0" width="14" height="28" rx="7" />
          <path className="cerberus-link-highlight" d="M-4 9V7q0-4 4-4" />
        </> : <ellipse cx="0" cy="14" rx="2.6" ry="14" />}
      </g>)}
      <path d={`M0 ${end - 2}v9`} />
      <g transform={`translate(0 ${end + 18})`}>
        <circle r="12" /><circle r="8" opacity=".35" />
        <g className="cerberus-binding-light"><path d="M-5-2v5M0-5v8M5-2v5" /></g>
      </g>
    </g>
  </g>
}

function PandoraRelief({ x, mirrored, flame }: { x: number; mirrored?: boolean; flame?: boolean }) {
  return <g transform={`translate(${x} 0)`} className="pandora-relief-panel">
    <path className="pandora-panel-fill" d="M0 772V450a101 101 0 0 1 202 0v322Z" />
    <path d="M0 772V450a101 101 0 0 1 202 0v322ZM10 762V450a91 91 0 0 1 182 0v312ZM21 751V450a80 80 0 0 1 160 0v301Z" />
    <g className="pandora-relief-etching" transform={`translate(${mirrored ? 202 : 0} 420) scale(${mirrored ? -1 : 1} 1)`}>
      {flame ? <>
        <path d="M103 37c-12 36-45 43-28 74 6-22 23-29 32-40-2 35 33 48 25 79 17-12 22-34 15-50 39 38 28 89-10 112l-13 55H81l-8-47c-40-26-38-72-8-103-12 35 12 46 18 59-4-40 36-56 20-89Z" />
        <path d="M103 145c-19 34-12 46 4 68m-9 5 5 48m-35 11h65m-74 10h83" />
      </> : <>
        <path d="m87 95-4-29 23 11 20-14 3 35 22 17-7 12-26 3-6 23c37 25 39 73 20 110l-9 26H81l7-17 17-5-4-43c-19 14-24 38-25 61H34l5-17 17-6 2-44c-32-29-36-54-18-80l10-27Z" />
        <path d="M48 178c-36-14-31-46-12-59-3 26 23 29 29 46M89 126l25 4m-15 30 12 6M111 201c10 16 10 32 0 52M65 242l9-42" />
        <circle cx="120" cy="102" r="2" /><path d="m89 142 28 5-2 8-28-5ZM29 300h125" />
      </>}
      <path d="M25 297c-7-38-9-71-3-105m0 30-10-11m10 35 12-14m-14 37-11-11M176 297c7-38 9-71 3-105m0 30 10-11m-10 35-12-14m14 37 11-11" opacity=".55" />
    </g>
  </g>
}

// A closed, monumental reliquary, composed front-on for the entire background.
export function PandoraBoxArtwork() {
  const id = useId().replace(/:/g, '')
  return <g className="pandora-box-artwork">
    <defs>
      <radialGradient id={`${id}-pandora-amber`}>
        <stop stopColor="#ffc47c" stopOpacity=".26" />
        <stop offset=".65" stopColor="#d58a45" stopOpacity=".12" />
        <stop offset="1" stopColor="#b06e3b" stopOpacity="0" />
      </radialGradient>
    </defs>
    <g className="pandora-box-shell">
      <path className="pandora-box-plane" d="M114 285V227Q720 92 1326 227v578H114Z" />
      <path d="m1326 285 61-38v519l-61 39M1340 299l31-20v478l-31 20" opacity=".5" />
      <path d="M114 285V227Q720 92 1326 227v58M136 278v-36q584-127 1168 0v36M151 259q569-121 1138 0" />
      {[0, 1, 2, 3, 4].map(index => <path key={index} className="pandora-lid-rib" d={`M${148 + index * 2} ${245 - index * 11}Q720 ${115 - index * 10} ${1292 - index * 2} ${245 - index * 11}`} />)}
      <path d="M94 282h1252v37H94ZM114 319h1212v486H114ZM94 805h1252v18H94ZM82 823h1276v20H82Z" />
      <g className="pandora-box-inlay">
        {Array.from({ length: 31 }, (_, index) => <path key={index} d={`M${117 + index * 39} 289h22v20h-14v-12h7`} />)}
        <path d="M128 330h1184M128 789h1184" />
      </g>
      <g className="pandora-corner-brackets">
        <path d="M114 285c-21-38-29-76-25-110 23 31 52 40 92 39l-26 26m-36 24 32-2 17-27M1326 285c21-38 29-76 25-110-23 31-52 40-92 39l26 26m36 24-32-2-17-27" />
        <path d="M114 328h23v448h-23m1212-448h-23v448h23M114 776l-25 81h67l-14-34m1184-47 25 81h-67l14-34" />
        <path d="m114 343 11 12-11 12m1212-24-11 12 11 12M121 386v334m1198-334v334" opacity=".5" />
        <circle cx="126" cy="300" r="7" /><circle cx="1314" cy="300" r="7" />
      </g>
    </g>
    <g className="pandora-box-illumination">
      <path className="pandora-lit-seam" d="M136 278q584-127 1168 0M128 330h1184M128 789h1184" />
      {[126, 1314].map(x => <g key={x}>
        <circle className="pandora-corner-halo" cx={x} cy="300" r="32" fill={`url(#${id}-pandora-amber)`} />
        <circle className="pandora-corner-light" cx={x} cy="300" r="5" />
      </g>)}
    </g>
    <PandoraRelief x={151} /><PandoraRelief x={375} flame />
    <PandoraRelief x={863} mirrored flame /><PandoraRelief x={1087} mirrored />
    <g className="pandora-central-lock">
      <path d="M645 315h150v472H645ZM660 328h120v445H660Z" />
      <path d="M682 338v423m12-423v423m52-423v423m12-423v423" opacity=".4" />
      <path d="m695 564 25-13 25 13v58l-25 18-25-18ZM707 564v-12a13 13 0 0 1 26 0v12" />
      <circle cx="720" cy="589" r="6" /><path d="M720 595v14" />
    </g>
    <g className="pandora-medallion-wings">
      <path d="M630 232c-49-10-72-43-137-37 15 33 64 51 116 52-39 1-67-4-96-19 10 32 56 42 104 39-32 9-57 8-82 0 14 24 44 31 89 15-15 17-32 28-51 28 17 15 40 10 65-6M810 232c49-10 72-43 137-37-15 33-64 51-116 52 39 1 67-4 96-19-10 32-56 42-104 39 32 9 57 8 82 0-14 24-44 31-89 15 15 17 32 28 51 28-17 15-40 10-65-6" />
    </g>
    <g className="pandora-medallion">
      <circle cx="720" cy="234" r="97" /><circle cx="720" cy="234" r="88" />
      <circle className="pandora-amber-light" cx="720" cy="234" r="79" fill={`url(#${id}-pandora-amber)`} />
      <path className="pandora-seal-light" d="M699 219v31M720 200v50M741 219v31" />
      {Array.from({ length: 16 }, (_, index) => <circle key={index} cx={720 + Math.sin(index * Math.PI / 8) * 93} cy={234 + Math.cos(index * Math.PI / 8) * 93} r="1.8" />)}
    </g>
  </g>
}

export function CerberusAtmosphere() {
  return <div className="atmosphere cerberus-atmosphere" aria-hidden="true">
    <svg className="cerberus-pandora-box" viewBox="0 0 1440 920" fill="none" focusable="false">
      <PandoraBoxArtwork />
    </svg>
    <div className="cerberus-chain-field">
      {([{ x: 5.2, links: 23, scale: 1, delay: -4 }, { x: 14.2, links: 44, scale: .75, delay: -11 }, { x: 94.8, links: 30, scale: 1, delay: -8 }, { x: 85.8, links: 18, scale: .75, delay: -2 }] as const).map((chain, index) =>
        <span key={index} className="cerberus-hanging-chain" style={{ left: `${chain.x}%`, '--chain-scale': chain.scale } as CSSProperties}>
          <svg className="cerberus-chain-drawing" viewBox={`-30 -28 60 ${(chain.links - 1) * 18 + 90}`} fill="none" focusable="false">
            <CerberusChain links={chain.links} delay={chain.delay} />
          </svg>
        </span>,
      )}
    </div>
  </div>
}
