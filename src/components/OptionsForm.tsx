import { t } from '@/i18n'
import { choiceLabel, optionText } from '@/i18n/tools'
import type { OptionValues, Tool } from '@/tools/types'

type Props = {
  tool: Tool
  values: OptionValues
  onChange: (values: OptionValues) => void
  disabled?: boolean
}

const inputClass =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink transition placeholder:text-muted focus:border-accent disabled:opacity-50'

export function OptionsForm({ tool, values, onChange, disabled }: Props) {
  const visible = (tool.options ?? []).filter((field) => !field.showIf || field.showIf(values))

  function set(key: string, value: OptionValues[string]) {
    onChange({ ...values, [key]: value })
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {visible.map((field) => {
        const text = optionText(tool, field)

        return (
          <label key={field.key} className="block space-y-1.5">
            <span className="text-sm font-medium text-ink-soft">{text.label}</span>

            {field.type === 'select' && (
              <select
                className={inputClass}
                value={String(values[field.key])}
                disabled={disabled}
                onChange={(event) => set(field.key, event.target.value)}
              >
                {field.choices.map((choice) => (
                  <option key={choice} value={choice}>
                    {choiceLabel(text, choice)}
                  </option>
                ))}
              </select>
            )}

            {(field.type === 'text' || field.type === 'password') && (
              <input
                type={field.type}
                className={inputClass}
                value={String(values[field.key])}
                placeholder={field.placeholder}
                disabled={disabled}
                autoComplete={field.type === 'password' ? 'off' : undefined}
                onChange={(event) => set(field.key, event.target.value)}
              />
            )}

            {field.type === 'number' && (
              <input
                type="number"
                className={inputClass}
                value={Number(values[field.key])}
                min={field.min}
                max={field.max}
                step={field.step}
                disabled={disabled}
                onChange={(event) => set(field.key, Number(event.target.value))}
              />
            )}

            {field.type === 'toggle' && (
              <span className="flex h-[38px] items-center gap-2.5">
                <input
                  type="checkbox"
                  className="size-4 accent-accent"
                  checked={Boolean(values[field.key])}
                  disabled={disabled}
                  onChange={(event) => set(field.key, event.target.checked)}
                />
                <span className="text-sm text-muted">
                  {values[field.key] ? t.options.on : t.options.off}
                </span>
              </span>
            )}

            {text.help && <span className="block text-xs text-muted">{text.help}</span>}
          </label>
        )
      })}
    </div>
  )
}
