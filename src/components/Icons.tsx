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
  </svg>
}

export function BoxIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}><path d="m8 3-5 5v8l5 5h8l5-5V8l-5-5Z" stroke="currentColor" strokeWidth="1.3" /><path d="m12 7 5 5-5 5-5-5Z" stroke="currentColor" strokeWidth="1.2" /></svg>
}
