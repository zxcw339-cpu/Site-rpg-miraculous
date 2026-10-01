import type { CSSProperties } from 'react'
import '../valkyrie-theme.css'

// Curved, separate filaments and an exposed quill give the plume a soft edge.
// There is deliberately no closed leaf-like outline around the feather.
export function FeatherArtwork() {
  return <svg viewBox="-38 -5 76 200" fill="none" focusable="false">
    <path className="valkyrie-plume-soft" d="M2 9C-19 32-25 61-18 99c4 24 13 42 20 51 10-16 23-35 24-65C28 49 15 19 2 9Z" />
    <g className="valkyrie-barbs">
      {Array.from({ length: 23 }, (_, index) => {
        const y = 25 + index * 5.1
        const shaft = -5 * Math.sin(y / 160 * Math.PI)
        const width = 4 + 21 * Math.sin((y - 12) / 150 * Math.PI)
        const split = index % 5 === 0 ? 3 : 0
        return <g key={index}>
          <path d={`M${shaft} ${y}C${shaft - width * .5} ${y - 5} ${shaft - width} ${y - 14} ${shaft - width + split} ${y - 27}`} />
          <path d={`M${shaft} ${y + 1}C${shaft + width * .62} ${y - 4} ${shaft + width * 1.04} ${y - 15} ${shaft + width * .84 - split} ${y - 23}`} />
        </g>
      })}
    </g>
    <g className="valkyrie-down">
      <path d="M0 141q-10-7-16-4m17 12q-11-2-17 3m18 3q-9 3-12 11M2 140q9-6 16-5M3 150q12-1 16 5M4 156q7 3 11 11" />
    </g>
    <path className="valkyrie-quill" d="M2 7C-10 63-5 119 8 184" />
  </svg>
}

const fallingFeathers = [
  { x: 3, size: 66, duration: 28, delay: -7, drift: 34, tilt: -24, side: 'left' },
  { x: 91, size: 72, duration: 31, delay: -19, drift: -28, tilt: 21, side: 'right' },
  { x: 11, size: 49, duration: 25, delay: -17, drift: -24, tilt: 17, side: 'left' },
  { x: 97, size: 48, duration: 27, delay: -5, drift: -44, tilt: -17, side: 'right' },
  { x: 20, size: 59, duration: 34, delay: -13, drift: 23, tilt: -11, side: 'left' },
  { x: 82, size: 55, duration: 30, delay: -2, drift: -31, tilt: 30, side: 'right' },
  { x: 6, size: 43, duration: 32, delay: -25, drift: 52, tilt: 26, side: 'left' },
  { x: 87, size: 44, duration: 24, delay: -13, drift: 33, tilt: -28, side: 'right' },
  { x: 16, size: 39, duration: 29, delay: -3, drift: -38, tilt: -33, side: 'left' },
  { x: 94, size: 60, duration: 35, delay: -27, drift: -49, tilt: 12, side: 'right' },
] as const

function GatePost({ x }: { x: number }) {
  return <g transform={`translate(${x} 0)`}>
    <path d="M0 197h64v775H0ZM9 210h46v747H9M-12 970h88v14h-88ZM-18 984h100v12h-100Z" />
    <g className="valkyrie-carving">
      <path d="M10 239h44M10 252h44M10 280l44 51m0-51-44 51M10 336h44M10 344h44M10 865h44M10 874h44" />
      <path d="m32 389 14 23-14 23-14-23ZM32 381v62m-8 23 16 19-16 19m16-38-16 19 16 19M32 533v51m-12-37 12-14 12 14M21 777l11-13 11 13m-11-13v45" />
      <path d="M24 597v126m16-126v126" opacity=".5" />
    </g>
  </g>
}

export function ValkyrieAtmosphere() {
  return <div className="atmosphere valkyrie-atmosphere" aria-hidden="true">
    <svg className="valkyrie-architecture" viewBox="0 0 1920 1080" preserveAspectRatio="none" fill="none" focusable="false">
      <g className="valkyrie-gate">
        <path className="valkyrie-roof" d="m432 178 528-148 528 148M462 178 960 48l498 130M925 6l70 67M995 6l-70 67" />
        <path d="M456 178h1008v27H456ZM471 185h978v13H471M496 205l34 47m894-47-32 47" />
        <GatePost x={530} /><GatePost x={1326} />
        <g className="valkyrie-carving"><path d="m663 186 6 6-6 6-6-6Zm588 0 6 6-6 6-6-6ZM898 186h124" /></g>
      </g>
      <g className="valkyrie-floor">
        <path d="M0 996h1920M350 1080l180-84m1040 84-180-84M610 1040h700M760 1016h400" />
      </g>
      <g className="valkyrie-edge-line">
        <path d="M22 0v319l17 17h58M35 0v310l13 13h26M1898 0v319l-17 17h-58M1885 0v310l-13 13h-26" />
        <path d="M22 268l5 8-5 8-5-8Zm1876 0 5 8-5 8-5-8Z" />
      </g>
      <g className="valkyrie-gold valkyrie-stars">
        <path d="m243 726 3 7 7 3-7 3-3 7-3-7-7-3 7-3Zm1439-332 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" />
        <circle cx="313" cy="489" r="1.3" /><circle cx="1613" cy="742" r="1.3" />
      </g>
    </svg>
    <div className="valkyrie-feather-field">
      {fallingFeathers.map((feather, index) => <div key={index} className="valkyrie-falling-feather" data-side={feather.side} style={{
        left: `${feather.x}%`,
        '--feather-size': `${feather.size}px`,
        '--fall-duration': `${feather.duration}s`,
        '--fall-delay': `${feather.delay}s`,
        '--feather-drift': `${feather.drift}px`,
        '--feather-tilt': `${feather.tilt}deg`,
        '--feather-rest-y': `${16 + (index % 5) * 15}vh`,
      } as CSSProperties}>
        <div className="valkyrie-feather-turn"><FeatherArtwork /></div>
      </div>)}
    </div>
  </div>
}
