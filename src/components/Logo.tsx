import { APP } from '@/config'

/** Marca: un sofá con un PDF encima. Las clases dejan que el color se adapte al tema. */
export function Logo({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" className="fill-ink" />
      <g className="fill-canvas">
        <rect x="5" y="15" width="22" height="5" rx="1.5" />
        <rect x="3" y="17" width="3" height="6" rx="1.2" />
        <rect x="26" y="17" width="3" height="6" rx="1.2" />
        <rect x="3" y="20" width="26" height="3" rx="1" />
        <rect x="5.5" y="23" width="1.5" height="2" rx="0.4" />
        <rect x="25" y="23" width="1.5" height="2" rx="0.4" />
      </g>
      <path
        d="M11 8h7l3 3v8a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1z"
        className="fill-accent"
      />
      <path d="M18 8v3h3" className="fill-ink opacity-50" />
    </svg>
  )
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <Logo className="size-8" />
      <span className="text-[15px] font-semibold tracking-tight text-ink">
        {APP.name}
      </span>
    </span>
  )
}
