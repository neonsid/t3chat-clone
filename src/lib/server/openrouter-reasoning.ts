type ReasoningDetail = {
  type?: string
  text?: string | null
  summary?: string | null
}

type OpenRouterStreamDelta = {
  reasoning?: string | null
  reasoningDetails?: ReasoningDetail[]
}

type OpenRouterStreamChoice = {
  delta?: OpenRouterStreamDelta | null
}

export type OpenRouterStreamChunk = {
  choices?: OpenRouterStreamChoice[]
}

function reasoningDetailsText(details: ReasoningDetail[]) {
  let text = ""
  for (const detail of details) {
    if (detail.type === "reasoning.text" && detail.text) {
      text += detail.text
    } else if (detail.type === "reasoning.summary" && detail.summary) {
      text += detail.summary
    }
  }
  return text
}

/**
 * TanStack's OpenRouter adapter only reads `delta.reasoningDetails`. Many
 * OpenRouter models put the real chain-of-thought in `delta.reasoning` (and
 * sometimes only a short summary in `reasoningDetails`). Fold the flat
 * `reasoning` string into `reasoningDetails` so traces survive extraction.
 */
export function enrichOpenRouterReasoningChunk<T extends OpenRouterStreamChunk>(
  chunk: T
): T {
  if (!chunk.choices?.length) return chunk

  let changed = false
  const choices = chunk.choices.map((choice) => {
    const delta = choice.delta
    if (!delta) return choice

    const flat = delta.reasoning ? delta.reasoning : ""
    if (!flat) return choice

    const details = Array.isArray(delta.reasoningDetails)
      ? delta.reasoningDetails
      : []
    const detailsText = reasoningDetailsText(details)

    // Prefer the longer payload for this chunk. Summaries in reasoningDetails
    // are often much shorter than delta.reasoning.
    if (detailsText && detailsText.length >= flat.length) return choice

    changed = true
    return {
      ...choice,
      delta: {
        ...delta,
        reasoningDetails: [{ type: "reasoning.text", text: flat }],
      },
    }
  })

  return changed ? { ...chunk, choices } : chunk
}

export async function* enrichOpenRouterReasoningStream<
  T extends OpenRouterStreamChunk,
>(stream: AsyncIterable<T>): AsyncIterable<T> {
  for await (const chunk of stream) {
    yield enrichOpenRouterReasoningChunk(chunk)
  }
}
