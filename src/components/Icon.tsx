/**
 * Set de iconos inline. No usamos librería ni sprite externo: cero peticiones
 * de red es parte de la promesa del producto.
 */
const PATHS = {
  merge: 'M8 3v5a4 4 0 0 0 4 4h8m0 0-3-3m3 3-3 3M4 21h4M4 17h4M4 13h2',
  split: 'M20 3h-4a4 4 0 0 0-4 4v10a4 4 0 0 0 4 4h4M12 12H3m0 0 3-3m-3 3 3 3',
  compress: 'M4 9h16M4 15h16M9 4l3 3 3-3M9 20l3-3 3 3',
  rotate: 'M21 12a9 9 0 1 1-3-6.7M21 4v5h-5',
  image: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6',
  file: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zm0 0v5h5',
  lock: 'M6 11h12v10H6zM9 11V7a3 3 0 0 1 6 0v4',
  unlock: 'M6 11h12v10H6zM9 11V7a3 3 0 0 1 5.7-1.3',
  droplet: 'M12 3s6 6.3 6 10a6 6 0 0 1-12 0c0-3.7 6-10 6-10z',
  hash: 'M4 9h16M4 15h16M10 3 8 21M16 3l-2 18',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  crop: 'M6 2v14a2 2 0 0 0 2 2h14M2 6h14a2 2 0 0 1 2 2v14',
  wrench: 'M14.7 6.3a4 4 0 0 0 5 5L21 10a6 6 0 0 1-8.4 6.9L6 21a2.1 2.1 0 0 1-3-3l4.1-6.6A6 6 0 0 1 14 3z',
  text: 'M4 6V4h16v2M12 4v16M9 20h6',
  pen: 'M3 21s3-1 5-3l9-9a2.8 2.8 0 0 0-4-4l-9 9c-2 2-3 5-3 5zM14 5l4 4',
  eyeOff: 'M10.6 6.2A9 9 0 0 1 12 6c5 0 9 6 9 6a15 15 0 0 1-3 3.4M6.5 8.5A15 15 0 0 0 3 12s4 6 9 6a9 9 0 0 0 3.6-.7M3 3l18 18',
  diff: 'M9 3v6M6 6h6M6 19h6M15 8l6 6m0-6-6 6',
  code: 'm9 8-5 4 5 4m6-8 5 4-5 4',
  archive: 'M3 5h18v4H3zM5 9v10h14V9M10 13h4',
  scan: 'M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M7 12h10',
  shield: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6zM9 12l2 2 4-4',
  wifiOff: 'M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 4-2.4M2 8.8A15 15 0 0 1 7 6m5-1a15 15 0 0 1 10 3.8M15.6 12a10 10 0 0 1 3.4 1M12 20h.01',
  cpu: 'M6 6h12v12H6zM9 9h6v6H9M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3',
  download: 'M12 3v12m0 0 4-4m-4 4-4-4M4 19h16',
  trash: 'M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13',
  arrowLeft: 'M19 12H5m0 0 6-6m-6 6 6 6',
  up: 'm6 15 6-6 6 6',
  down: 'm6 9 6 6 6-6',
  sun: 'M12 4V2M12 22v-2M4 12H2M22 12h-2M6 6 4.5 4.5M19.5 19.5 18 18M18 6l1.5-1.5M4.5 19.5 6 18M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z',
  check: 'm5 13 4 4L19 7',
  plus: 'M12 5v14M5 12h14',
  x: 'M6 6l12 12M6 18 18 6',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  alert: 'M12 8v5m0 3h.01M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18',
} as const

export type IconName = keyof typeof PATHS

type Props = {
  name: IconName
  className?: string
  strokeWidth?: number
}

export function Icon({ name, className = 'size-5', strokeWidth = 1.6 }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
