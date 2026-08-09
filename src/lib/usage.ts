const SUPPORT_PROMPT_AFTER_RUNS = 3
const USAGE_COUNT_KEY = 'supportPrompt.usageCount'
const SUPPORT_PROMPT_DISMISSED_AT_KEY = 'supportPrompt.dismissedAt'
const LEGACY_DISMISSED_KEY = 'supportPrompt.dismissed'

function getStorage(): Storage | null {
  try {
    return globalThis.localStorage
  } catch {
    // El modo privado puede exponer localStorage y aun así impedir su uso.
    return null
  }
}

function read(key: string): string | null {
  try {
    return getStorage()?.getItem(key) ?? null
  } catch {
    return null
  }
}

function write(key: string, value: string): void {
  try {
    getStorage()?.setItem(key, value)
  } catch {
    // El aviso es opcional y no debe impedir usar la herramienta.
  }
}

function remove(key: string): void {
  try {
    getStorage()?.removeItem(key)
  } catch {
    // La migración no debe bloquear el procesamiento del documento.
  }
}

function getUsageCount() {
  const value = Number.parseInt(read(USAGE_COUNT_KEY) ?? '0', 10)
  return Number.isNaN(value) || value < 0 ? 0 : value
}

function getDismissedAt() {
  const stored = read(SUPPORT_PROMPT_DISMISSED_AT_KEY)
  if (stored !== null) {
    const value = Number.parseInt(stored, 10)
    return Number.isNaN(value) || value < 0 ? null : value
  }

  // La clave anterior significaba «no volver a mostrar»; se convierte en un aplazamiento.
  if (read(LEGACY_DISMISSED_KEY) === 'true') {
    const usageCount = getUsageCount()
    write(SUPPORT_PROMPT_DISMISSED_AT_KEY, String(usageCount))
    remove(LEGACY_DISMISSED_KEY)
    return usageCount
  }

  return null
}

export function shouldShowSupportPrompt() {
  const usageCount = getUsageCount()
  const dismissedAt = getDismissedAt()

  return (
    usageCount >= SUPPORT_PROMPT_AFTER_RUNS &&
    (dismissedAt === null || usageCount - dismissedAt >= SUPPORT_PROMPT_AFTER_RUNS)
  )
}

export function registerSuccessfulRun() {
  write(USAGE_COUNT_KEY, String(getUsageCount() + 1))
  return shouldShowSupportPrompt()
}

export function dismissSupportPrompt() {
  write(SUPPORT_PROMPT_DISMISSED_AT_KEY, String(getUsageCount()))
}
