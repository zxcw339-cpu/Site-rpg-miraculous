import { WebFrame } from './WebFrame'
import { LanternAtmosphere } from './LanternAtmosphere'

/** Original architectural frame and decorative silver strands. */
export function Atmosphere({ variant = 'threads' }: { variant?: 'threads' | 'lanterns' }) {
  if (variant === 'lanterns') return <LanternAtmosphere />
  return (
    <div
      className="atmosphere"
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}
    >
      <svg
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
        width="100%"
        height="100%"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ color: '#7c7d78' }}
      >
        <defs>
          <radialGradient id="atmosphere-ambient">
            <stop stopColor="var(--ambient)" stopOpacity=".16" />
            <stop offset="1" stopColor="var(--ambient)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="atmosphere-floor" x1="800" y1="790" x2="800" y2="1020" gradientUnits="userSpaceOnUse">
            <stop stopColor="currentColor" stopOpacity="0" />
            <stop offset=".45" stopColor="currentColor" stopOpacity=".14" />
            <stop offset="1" stopColor="currentColor" stopOpacity=".02" />
          </linearGradient>
          <linearGradient id="atmosphere-column" x1="0" y1="180" x2="0" y2="950" gradientUnits="userSpaceOnUse">
            <stop stopColor="currentColor" stopOpacity=".08" />
            <stop offset=".5" stopColor="currentColor" stopOpacity=".2" />
            <stop offset="1" stopColor="currentColor" stopOpacity=".04" />
          </linearGradient>
          <g id="atmosphere-pillar" stroke="url(#atmosphere-column)" strokeWidth="1.2">
            <path d="M267-25V224L226 237V251L240 247V778L216 785V801L210 808V879H365V808L359 801V785L335 778V247L350 251V237L309 224V-25" />
            <path d="M278-25V221H299V-25M240 247 285 233 335 247M226 237 285 220 350 237M252 264V770M263 279V770M314 279V770M324 264V770M240 778H335M216 785H359M216 801H359M228 816H347V879M248 817V879M327 817V879" />
            <path d="M287 259C278 284 257 297 226 310C257 323 278 338 287 365C296 338 317 323 348 310C317 297 296 284 287 259Z" />
            <ellipse cx="287" cy="312" rx="39" ry="48" />
            <path d="M287 287C285 302 279 309 261 312C279 315 285 322 287 337C289 322 295 315 313 312C295 309 289 302 287 287ZM287 366V387M282 396 287 387 292 396 287 405ZM287 761V775M282 783 287 775 292 783 287 791Z" />
          </g>
        </defs>

        <ellipse cx="800" cy="620" rx="735" ry="520" fill="url(#atmosphere-ambient)" />

        {/* Tall arches leave the center clear for the form. */}
        <g stroke="currentColor" strokeWidth="1.15" opacity=".12">
          <path d="M382 900V314C382 112 499-102 800-191C1101-102 1218 112 1218 314V900" />
          <path d="M400 900V315C400 112 527-77 800-164C1073-77 1200 112 1200 315V900" />
          <path d="M421 900V322C421 128 541-57 800-139C1059-57 1179 128 1179 322V900" />
          <path d="M-164-90C77-44 223 92 223 317V891M-180-70C50-25 207 115 207 318V891M-185-43C48 10 188 151 188 339V891" />
          <path d="M1764-90C1523-44 1377 92 1377 317V891M1780-70C1550-25 1393 115 1393 318V891M1785-43C1552 10 1412 151 1412 339V891" />
          <path d="M57-20V864H201M74-20V847H185M1543-20V864H1399M1526-20V847H1415" />
          <path d="M-9 453C41 551 84 693 166 853M-9 478C32 576 73 707 141 853M1609 453C1559 551 1516 693 1434 853M1609 478C1568 576 1527 707 1459 853" opacity=".6" />
        </g>
        <use href="#atmosphere-pillar" />
        <use href="#atmosphere-pillar" transform="translate(1600 0) scale(-1 1)" />

        <g stroke="url(#atmosphere-floor)" strokeWidth="1">
          <ellipse cx="800" cy="952" rx="690" ry="80" />
          <ellipse cx="800" cy="953" rx="510" ry="59" />
          <ellipse cx="800" cy="953" rx="310" ry="36" />
          <path d="M0 867Q800 833 1600 867M0 880Q800 848 1600 880M0 900Q800 856 1600 900M0 950Q800 868 1600 950M200 1000 750 869M1400 1000 850 869M500 1000 783 869M1100 1000 817 869M800 866V1000" />
          <path d="M800 922C794 946 776 952 728 954C776 957 794 963 800 987C806 963 824 957 872 954C824 952 806 946 800 922Z" />
        </g>

        <g fill="var(--ornament)" opacity=".25">
          <circle cx="162" cy="456" r="1.2" />
          <circle cx="1473" cy="380" r="1" />
          <circle cx="411" cy="649" r="1" />
          <circle cx="1251" cy="682" r="1.2" />
          <circle cx="382" cy="132" r=".8" />
          <circle cx="1192" cy="195" r=".8" />
        </g>
      </svg>
      <WebFrame />
    </div>
  );
}
