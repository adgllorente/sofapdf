import clsx from 'clsx'
import sofaMascot from '@/assets/sofa-mascot.png'

/**
 * Ilustración del hero: los dos PDF en su sofá. Se monta con HTML para poder
 * difuminar y colocar los adornos (destellos, foco) sin pelearse con un SVG
 * embebido, y para dejar que el tamaño lo controle `className` como en el resto.
 */
export function SofaMascot({ className }: { className?: string }) {
  return (
    <div className={clsx('relative', className)}>
      <Sparkle className="absolute -top-1 left-[8%] size-4" delay="sparkle-1" />
      <Sparkle className="absolute top-[8%] right-[4%] size-5" delay="sparkle-3" />
      <Sparkle className="absolute -right-1 bottom-[18%] size-4" delay="sparkle-5" />
      <Sparkle className="absolute bottom-[10%] left-[3%] size-3" delay="sparkle-2" />

      <img
        src={sofaMascot}
        alt=""
        width={600}
        height={315}
        className="relative block h-auto w-full select-none drop-shadow-[0_8px_24px_rgba(225,29,72,0.18)] dark:drop-shadow-[0_8px_24px_rgba(251,113,133,0.22)]"
        draggable={false}
      />

      <div
        className="pointer-events-none absolute right-[10%] -bottom-2 left-[10%] h-4 rounded-full bg-accent/25 blur-xl dark:bg-accent/35"
        aria-hidden="true"
      />
    </div>
  )
}

function Sparkle({ className, delay }: { className: string; delay: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={clsx('text-accent', className)}
      aria-hidden="true"
    >
      <path
        d="M8 0.5L9.6 6.4L15.5 8L9.6 9.6L8 15.5L6.4 9.6L0.5 8L6.4 6.4Z"
        className={clsx('fill-current sparkle', delay)}
      />
    </svg>
  )
}
