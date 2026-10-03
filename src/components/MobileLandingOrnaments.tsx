import type { CSSProperties } from 'react'
import type { ThemeDefinition } from '../themes/themes'
import { FeatherArtwork } from './ValkyrieAtmosphere'
import { RavenRune } from './RavenAtmosphere'
import { CerberusChain, PandoraBoxArtwork } from './CerberusAtmosphere'
import { StrixMaskArtwork, StrixMoon } from './StrixAtmosphere'
import { KrakenMobileTendril } from './KrakenAtmosphere'
import { PhoenixMobileWing } from './PhoenixAtmosphere'
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
    <svg className="mobile-ornament-art mobile-ornament-runes" viewBox="0 0 360 200" fill="none" focusable="false">
      <g className="mobile-raven-house">
        <path d="m40 170 140-158 140 158h-16L180 32 56 170ZM56 170v28m248-28v28M54 148H30l-12 13h34m254-13h24l12 13h-34" />
        <path d="m103 162 77-87 77 87h-13l-64-72-64 72ZM116 162h7v36h-7Zm121 0h7v36h-7ZM124 169l15 15m97-15-15 15" />
      </g>
      <g className="mobile-raven-runes">
        {([{ x: 22, y: 79, kind: 0, delay: -3 }, { x: 338, y: 110, kind: 1, delay: -9 }, { x: 44, y: 153, kind: 4, delay: -12 }, { x: 306, y: 38, kind: 5, delay: -5 }] as const).map((rune, index) =>
          <g key={index} transform={`translate(${rune.x} ${rune.y}) scale(.5)`}>
            <g className="mobile-raven-rune-float" style={{ '--rune-delay': `${rune.delay}s` } as CSSProperties}>
              <g className="raven-rune-light"><RavenRune kind={rune.kind} /></g>
            </g>
          </g>,
        )}
      </g>
    </svg>
    <svg className="mobile-ornament-art mobile-ornament-chains" viewBox="0 0 360 200" fill="none" focusable="false">
      <g className="mobile-pandora-box" transform="translate(-7 -5) scale(.26)"><PandoraBoxArtwork /></g>
      <g className="mobile-cerberus-chains">
        <g transform="translate(20 -8) scale(.42)"><CerberusChain links={12} delay={-4} /></g>
        <g transform="translate(340 -8) scale(.42)"><CerberusChain links={17} delay={-10} /></g>
      </g>
    </svg>
    <svg className="mobile-ornament-art mobile-ornament-night" viewBox="0 0 360 200" fill="none" focusable="false">
      <g className="mobile-strix-mask" transform="translate(180 65) scale(.65)"><StrixMaskArtwork /></g>
      <g transform="translate(32 1) scale(.38)"><StrixMoon /></g>
    </svg>
    <svg className="mobile-ornament-art mobile-ornament-abyss" viewBox="0 0 360 200" fill="none" focusable="false">
      <g className="mobile-kraken-arm-left" transform="translate(4 -13) scale(.68)"><KrakenMobileTendril /></g>
      <g className="mobile-kraken-arm-right" transform="translate(356 -13) scale(-.68 .68)"><KrakenMobileTendril /></g>
      <g className="mobile-kraken-ripples"><path d="M78 24q102 20 204 0M99 33q81 14 162 0" /></g>
    </svg>
    <svg className="mobile-ornament-art mobile-ornament-embers" viewBox="0 0 360 200" fill="none" focusable="false">
      <g className="mobile-phoenix-halo"><path d="M84 64a98 49 0 0 1 192 0M91 68a91 44 0 0 1 178 0" /></g>
      <g className="mobile-phoenix-wings">
        <g transform="translate(180 -6) scale(.85)"><PhoenixMobileWing /></g>
        <g transform="translate(180 -6) scale(-.85 .85)" style={{ '--phoenix-delay': '-12s' } as CSSProperties}><PhoenixMobileWing /></g>
      </g>
    </svg>
    <div className="mobile-phoenix-embers">
      <span className="phoenix-ember mobile-phoenix-ember-left" />
      <span className="phoenix-ember mobile-phoenix-ember-right" />
    </div>
    <div className="mobile-strix-feathers">
      <span className="strix-feather mobile-strix-feather-left"><FeatherArtwork /></span>
      <span className="strix-feather mobile-strix-feather-right"><FeatherArtwork /></span>
    </div>
    <div className="mobile-plumes">
      <span className="mobile-plume mobile-plume-left"><FeatherArtwork /></span>
      <span className="mobile-plume mobile-plume-right"><FeatherArtwork /></span>
    </div>
  </div>
}
