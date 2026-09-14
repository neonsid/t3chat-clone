import {
  PASTED_TEXT_FILENAME_PREFIX,
  PASTED_TEXT_WORD_LIMIT,
  TXT_MIME_TYPE,
} from "@/lib/attachment-limits"

const PASTED_TEXT_NAME =
  new RegExp(`^${PASTED_TEXT_FILENAME_PREFIX} (\\d+)(?:\\.txt)?$`, "i")

export function countPastedWords(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

export function shouldAttachPastedText(text: string) {
  return countPastedWords(text) > PASTED_TEXT_WORD_LIMIT
}

export function nextPastedTextFilename(existingFilenames: ReadonlyArray<string>) {
  let highest = 0
  for (const filename of existingFilenames) {
    const match = PASTED_TEXT_NAME.exec(filename.trim())
    if (!match) continue
    const value = Number(match[1])
    if (Number.isFinite(value)) highest = Math.max(highest, value)
  }
  return `${PASTED_TEXT_FILENAME_PREFIX} ${highest + 1}`
}

export function createPastedTextFile(
  text: string,
  existingFilenames: ReadonlyArray<string>
) {
  return new File([text], nextPastedTextFilename(existingFilenames), {
    type: TXT_MIME_TYPE,
  })
}
