import {
  sanitizeGeneratedTitle,
  THREAD_TITLE_MAX_OUTPUT_TOKENS,
  THREAD_TITLE_MODEL_ID,
  THREAD_TITLE_SYSTEM_PROMPT,
  titleFromFirstMessage,
} from "../../src/lib/thread-title"

export async function generateThreadTitle(firstMessage: string): Promise<{
  title: string
  source: "generated" | "derived"
}> {
  const fallback = titleFromFirstMessage(firstMessage)
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return { title: fallback, source: "derived" }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: THREAD_TITLE_MODEL_ID,
        messages: [
          { role: "system", content: THREAD_TITLE_SYSTEM_PROMPT },
          { role: "user", content: firstMessage },
        ],
        max_completion_tokens: THREAD_TITLE_MAX_OUTPUT_TOKENS,
        reasoning_effort: "none",
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI title request failed (${response.status})`)
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>
    }
    const generated = payload.choices?.[0]?.message?.content?.trim()

    return {
      title: sanitizeGeneratedTitle(generated ?? "") || fallback,
      source: "generated",
    }
  } catch {
    return { title: fallback, source: "derived" }
  }
}
