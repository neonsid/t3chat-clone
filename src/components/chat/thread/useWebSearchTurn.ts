import { useCallback, useRef, useState } from "react"
import type { StreamChunk } from "@tanstack/ai"

import type { JsonValue } from "@/lib/json-value"
import {
  parseWebSearchTurn,
  WEB_SEARCH_SOURCES_EVENT,
  type WebSearchSource,
} from "@/lib/web-search"

export function useWebSearchTurn() {
  const [turnWebSearchSources, setTurnWebSearchSources] = useState<
    WebSearchSource[]
  >(() => [])
  const [turnWebSearchQueries, setTurnWebSearchQueries] = useState<string[]>(
    () => []
  )
  const [turnThinkingSearchSplitAt, setTurnThinkingSearchSplitAt] = useState<
    number | undefined
  >(() => undefined)
  const [searchThisTurn, setSearchThisTurn] = useState(false)
  const streamingThinkingLengthRef = useRef(0)

  const resetTurnSearch = useCallback((nextSearchEnabled: boolean) => {
    setSearchThisTurn(nextSearchEnabled)
    setTurnWebSearchSources([])
    setTurnWebSearchQueries([])
    setTurnThinkingSearchSplitAt(undefined)
  }, [])

  const onChunk = useCallback((chunk: StreamChunk) => {
    if (chunk.type !== "CUSTOM" || chunk.name !== WEB_SEARCH_SOURCES_EVENT) {
      return
    }
    // SAFETY: CUSTOM value is JSON we emitted as web-search.sources.
    const value: JsonValue = chunk.value as JsonValue
    const turn = parseWebSearchTurn(value)
    if (turn.sources.length > 0) setTurnWebSearchSources(turn.sources)
    if (turn.queries.length > 0) setTurnWebSearchQueries(turn.queries)
    if (turn.sources.length > 0 || turn.queries.length > 0) {
      setTurnThinkingSearchSplitAt((current) =>
        current === undefined ? streamingThinkingLengthRef.current : current
      )
    }
  }, [])

  return {
    turnWebSearchSources,
    turnWebSearchQueries,
    turnThinkingSearchSplitAt,
    searchThisTurn,
    streamingThinkingLengthRef,
    resetTurnSearch,
    onChunk,
  }
}
