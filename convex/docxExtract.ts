/**
 * Word extract normalize + token estimate.
 * Keep in sync with the copy used by unit tests in `src/lib/docx-extract.ts`.
 */

const CHARS_PER_TOKEN = 4
export const MAX_DOCX_EXTRACTED_CHARS = 200_000

const TRUNCATION_NOTE =
  "Extract truncated to the first 200000 characters.\n\n"

function estimateTextTokens(text: string) {
  if (text.length === 0) return 0
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

function prefixDocxExtract(filename: string, text: string) {
  const name = filename.trim() || "document.docx"
  return `${name}\n\n${text}`
}

export function prepareExtractedDocxText(
  rawText: string,
  filename: string
):
  | {
      ok: true
      extractedText: string
      extractedTokenEstimate: number
      truncated: boolean
    }
  | { ok: false; error: string } {
  const trimmed = rawText.replace(/^\uFEFF/, "").trim()
  if (!trimmed) {
    return { ok: false, error: "Couldn't read any text from this Word file" }
  }

  const truncated = trimmed.length > MAX_DOCX_EXTRACTED_CHARS
  const body = truncated
    ? `${TRUNCATION_NOTE}${trimmed.slice(0, MAX_DOCX_EXTRACTED_CHARS)}`
    : trimmed
  const extractedText = prefixDocxExtract(filename, body)

  return {
    ok: true,
    extractedText,
    extractedTokenEstimate: estimateTextTokens(extractedText),
    truncated,
  }
}
