import clsx from 'clsx'
// Asset de marca de Ko-fi servido desde el propio origen: hotlinkar su CDN
// rompería el modo sin conexión y la promesa de cero terceros.
import kofiBadge from '@/assets/kofi-badge.png'
import { APP } from '@/config'
import { t } from '@/i18n'

type Props = {
  /** Alto del botón; el ancho sale del ratio 5:1 del asset. */
  height?: string
  /** Va al enlace, para visibilidad y colocación. */
  className?: string
}

/** El botón lo pinta Ko-fi en inglés: es su marca, no se traduce. El alt sí. */
export function KofiBadge({ height = 'h-9', className }: Props) {
  return (
    <a
      href={APP.kofiUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={clsx('shrink-0 rounded-lg transition hover:opacity-85', className)}
    >
      <img src={kofiBadge} alt={t.kofi} className={clsx('w-auto', height)} />
    </a>
  )
}
