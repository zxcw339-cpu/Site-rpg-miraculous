import { useId } from 'react'
import type { CSSProperties } from 'react'
import '../lantern-theme.css'

// Decorative artwork only: all controls remain in the shared page components.
function Hanging({ x, length, kind, delay }: { x: number; length: number; kind: 'lantern' | 'papers' | 'bell' | 'jewel'; delay: number }) {
  return <g transform={`translate(${x} 0)`}>
    <g className={`lantern-hanging lantern-hanging-${kind}`} style={{ '--wind-delay': `${delay}s`, '--wind-duration': `${kind === 'lantern' ? 10 : 8.5}s` } as CSSProperties}>
      <path className="lantern-cord" d={`M0 -30V${length}`} />
      <g transform={`translate(0 ${length})`}>
        <path d="M0-16 7-9 0-2-7-9ZM0-2v12" />
        <circle cy="4" r="1.5" fill="currentColor" />
        {kind === 'lantern' && <g transform="translate(0 28)">
          <ellipse className="lantern-halo lantern-light" cy="66" rx="92" ry="120" />
          <rect x="-15" y="-4" width="30" height="7" rx="1" fill="#141416" />
          <path d="M-4-4v-8q4-6 8 0v8" />
          <rect x="-32" y="4" width="64" height="120" rx="25" fill="#121315" />
          <rect className="lantern-paper-light lantern-light" x="-31" y="5" width="62" height="118" rx="24" stroke="none" />
          <g opacity=".48" strokeWidth=".8">
            {Array.from({ length: 21 }, (_, i) => {
              const y = 12 + i * 5.2
              const halfWidth = y < 29 ? 20 + (y - 12) * .67 : y > 99 ? 31 - (y - 99) * .65 : 31
              return <path key={i} d={`M${-halfWidth} ${y}H${halfWidth}`} />
            })}
          </g>
          <path d="M-14 124v7h28v-7M0 131v13" />
          <g className="lantern-emblem lantern-light" transform="translate(0 62)">
            <path d="M0-26 12-2 0 24-12-2ZM0-26-5-2 0 24 5-2ZM-12-2 0 3 12-2" />
          </g>
          <path d="m0 141 3 5-3 5-3-5Z" fill="currentColor" />
        </g>}
        {kind === 'papers' && <g className="lantern-paper-chain" transform="translate(0 13)">
          <path d="M0 0v112" opacity=".5" />
          <path className="lantern-paper-strip" d="m0 0 10 17-10 17-9-11Zm0 30 13 15-13 24-12-10Zm0 34 12 16-10 29-14-9Z" />
          <path d="m0 0 1 30m-1 0 2 34m-2 0 2 45" opacity=".35" />
        </g>}
        {kind === 'bell' && <g transform="translate(0 28)">
          <path d="M-15 19c5-6 2-27 15-27s10 21 15 27M-11 16C-8 11-9-4 0-4S8 11 11 16" />
          <ellipse cy="19" rx="18" ry="4" fill="#141416" />
          <path d="M-12 19q12-4 24 0M0 19v16m-3-1 3 5 3-5M0-8v-7" />
          <circle cy="26" r="2" fill="currentColor" />
        </g>}
        {kind === 'jewel' && <path d="M0 9V97" opacity=".55" />}
      </g>
    </g>
  </g>
}

function Waves() {
  return <g className="lantern-waves">
    {[[5, 0, 95], [97, 43, 106], [0, 76, 108], [161, 117, 103], [59, 146, 92], [260, 174, 89]].map(([x, y, radius], i) =>
      <g key={i} transform={`translate(${x} ${y})`}>
        <path d={`M${-radius} 0a${radius} ${radius} 0 0 1 ${radius * 2} 0Z`} fill="#111214" />
        {Array.from({ length: 8 }, (_, ring) => {
          const r = radius - ring * 11
          return r > 0 ? <path key={ring} d={`M${-r} 0a${r} ${r} 0 0 1 ${r * 2} 0`} /> : null
        })}
      </g>,
    )}
  </g>
}

