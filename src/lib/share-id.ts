export const SHARE_PUBLIC_ID_LENGTH = 10
export const SHARE_PUBLIC_ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789"

export function createSharePublicId(
  randomBytes: (size: number) => Uint8Array = defaultShareRandomBytes
) {
  const bytes = randomBytes(SHARE_PUBLIC_ID_LENGTH)
  let publicId = ""
  for (let index = 0; index < SHARE_PUBLIC_ID_LENGTH; index += 1) {
    const byte = bytes[index] ?? 0
    publicId += SHARE_PUBLIC_ID_ALPHABET[byte % SHARE_PUBLIC_ID_ALPHABET.length]
  }
  return publicId
}

export function isSharePublicId(value: string) {
  if (value.length !== SHARE_PUBLIC_ID_LENGTH) return false
  return [...value].every((character) =>
    SHARE_PUBLIC_ID_ALPHABET.includes(character)
  )
}

export function sharePath(publicId: string) {
  return `/share/${publicId}`
}

export function shareUrl(origin: string, publicId: string) {
  return `${origin}${sharePath(publicId)}`
}

export function formatShareAge(createdAt: number, now: number) {
  const deltaSeconds = Math.max(0, Math.round((now - createdAt) / 1000))
  if (deltaSeconds < 60) return "less than a minute ago"

  const deltaMinutes = Math.round(deltaSeconds / 60)
  if (deltaMinutes < 60) {
    return deltaMinutes === 1 ? "1 minute ago" : `${deltaMinutes} minutes ago`
  }

  const deltaHours = Math.round(deltaMinutes / 60)
  if (deltaHours < 24) {
    return deltaHours === 1 ? "1 hour ago" : `${deltaHours} hours ago`
  }

  const deltaDays = Math.round(deltaHours / 24)
  if (deltaDays < 30) {
    return deltaDays === 1 ? "1 day ago" : `${deltaDays} days ago`
  }

  const deltaMonths = Math.round(deltaDays / 30)
  if (deltaMonths < 12) {
    return deltaMonths === 1 ? "1 month ago" : `${deltaMonths} months ago`
  }

  const deltaYears = Math.round(deltaDays / 365)
  return deltaYears === 1 ? "1 year ago" : `${deltaYears} years ago`
}

function defaultShareRandomBytes(size: number) {
  const bytes = new Uint8Array(size)
  crypto.getRandomValues(bytes)
  return bytes
}
