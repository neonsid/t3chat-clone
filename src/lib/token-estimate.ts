/** Providers stream roughly a token per four characters of text. */
export const CHARS_PER_TOKEN = 4

export function estimateTextTokens(text: string) {
  if (text.length === 0) return 0
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}
