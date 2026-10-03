import type { CSSProperties } from 'react'
import '../phoenix-theme.css'

export function PhoenixWingArtwork() {
  return <g className="phoenix-wing-motion">
    <g className="phoenix-wing-outline">
      <path d="M-26 66c-62-46-86-97-148-113-87-22-220-124-329-266 3 53 34 104 66 129l-54-35c25 79 68 130 113 155l-54-15c29 69 77 113 130 132l-53-7c31 53 73 82 123 92l-45 5c41 47 90 68 157 63l-39 15c85-1 135-33 126-156Z" />
      <g className="phoenix-feather-lines">
        <path d="M-105 11C-270-61-429-202-503-313M-96 50C-268-5-406-115-491-219M-84 40C-233 30-352-38-432-79M-82 68C-161 76-304 76-355 46M-71 101c-77 42-155 54-206 42M-32 110c-29 103-78 128-127 111" />
        <path d="m-396-171-14-28m-32-19-8-27M-346-89l-27-38m-34-27-12-32M-293-5l-34-24m-40-12-27-31M-230 78l-34-7m-40-6-18-13M-160 137l-21 6m-36 7-19-5M-92 174l-12 18m-20 13-19 6" />
      </g>
    </g>
    <g className="phoenix-plume-light">
      <path d="M-503-313c3 27 12 54 24 77M-432-79c7 17 15 33 26 48M-277 143c14 16 30 29 48 39" />
    </g>
  </g>
}

export function PhoenixMobileWing() {
  return <g className="phoenix-wing-motion">
    <g className="phoenix-wing-outline">
      <path d="M0 80C-22 49-42 18-83 0c12 20 19 35 38 47l-21-7c11 17 23 28 40 31l-14 6c21 16 33 16 40 3Z" />
      <path d="M-3 73C-27 44-55 20-83 0M-6 77c-14-18-34-25-60-37M-4 80c-9 3-23 3-36-3" />
    </g>
    <path className="phoenix-plume-light" d="M-83 0c4 7 9 15 15 22" />
  </g>
}

const embers = [
  { x: 7, y: 69, delay: -3, duration: 22, drift: 12 },
  { x: 17, y: 39, delay: -12, duration: 27, drift: -8 },
  { x: 28, y: 83, delay: -8, duration: 24, drift: 10 },
  { x: 38, y: 24, delay: -17, duration: 29, drift: -6 },
  { x: 62, y: 77, delay: -6, duration: 26, drift: 7 },
  { x: 73, y: 33, delay: -15, duration: 23, drift: -9 },
  { x: 84, y: 62, delay: -10, duration: 28, drift: 11 },
  { x: 94, y: 46, delay: -19, duration: 25, drift: -7 },
] as const

export function PhoenixAtmosphere() {
  return <div className="atmosphere phoenix-atmosphere" aria-hidden="true">
    <svg className="phoenix-background-art" viewBox="0 0 1440 920" fill="none" focusable="false">
      <g className="phoenix-sun-halo">
        <circle cx="720" cy="424" r="347" /><circle cx="720" cy="424" r="358" />
        <path d="M491 164a347 347 0 0 1 99-62m360 62a347 347 0 0 0-99-62" />
      </g>
      <g transform="translate(720 465)" style={{ '--phoenix-delay': '-4s' } as CSSProperties}><PhoenixWingArtwork /></g>
      <g transform="translate(720 465) scale(-1 1)" style={{ '--phoenix-delay': '-12s' } as CSSProperties}><PhoenixWingArtwork /></g>
      <g className="phoenix-body-outline">
        <path d="M714 420c34-58 33-102 10-119-18-14-34-4-36 9l-24 15 25 3c-4 32-7 62-27 93m47-126-6-24 18 16 6-22 6 30m-9 6 15 5" />
        <path d="M677 526c-18 97-39 196-92 271 58-20 101-93 135-169 34 76 77 149 135 169-53-75-74-174-92-271M710 595c-21 110-35 205-23 291l33-34 33 34c12-86-2-181-23-291M720 663v189" />
      </g>
      <g className="phoenix-ground-lines"><path d="M82 854h1276M138 869h1164M212 884h1016" /></g>
    </svg>
    <div className="phoenix-ember-field">
      {embers.map((ember, index) => <span key={index} className="phoenix-ember" style={{
        left: `${ember.x}%`, top: `${ember.y}%`, '--phoenix-delay': `${ember.delay}s`,
        '--phoenix-duration': `${ember.duration}s`, '--phoenix-drift': `${ember.drift}px`,
      } as CSSProperties} />)}
    </div>
  </div>
}
