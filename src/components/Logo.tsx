import { APP } from '@/config'

/** Marca: una hoja con un candado implícito en el pliegue. */
export function Logo({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" className="fill-ink" />
      <path
        d="M11 9h6l4 4v10a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1z"
        className="fill-none stroke-canvas"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M16.5 16.5v-1.2a1.6 1.6 0 0 1 3.2 0" className="hidden" />
      <rect x="13.5" y="17" width="5" height="4" rx="1" className="fill-accent" />
      <path
        d="M14.9 17v-1.1a1.1 1.1 0 0 1 2.2 0V17"
        className="fill-none stroke-accent"
        strokeWidth="1.2"
      />
    </svg>
  )
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <Logo className="size-8" />
      <span className="text-[15px] font-semibold tracking-tight text-ink">{APP.name}</span>
    </span>
  )
}
