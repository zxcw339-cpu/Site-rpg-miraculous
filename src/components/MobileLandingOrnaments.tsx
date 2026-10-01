import type { ThemeDefinition } from '../themes/themes'
import { FeatherArtwork } from './ValkyrieAtmosphere'
import '../mobile-landing-ornaments.css'

function MobileLantern({ x, length }: { x: number; length: number }) {
  return <g transform={`translate(${x} 0)`}>
    <path d={`M0 0v${length}`} opacity=".45" />
    <g className="mobile-lantern-sway" transform={`translate(0 ${length})`}>
      <path d="m0-6 3 4-3 4-3-4ZM-4 4h8M0 2v2" />
      <rect className="mobile-lantern-light" x="-10" y="5" width="20" height="34" rx="8" />
      <path d="M-7 11H7M-9 16H9M-9 21H9M-9 26H9M-7 33H7M-4 39h8M0 40v7" opacity=".6" />
      <path className="mobile-lantern-glow" d="m0 14 4 8-4 8-4-8ZM0 14v16" />
    </g>
  </g>
}

// A portrait composition in its own coordinates; never stretch the desktop gate.
// The home hero uses the same motifs through the current theme attribute.
export function MobileLandingOrnaments({ variant }: { variant?: ThemeDefinition['atmosphere'] }) {
  return <div className="mobile-landing-ornaments" data-variant={variant} aria-hidden="true">
    <svg className="mobile-ornament-art mobile-ornament-threads" viewBox="0 0 360 200" fill="none" focusable="false">
      <g className="mobile-silver-strands">
        <path d="M8 0C18 44 30 61 15 136M37 0C30 55 16 70 3 91M0 47C45 31 73 19 100 0M352 0C342 44 330 61 345 136M323 0C330 55 344 70 357 91M360 47C315 31 287 19 260 0" />
        <g className="mobile-strand-pendant"><path d="M23 49v31m0 0 4 7-4 7-4-7Z" /><circle cx="23" cy="72" r="1.5" /></g>
        <g className="mobile-strand-pendant"><path d="M337 49v31m0 0 4 7-4 7-4-7Z" /><circle cx="337" cy="72" r="1.5" /></g>
      </g>
    </svg>
    <svg className="mobile-ornament-art mobile-ornament-lanterns" viewBox="0 0 360 200" fill="none" focusable="false">
      <g className="mobile-kitsune-roof"><path d="M65 8q115 28 230 0l-5 13q-110 20-220 0ZM77 27q103 14 206 0" /></g>
      <g className="mobile-lanterns"><MobileLantern x={22} length={32} /><MobileLantern x={338} length={58} /></g>
    </svg>
    <svg className="mobile-ornament-art mobile-ornament-feathers" viewBox="0 0 360 200" fill="none" focusable="false">
      <g className="mobile-nordic-gate">
        <path d="m10 51 170-41 170 41M20 53l160-35 160 35M158 3l44 24M202 3l-44 24M14 56h332v7H14ZM20 63v88m7-88v86m313-86v88m-7-88v86" />
        <path className="mobile-nordic-gold" d="m20 82 7 9-7 9m320-18-7 9 7 9M20 134h7m306 0h7" />
      </g>
    </svg>
    <div className="mobile-plumes">
      <span className="mobile-plume mobile-plume-left"><FeatherArtwork /></span>
      <span className="mobile-plume mobile-plume-right"><FeatherArtwork /></span>
    </div>
  </div>
}
