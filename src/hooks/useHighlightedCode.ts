import { useEffect, useState } from "react"

import {
  fallbackHighlightedCode,
  highlightCode,
  type HighlightedCode,
} from "@/lib/highlight-code"

/**
 * Shiki loads grammars off the main thread and cannot finish during render.
 * useMountEffect cannot reschedule when a fence grows mid-stream, so this
 * effect follows `code` / `language` and cancels the in-flight highlight.
 */
export function useHighlightedCode(
  code: string,
  language: string
): HighlightedCode {
  const requestKey = `${language}\0${code}`
  const [highlighted, setHighlighted] = useState<{
    key: string
    result: HighlightedCode
  } | null>(null)

  useEffect(() => {
    let cancelled = false

    void highlightCode(code, language)
      .then((result) => {
        if (!cancelled) setHighlighted({ key: requestKey, result })
      })
      .catch(() => {
        // Leave the uncolored fence on screen.
      })

    return () => {
      cancelled = true
    }
  }, [code, language, requestKey])

  if (highlighted?.key === requestKey) return highlighted.result
  return fallbackHighlightedCode(code)
}
