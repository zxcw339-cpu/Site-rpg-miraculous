import type { CSSProperties } from 'react'
import '../kraken-theme.css'

export function KrakenTendril({ curled = false }: { curled?: boolean }) {
  const cups = curled
    ? [[-108, 388, -8], [-167, 401, 8], [-231, 392, 22], [-287, 359, 42], [-334, 307, 63]]
    : [[-83, 401, -36], [-132, 355, -36], [-172, 297, -23], [-194, 237, -16], [-218, 180, -31]]
  return <g className="kraken-tendril-motion">
    <g className="kraken-tendril-outline">
      {curled ? <>
        <path d="M0 405c-108-49-196 48-302-2-80-37-144-121-108-183 22-38 69-50 96-24 19 18 13 46-5 57-12 8-31 3-31-11" />
        <path d="M-6 392c-84-65-204 18-287-23-53-25-94-81-73-120 11-20 33-24 45-10 10 12 4 25-5 25" />
      </> : <>
        <path d="M0 510c-85-89-183-97-227-217-30-82-21-139-74-182-39-32-107-39-136 5-23 36-14 88 22 108 23 13 57 6 65-16 8-19-4-38-19-37-10 0-17 9-14 17" />
        <path d="M-12 500c-39-123-134-131-167-228-31-91-26-141-76-176-38-26-87-28-102-1-11 21-3 44 11 54 13 9 29 5 34-3 6-10 2-19-4-19" />
      </>}
      <g className="kraken-suckers">
        {cups.map(([x, y, angle], index) => <ellipse key={index} cx={x} cy={y} rx={3 + index * .45} ry={5 + index * .6} transform={`rotate(${angle} ${x} ${y})`} />)}
      </g>
    </g>
    <g className="kraken-biolight">
      {curled ? <path d="M-410 220c12-21 33-34 54-33" /> : <path d="M-432 122c-13 23-15 49-5 70" />}
      <circle cx={cups[2]![0]} cy={cups[2]![1]} r="1.5" />
      <circle cx={cups[4]![0]} cy={cups[4]![1]} r="1.2" />
    </g>
  </g>
}

// A separate small silhouette keeps the mobile title clear.
export function KrakenMobileTendril() {
  return <g className="kraken-tendril-motion">
    <g className="kraken-tendril-outline">
      <path d="M20 182c-9-31-5-71 12-91 12-15 26-20 38-34 11-13 7-32-7-38-15-7-35 3-34 20 0 11 12 18 20 12 6-5 3-13-2-13" />
      <path d="M30 182c-11-31 0-66 16-86 13-16 30-21 36-39 8-25-10-47-32-45-25 2-37 27-27 44" />
      <ellipse cx="25" cy="141" rx="2" ry="3" /><ellipse cx="33" cy="115" rx="2" ry="3" /><ellipse cx="51" cy="90" rx="2" ry="3" />
    </g>
    <g className="kraken-biolight"><path d="M31 30c5-10 17-14 27-12" /><circle cx="33" cy="115" r="1.3" /></g>
  </g>
}

const arms = [
  { x: 885, y: 110, scale: 1.5, curled: false, delay: -4, duration: 23 },
  { x: 805, y: 290, scale: 1.1, curled: false, delay: -13, duration: 27 },
  { x: 825, y: 430, scale: 1.2, curled: true, delay: -8, duration: 25 },
  { x: 860, y: 585, scale: .8, curled: true, delay: -17, duration: 29 },
] as const

const particles = [
  { x: 9, y: 52, delay: -7 }, { x: 18, y: 24, delay: -14 },
  { x: 29, y: 73, delay: -3 }, { x: 39, y: 13, delay: -11 },
  { x: 61, y: 82, delay: -19 }, { x: 71, y: 35, delay: -9 },
  { x: 82, y: 64, delay: -16 }, { x: 93, y: 21, delay: -5 },
] as const

export function KrakenAtmosphere() {
  return <div className="atmosphere kraken-atmosphere" aria-hidden="true">
    <svg className="kraken-background-art" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" fill="none" focusable="false">
      <g className="kraken-deep-water">
        <ellipse cx="960" cy="660" rx="164" ry="262" />
        <path d="M45 0v864m1830-864v864M74 963q886-46 1772 0M120 984q840-40 1680 0M220 1006q740-34 1480 0M240 83q720 43 1440 0" />
      </g>
      {[-1, 1].flatMap(side => arms.map((arm, index) => <g key={`${side}-${index}`} transform={`translate(${side === 1 ? arm.x : 1920 - arm.x} ${arm.y}) scale(${arm.scale * side} ${arm.scale})`} style={{
        '--kraken-delay': `${arm.delay + (side === 1 ? 0 : -6)}s`, '--kraken-duration': `${arm.duration}s`,
        '--kraken-drift': `${index % 2 === 0 ? 6 : -6}px`,
      } as CSSProperties}><KrakenTendril curled={arm.curled} /></g>))}
    </svg>
    <div className="kraken-particles">
      {particles.map((particle, index) => <span key={index} className="kraken-particle" style={{ left: `${particle.x}%`, top: `${particle.y}%`, '--kraken-delay': `${particle.delay}s` } as CSSProperties} />)}
    </div>
  </div>
}
