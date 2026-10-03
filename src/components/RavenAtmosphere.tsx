import type { CSSProperties } from 'react'
import '../raven-theme.css'

// Decorative glyphs, kept separate from the central Miraculous prism.
export function RavenRune({ kind }: { kind: 0 | 1 | 2 | 3 | 4 | 5 }) {
  return <g strokeLinecap="round" strokeLinejoin="round">
    {kind === 0 && <path d="M-6 17v-34l15 10M-6-5 15 9" />}
    {kind === 1 && <path d="m0-17 12 13L0 9-12-4ZM0 9l-11 12M0 9l11 12" />}
    {kind === 2 && <path d="M-8 18v-36L9-8-8 2 12 18" />}
    {kind === 3 && <path d="M0 19v-38M-13-4 0-17 13-4M-10 6 0-5 10 6" />}
    {kind === 4 && <path d="M-11-18v36m22-36v36M-11-13 11 13" />}
    {kind === 5 && <path d="M0 19v-38M-13-12 0 1 13-12M-10 14 0 3 10 14" />}
  </g>
}

const runes = [
  { x: 152, y: 310, kind: 0, delay: -3, duration: 17, scale: 1, lift: 22, drift: 5, tilt: 3 },
  { x: 356, y: 170, kind: 3, delay: -11, duration: 21, scale: .8, lift: 18, drift: -7, tilt: -4 },
  { x: 264, y: 685, kind: 1, delay: -10, duration: 19, scale: 1.1, lift: 26, drift: 6, tilt: -3 },
  { x: 508, y: 894, kind: 4, delay: -6, duration: 23, scale: .85, lift: 19, drift: -5, tilt: 4 },
  { x: 1768, y: 370, kind: 2, delay: -6, duration: 18, scale: 1, lift: 24, drift: -6, tilt: -3 },
  { x: 1560, y: 182, kind: 5, delay: -15, duration: 22, scale: .85, lift: 18, drift: 5, tilt: 4 },
  { x: 1656, y: 730, kind: 0, delay: -13, duration: 20, scale: 1.1, lift: 23, drift: -7, tilt: 3 },
  { x: 1412, y: 890, kind: 1, delay: -4, duration: 24, scale: .8, lift: 17, drift: 6, tilt: -4 },
] as const

export function RavenAtmosphere() {
  return <div className="atmosphere raven-atmosphere" aria-hidden="true">
    <svg className="raven-architecture" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" fill="none" focusable="false">
      {/* A steep wooden hall, drawn as a silhouette rather than a landscape. */}
      <g className="raven-house">
        <g className="raven-roof">
          <path className="raven-roof-beam" d="M328 808 960 38l632 770h-46L960 94 374 808Z" />
          <path d="m341 791-16 25h70m1184-25 16 25h-70M348 798l18-1m1188 1-18-1" />
          <path className="raven-roof-joints" d="m644 423 26 22m-125 98 26 22m-125 98 26 22m804-264-26 22m125 98-26 22m125 98-26 22" />
        </g>
        <g className="raven-side-halls">
          <path d="M412 710H292l-31 34h151M1508 710h120l31 34h-151M287 744v251h127m1219-251v251h-127" />
          <path d="M308 745v250m1304-250v250M310 773h100m1100 0h100" />
        </g>
        <path d="M418 771v224h1084V771M447 800v195m1026-195v195M405 995h1110v12H405Z" />
        <g className="raven-porch">
          <path className="raven-roof-beam" d="m588 675 372-456 372 456h-38L960 264 626 675Z" />
          <path d="M607 675h39v320h-39Zm667 0h39v320h-39ZM616 685v298m688-298v298M595 985h63v10h-63Zm667 0h63v10h-63Z" />
          <path d="m783 626 177-211 177 211h-31L960 447 814 626ZM814 626v369m292-369v369M828 640v355m264-355v355" />
          <path className="raven-door" d="M852 995V666l108-127 108 127v329M862 666l98-115 98 115M875 690v285m170-285v285" />
        </g>
        <g className="raven-joinery">
          <path d="m447 811 72 79m954-79-72 79M646 696l71 78m557-78-71 78M418 915h189m706 0h189" />
          <path d="M626 705v23m-6-11h12m662-12v23m-6-11h12" />
        </g>
      </g>
    </svg>
    <div className="raven-rune-field">
      {runes.map((rune, index) => <span key={index} className="raven-rune-anchor" style={{
        left: `${rune.x / 19.2}%`, top: `${rune.y / 10.8}%`,
        '--rune-delay': `${rune.delay}s`, '--rune-duration': `${rune.duration}s`,
        '--rune-scale': rune.scale, '--rune-lift': `${rune.lift}px`,
        '--rune-drift': `${rune.drift}px`, '--rune-tilt': `${rune.tilt}deg`,
      } as CSSProperties}>
        <svg className="raven-rune-float" viewBox="-28 -30 56 60" fill="none" focusable="false">
          <g className="raven-rune-light"><RavenRune kind={rune.kind} /></g>
        </svg>
      </span>)}
    </div>
  </div>
}
