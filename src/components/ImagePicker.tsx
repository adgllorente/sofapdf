import { useRef } from 'react'
import { t } from '@/i18n'
import { Icon } from '@/components/Icon'

type Props = {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function ImagePicker({ label, value, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    // PNG y JPEG se leen directo: no pierden calidad ni resolución original.
    if (file.type === 'image/png' || file.type === 'image/jpeg') {
      const reader = new FileReader()
      reader.onload = () => onChange(String(reader.result))
      reader.readAsDataURL(file)
    } else {
      // SVG, WebP u otros formatos se rasterizan a PNG para asegurar compatibilidad con MuPDF.
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || 500
        canvas.height = img.naturalHeight || 500
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          onChange(canvas.toDataURL('image/png'))
        }
        URL.revokeObjectURL(url)
      }
      img.onerror = () => URL.revokeObjectURL(url)
      img.src = url
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) handleFile(file)
          event.target.value = ''
        }}
        className="sr-only"
        aria-label={label}
      />
      {value ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface p-2.5">
          <div className="grid h-14 w-20 shrink-0 place-items-center overflow-hidden rounded border border-line bg-canvas">
            <img src={value} alt="" className="max-h-full max-w-full object-contain" draggable={false} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
              className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink transition hover:border-line-strong hover:bg-subtle disabled:opacity-40"
            >
              {t.options.changeImage}
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              disabled={disabled}
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-muted transition hover:border-line-strong hover:text-ink disabled:opacity-40"
              aria-label={t.options.removeImage}
              title={t.options.removeImage}
            >
              <Icon name="trash" className="size-3.5" />
              <span>{t.options.removeImage}</span>
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong bg-surface px-4 py-3 text-sm text-muted transition hover:border-accent hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon name="image" className="size-4" />
          <span>{t.options.chooseImage}</span>
        </button>
      )}
    </div>
  )
}
