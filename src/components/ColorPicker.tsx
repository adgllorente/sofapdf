import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { HexAlphaColorPicker } from 'react-colorful'
import { normalizeHexAlpha } from '@/lib/colors'

type ColorPickerProps = {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

const PICKER_SIZE = 220
const POPOVER_WIDTH = PICKER_SIZE + 24
const POPOVER_HEIGHT = PICKER_SIZE + 48
const POPOVER_GAP = 8

export function ColorPicker({ label, value, onChange, disabled }: ColorPickerProps) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const pickerColor = normalizeHexAlpha(value)

  const positionPicker = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const top = rect.bottom + POPOVER_GAP + POPOVER_HEIGHT <= window.innerHeight
      ? rect.bottom + POPOVER_GAP
      : rect.top - POPOVER_HEIGHT - POPOVER_GAP
    const left = Math.max(POPOVER_GAP, Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - POPOVER_GAP))
    setPosition({ top: Math.max(POPOVER_GAP, top), left })
  }, [])

  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  useEffect(() => {
    if (!open) return

    function closeOnOutside(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Node)) return
      if (!triggerRef.current?.contains(target) && !popoverRef.current?.contains(target)) setOpen(false)
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    window.addEventListener('resize', positionPicker)
    window.addEventListener('scroll', positionPicker, true)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('resize', positionPicker)
      window.removeEventListener('scroll', positionPicker, true)
    }
  }, [open, positionPicker])

  function toggle() {
    if (disabled) return
    if (open) setOpen(false)
    else {
      positionPicker()
      setOpen(true)
    }
  }

  const popover = open && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={label}
          className="fixed z-50 rounded-lg border border-line bg-surface p-3 shadow-lg"
          style={{ top: position.top, left: position.left }}
        >
          <HexAlphaColorPicker
            color={pickerColor}
            onChange={(next) => onChange(normalizeHexAlpha(next))}
            aria-label={label}
            style={{ width: PICKER_SIZE, height: PICKER_SIZE }}
          />
        </div>,
        document.body,
      )
    : null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={label}
        onClick={toggle}
        className="size-9 cursor-pointer rounded border border-line bg-surface p-1 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="relative block size-full overflow-hidden rounded" aria-hidden="true">
          <span className="grid size-full grid-cols-2 grid-rows-2">
            <span className="bg-surface" />
            <span className="bg-line" />
            <span className="bg-line" />
            <span className="bg-surface" />
          </span>
          <span className="absolute inset-0" style={{ backgroundColor: pickerColor }} />
        </span>
      </button>
      {popover}
    </>
  )
}
