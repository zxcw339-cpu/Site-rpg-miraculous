import { useId } from 'react'
import type { CSSProperties } from 'react'

// Independent silk strands: no concentric rings or shared radial center.
// The three pendant anchors lie on explicit points of these curves.
const threads = [
  'M12 0C76 126 44 262 0 388',
  'M48 0C68 73 72 136 39.09 198.6S10 320 0 352',
  'M0 314C39 274 74 222 85.35 180.9S161 56 226 0',
  'M0 190C59 158 111 139 161.15 104.57S244 27 310 0',
  'M0 110C102 72 216 35 360 12',
  'M0 35C91 45 206 24 289 0',
]
const lightThreads = [threads[1], threads[3], threads[4]]
const glintPositions = [[46.5, 194], [85.35, 180.9], [161.15, 104.57], [164.25, 55.375]]

function Pendants() {
  return <g className="web-pendants">
    <g transform="translate(39.09 198.6)">
      <g className="web-pendant web-pendant-long">
        <path className="pendant-thread" d="M0 0V128" />
        <circle cy="71" r="2" />
        <path d="m0 89 3.5 6L0 101l-3.5-6Z" />
        <circle cy="131" r="3" />
        <path className="pendant-crystal" d="m0 136 9 13-9 23-9-23ZM0 136l-3 13 3 23 3-23ZM-9 149H9" />
        <path className="pendant-glimmer" d="M-4 143 0 138 4 143M0 157v10" />
      </g>
    </g>
    <g transform="translate(85.35 180.9)">
      <g className="web-pendant web-pendant-star">
        <path className="pendant-thread" d="M0 0V60" />
        <circle cy="36" r="1.8" />
        <circle cy="62" r="2" />
        <path className="pendant-crystal" d="M0 67C-1 76-4 79-11 81C-4 83-1 86 0 95C1 86 4 83 11 81C4 79 1 76 0 67Z" />
        <circle className="pendant-glimmer" cy="81" r="1.6" />
        <path className="pendant-thread" d="M0 96v16" />
        <circle cy="114" r="1.5" />
      </g>
    </g>
    <g transform="translate(161.15 104.57)">
      <g className="web-pendant web-pendant-short">
        <path className="pendant-thread" d="M0 0V38" />
        <circle cy="22" r="1.7" />
        <path className="pendant-crystal" d="m0 40 5 9-5 12-5-12ZM0 40v21" />
      </g>
    </g>
  </g>
}

function WebCorner({ corner, index }: { corner: string; index: number }) {
  const glowId = useId()
  const isTop = corner.startsWith('top')

  return <svg className={`web-corner web-corner-${corner}`} viewBox="0 0 360 400" fill="none" style={{ '--web-delay': `${index * -3.7}s` } as CSSProperties} focusable="false">
    <defs>
      <radialGradient id={glowId} cx="0" cy="0" r="1" gradientTransform="scale(335 360)" gradientUnits="userSpaceOnUse">
        <stop stopColor="#dce4e7" stopOpacity=".075" />
        <stop offset="1" stopColor="#dce4e7" stopOpacity="0" />
      </radialGradient>
    </defs>
    <path d="M0 0H360V400H0Z" fill={`url(#${glowId})`} />
    <g className="web-silk">
      {threads.map((d, i) => <path key={d} d={d} className={i % 2 === 0 ? 'web-thread web-thread-fine' : 'web-thread'} />)}
    </g>
    <g className="web-traveling-light">
      {lightThreads.map((d, i) => <path key={d} d={d} pathLength="100" className={`web-gleam web-gleam-${i}`} />)}
    </g>
    <g className="web-jewels">
      {glintPositions.map(([x, y], i) => {
        return <g key={i} transform={`translate(${x} ${y})`}>
          <circle className="web-dewdrop" r="1.5" />
          <path className={`web-spark web-spark-${i}`} d="M-6 0H6M0-6V6M-2-2 2 2M-2 2 2-2" />
        </g>
      })}
    </g>
    {isTop && <Pendants />}
  </svg>
}

/** Viewport-anchored corners remain visible when the architecture is cropped. */
export function WebFrame() {
  return <div className="web-frame" aria-hidden="true">
    {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner, index) => <WebCorner key={corner} corner={corner} index={index} />)}
  </div>
}
