const SUPPORT_PROMPT_AFTER_RUNS = 3
const USAGE_COUNT_KEY = 'supportPrompt.usageCount'
const SUPPORT_PROMPT_DISMISSED_AT_KEY = 'supportPrompt.dismissedAt'
const LEGACY_DISMISSED_KEY = 'supportPrompt.dismissed'

function getUsageCount() {
  const value = Number.parseInt(localStorage.getItem(USAGE_COUNT_KEY) ?? '0', 10)
  return Number.isNaN(value) || value < 0 ? 0 : value
}

function getDismissedAt() {
  const stored = localStorage.getItem(SUPPORT_PROMPT_DISMISSED_AT_KEY)
  if (stored !== null) {
    const value = Number.parseInt(stored, 10)
    return Number.isNaN(value) || value < 0 ? null : value
  }

  // La clave anterior significaba «no volver a mostrar»; se convierte en un aplazamiento.
  if (localStorage.getItem(LEGACY_DISMISSED_KEY) === 'true') {
    const usageCount = getUsageCount()
    localStorage.setItem(SUPPORT_PROMPT_DISMISSED_AT_KEY, String(usageCount))
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
  localStorage.setItem(USAGE_COUNT_KEY, String(getUsageCount() + 1))
  return shouldShowSupportPrompt()
}

export function dismissSupportPrompt() {
  localStorage.setItem(SUPPORT_PROMPT_DISMISSED_AT_KEY, String(getUsageCount()))
}
