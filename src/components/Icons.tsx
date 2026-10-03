import type { SVGProps } from 'react'
import type { ThemeSymbol } from '../themes/themes'

type IconProps = SVGProps<SVGSVGElement>

export function DiscordIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path d="M8 5 5 6C3.3 8.5 2.3 11.6 2 15.3c1.4 1.4 3 2.2 5 2.7l1.2-1.8m7.8-11.2 3 1c1.7 2.5 2.7 5.6 3 9.3-1.4 1.4-3 2.2-5 2.7l-1.2-1.8M7 8c3.3-1.4 6.7-1.4 10 0M7 15c3.3 1.5 6.7 1.5 10 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <ellipse cx="8.5" cy="11.5" rx="1.2" ry="1.5" fill="currentColor" /><ellipse cx="15.5" cy="11.5" rx="1.2" ry="1.5" fill="currentColor" />
  </svg>
}

export function GemIcon(props: IconProps) {
  return <svg viewBox="0 0 40 64" fill="none" aria-hidden="true" {...props}>
    <path d="M20 2 36 29 20 61 4 29Z M20 2 13 29 20 61 27 29Z M4 29 20 34 36 29" stroke="currentColor" strokeWidth="1.15" strokeLinejoin="round" />
  </svg>
}

export function UserIcon(props: IconProps) {
  return <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" {...props}>
    <circle cx="32" cy="32" r="29" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="32" cy="25" r="8.2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M15 54c.5-11 7-17 17-17s16.5 6 17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
}

export function EyeIcon({ hidden, ...props }: IconProps & { hidden: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="1.5" />
    {hidden && <path d="m4 3 16 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
  </svg>
}

export function ArrowIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
}

export function CloseIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}><path d="m6 6 12 12M6 18 18 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
}

export function SymbolIcon({ symbol, ...props }: IconProps & { symbol: ThemeSymbol }) {
  return <svg viewBox="0 0 40 40" fill="none" aria-hidden="true" {...props}>
    {symbol === 'spider' && <g stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"><path d="m17 15-6-4-2-7m7 15-9-2-4-5m13 11-9 2-4 6m14-5-5 6-1 5m12-22 6-4 2-7m-7 15 9-2 4-5m-13 11 9 2 4 6m-14-5 5 6 1 5" /><ellipse cx="20" cy="23" rx="5" ry="7" /><circle cx="20" cy="12.5" r="3.5" /></g>}
    {symbol === 'diamond' && <g stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"><path d="M20 4 32 18 20 36 8 18Z M20 4 16 18 20 36 24 18Z M8 18h24" /></g>}
    {symbol === 'star' && <g stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"><path d="m20 3 4.5 12.5L37 20l-12.5 4.5L20 37l-4.5-12.5L3 20l12.5-4.5Z" /><path d="m11 11 18 18m0-18L11 29" opacity=".5" /><circle cx="20" cy="20" r="4" /></g>}
    {symbol === 'bloom' && <g stroke="currentColor" strokeWidth="1.25"><path d="M20 34C1 28 8 12 20 20 8 8 24 1 20 20 28 1 40 17 20 20 40 20 33 37 20 20Z" strokeLinejoin="round" /><circle cx="20" cy="20" r="3" /></g>}
    {symbol === 'wings' && <g stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"><path d="M18 28C6 27 4 18 3 8c5 7 9 7 12 10l3 10ZM22 28c12-1 14-10 15-20-5 7-9 7-12 10l-3 10ZM5 15l9 6m-6 0 7 3m20-9-9 6m6 0-7 3M20 15l3 5-3 12-3-12Z" /></g>}
    {symbol === 'raven' && <g stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6c-8 1-13 7-12 16 6 1 11-4 12-16ZM18 6 4 35M9 17l5 1m-3-6 5 1M24 5c7 3 11 9 8 17-6-1-10-7-8-17ZM24 5l7 30M25 12l5 3m-4 4 6 2" /></g>}
    {symbol === 'cerberus' && <g stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"><path d="m14 7 2 7v5l4 5 4-5v-5l2-7-6 4ZM3 13l1 8 5 6 5-3-2-8-5-1Zm34 0-1 8-5 6-5-3 2-8 5-1ZM9 27l4 8h14l4-8M20 25v7" /><path d="M18 16h.5m3 0h.5M7 21h.5m25 0h-.5" /></g>}
    {symbol === 'owl' && <g stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10C7 2 2 16 7 25l13 11 13-11c5-9 0-23-13-15ZM20 12v9m-3 3 3 5 3-5" /><circle cx="12.5" cy="18" r="4.5" /><circle cx="27.5" cy="18" r="4.5" /><path d="M12.5 17v2m15-2v2" /></g>}
    {symbol === 'kraken' && <g stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"><path d="M13 22V12a7 7 0 0 1 14 0v10M13 22c-5 0-9-5-8-9m8 10c-7 0-9 11-4 11 3 0 3-4 1-4m5-6c-3 5 1 12 5 12s8-7 5-12m2-2c5 0 9-5 8-9m-8 10c7 0 9 11 4 11-3 0-3-4-1-4" /><path d="M17 17h.5m5 0h.5M18 22h4" /></g>}
    {symbol === 'phoenix' && <g stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"><path d="M18 21C12 18 8 12 3 5c1 10 6 17 14 20M22 21c6-3 10-9 15-16-1 10-6 17-14 20M9 17l-4-1c3 7 7 11 13 10m13-9 4-1c-3 7-7 11-13 10M18 25l-4 12 6-4 6 4-4-12M20 23V14c0-3 2-5 5-4l3 3h-4m-4-3-1-4 4 2" /></g>}
  </svg>
}

export function BoxIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}><path d="m8 3-5 5v8l5 5h8l5-5V8l-5-5Z" stroke="currentColor" strokeWidth="1.3" /><path d="m12 7 5 5-5 5-5-5Z" stroke="currentColor" strokeWidth="1.2" /></svg>
}
