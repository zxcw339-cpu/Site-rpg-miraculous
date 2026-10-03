import { useId, type CSSProperties } from 'react'
import { FeatherArtwork } from './ValkyrieAtmosphere'
import '../strix-theme.css'

export function StrixMoon() {
  return <g className="strix-moon-art">
    <path className="strix-moon-crescent" d="M82 15a57 57 0 1 0 0 110 48 48 0 0 1 0-110Z" />
    <path d="m117 28 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" />
    <circle cx="23" cy="9" r="1" /><circle cx="127" cy="105" r="1.2" />
  </g>
}

// A facial disk and hooked beak keep the nocturnal bird recognizable in line art.
export function StrixMaskArtwork() {
  const id = useId().replace(/:/g, '')
  return <g className="strix-mask">
    <defs>
      <radialGradient id={`${id}-strix-eye-light`}>
        <stop stopColor="#ffcf80" stopOpacity=".22" />
        <stop offset=".55" stopColor="#e9ae58" stopOpacity=".13" />
        <stop offset="1" stopColor="#ce873d" stopOpacity="0" />
      </radialGradient>
    </defs>
    <g className="strix-mask-outline">
      <path d="M0-128c-86-69-192-52-216 31C-253 45-133 155 0 218c133-63 253-173 216-315C192-180 86-197 0-128Z" />
      <path d="M0-105c-75-58-185-37-198 48C-211 28-122 117 0 174-61 63-47-14 0-105Zm0 0c75-58 185-37 198 48C211 28 122 117 0 174 61 63 47-14 0-105Z" />
      <path d="M-186-105c39-26 83-24 120-5m252 5c-39-26-83-24-120-5M-163 37c22 47 57 73 91 89m235-89c-22 47-57 73-91 89" />
      <path className="strix-beak" d="M0-5 20 40 0 72-20 40ZM0 5v49" />
      {[-1, 1].map(side => <g key={side} transform={`scale(${side} 1)`}>
        {[0, 1, 2, 3, 4].map(index => <path key={index} d={`M${177 - index * 15} ${57 + index * 22}q-4 15-13 19`} />)}
        <path d="M49 165q-1 16-8 27m27-17-5 22m19-13-3 19" />
      </g>)}
    </g>
    <g className="strix-eyes">
      {[-114, 114].map(x => <g key={x} transform={`translate(${x} -34)`}>
        <g className="strix-eye-blink">
          <circle className="strix-eye-halo" r="37" fill={`url(#${id}-strix-eye-light)`} />
          <path className="strix-eye-rim" d="M-38-6q38-30 76 0-38 39-76 0Z" />
          <circle className="strix-iris" r="23" />
          <circle className="strix-pupil" r="10" />
          <circle className="strix-eye-glint" cx="-7" cy="-8" r="1.7" />
        </g>
      </g>)}
    </g>
  </g>
}

const feathers = [
  { x: 5, y: 31, size: 38, tilt: -21, drift: 10, delay: -4, duration: 23 },
  { x: 15, y: 67, size: 44, tilt: 18, drift: -13, delay: -13, duration: 27 },
  { x: 25, y: 15, size: 27, tilt: -38, drift: 8, delay: -8, duration: 25 },
  { x: 95, y: 58, size: 39, tilt: 24, drift: -11, delay: -11, duration: 26 },
  { x: 84, y: 80, size: 34, tilt: -16, drift: 12, delay: -17, duration: 29 },
  { x: 76, y: 21, size: 28, tilt: 31, drift: -9, delay: -6, duration: 24 },
] as const

export function StrixAtmosphere() {
  return <div className="atmosphere strix-atmosphere" aria-hidden="true">
    <svg className="strix-background-art" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" fill="none" focusable="false">
      <g transform="translate(960 470) scale(2.65)"><StrixMaskArtwork /></g>
      <g className="strix-night-lines"><path d="M70 990h410m960 0h410M45 0v880m1830-880v880" /><circle cx="228" cy="836" r="1.3" /><circle cx="1692" cy="300" r="1.2" /></g>
    </svg>
    <svg className="strix-moon" viewBox="0 0 140 140" fill="none" focusable="false"><StrixMoon /></svg>
    <div className="strix-feather-field">
      {feathers.map((feather, index) => <span key={index} className="strix-feather" style={{
        left: `${feather.x}%`, top: `${feather.y}%`, width: `${feather.size}px`,
        '--strix-tilt': `${feather.tilt}deg`, '--strix-drift': `${feather.drift}px`,
        '--strix-delay': `${feather.delay}s`, '--strix-duration': `${feather.duration}s`,
      } as CSSProperties}><FeatherArtwork /></span>)}
    </div>
  </div>
}