export function LanternAtmosphere() {
  const id = useId().replace(/:/g, '')
  return <div className="atmosphere lantern-atmosphere" aria-hidden="true">
    <svg viewBox="0 0 1920 1080" preserveAspectRatio="none" fill="none" focusable="false">
      <defs>
        <linearGradient id={`${id}-pillar`} x1="0" y1="150" x2="0" y2="1040" gradientUnits="userSpaceOnUse">
          <stop stopColor="#977964" stopOpacity=".27" /><stop offset=".7" stopColor="#796253" stopOpacity=".2" /><stop offset="1" stopColor="#796253" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g className="lantern-gate" stroke={`url(#${id}-pillar)`}>
        <path d="M425 42Q960 120 1495 42L1484 85Q960 117 436 85ZM436 85l21 23h1006l21-23M473 98Q960 136 1447 98l-10 54-18 8H501l-18-8Z" fill="#492b2310" />
        <path d="M596 156 574 845h90l-2-689ZM1258 156l-2 689h90l-22-689ZM470 248l493-3 487 3v55l-487 5-493-5ZM570 233l25 4m-25-4v15m118-12-26 4m26-4v12m541-12 27 4m-27-4v12m120-15-25 4m25-4v15" />
        {[618, 1302].map(x => <g key={x}>
          <ellipse cx={x} cy="323" rx="39" ry="50" /><ellipse cx={x} cy="323" rx="33" ry="44" />
          <path d={`M${x} 290q-5 25-28 33 23 8 28 34 5-26 28-34-23-8-28-33ZM${x} 301v45M${x - 18} 323h36`} />
          <path d={`M${x - 45} 845h90v12h7v18h8l5 166H${x - 65}l5-166h8v-18h7ZM${x - 52} 857h104M${x - 60} 875h120M${x - 32} 160v684M${x + 32} 160v684`} />
        </g>)}
      </g>
      <g className="lantern-edge-art" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round">
        <Hanging x={62} length={272} kind="papers" delay={-5} />
        <Hanging x={101} length={434} kind="bell" delay={-1.7} />
        <Hanging x={158} length={496} kind="papers" delay={-3.4} />
        <Hanging x={158} length={135} kind="lantern" delay={-2.2} />
        <Hanging x={14} length={219} kind="jewel" delay={-4} />
        <Hanging x={1762} length={137} kind="papers" delay={-3.5} />
        <Hanging x={1855} length={265} kind="lantern" delay={-6} />
        <Hanging x={1771} length={339} kind="bell" delay={-4.2} />
        <Hanging x={1826} length={536} kind="papers" delay={-7} />
        <Hanging x={1905} length={218} kind="jewel" delay={-2} />
        <g className="lantern-clouds"><path d="M-20 726h167c18 0 18 21 0 21h-20c-8 0-8 8 0 8h100c17 0 17 21 0 21H46M1940 725h-220c-25 0-25 27 0 27h52c21 0 21 23 0 23h-175" /></g>
        <g transform="translate(0 903)"><Waves /></g>
        <g transform="translate(1920 903) scale(-1 1)"><Waves /></g>
        <g className="lantern-motes" fill="currentColor" stroke="none">
          {[[96, 667], [208, 479], [1713, 589], [1884, 555], [310, 802], [1784, 828], [234, 637], [1730, 420]].map(([x,y],i) => <circle key={i} cx={x} cy={y} r="1.5" style={{ animationDelay: `${-i * 1.8}s` }} />)}
          <path d="m352 956 4 5-4 5-4-5Zm1416 0 4 5-4 5-4-5ZM102 820l3 4-3 4-3-4Z" />
        </g>
      </g>
      <g className="lantern-floor" stroke="currentColor">
        {[982, 992, 1002, 1015, 1028, 1044, 1066].map(y => <path key={y} d={`M0 ${y}Q960 ${y - 5} 1920 ${y}`} />)}
      </g>
    </svg>
  </div>
}
