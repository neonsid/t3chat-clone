import { DEFAULT_THREAD_TITLE, MAX_THREAD_TITLE_LENGTH } from "../../convex/constants"

/** OpenAI model used for one-shot sidebar thread titles. */
export const THREAD_TITLE_MODEL_ID = "gpt-5.6-luna"
export const THREAD_TITLE_SYSTEM_PROMPT =
  "Generate a concise chat title for the user's first message. Return only the title: 3-7 words, no quotes, no trailing punctuation."
export const THREAD_TITLE_MAX_OUTPUT_TOKENS = 32

export function titleFromFirstMessage(content: string): string {
  const title = content.trim().replace(/\s+/g, " ")
  if (!title) return DEFAULT_THREAD_TITLE

  return title.length > MAX_THREAD_TITLE_LENGTH
    ? `${title.slice(0, MAX_THREAD_TITLE_LENGTH).trimEnd()}…`
    : title
}

export function sanitizeGeneratedTitle(raw: string): string {
  const title = raw
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/g, "")

  if (!title) return DEFAULT_THREAD_TITLE

  return title.length > MAX_THREAD_TITLE_LENGTH
    ? `${title.slice(0, MAX_THREAD_TITLE_LENGTH).trimEnd()}…`
    : title
}
