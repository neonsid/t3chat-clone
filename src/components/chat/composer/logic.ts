import {
  COMPOSER_STREAM_ERROR,
  SEARCH_TOGGLE,
} from "@/components/chat/composer/constants"

const MAX_COMPOSER_ERROR_LENGTH = 180

export function webSearchTooltip(supported: boolean, enabled: boolean): string {
  if (!supported) return SEARCH_TOGGLE.unsupportedTooltip
  return enabled ? SEARCH_TOGGLE.disableTooltip : SEARCH_TOGGLE.enableTooltip
}

export function composerStreamErrorMessage(error: Error) {
  const message = error.message.trim()
  if (!message) return COMPOSER_STREAM_ERROR.saveFailed
  if (
    message.includes("ArgumentValidation") ||
    message.includes("Validator:") ||
    /extra field/i.test(message)
  ) {
    return COMPOSER_STREAM_ERROR.saveFailed
  }
  if (message.length > MAX_COMPOSER_ERROR_LENGTH) {
    return COMPOSER_STREAM_ERROR.saveFailed
  }
  return message
}
