import { describe, expect, it } from "vitest"

import {
  clampSearchLimit,
  hostnameFromUrl,
  mergeWebSearchQueries,
  mergeWebSearchSources,
  modelSupportsWebSearch,
  nextSearchLimit,
  stepSearchLimit,
  normalizeWebSearchSource,
  parseSearchEnabled,
  parseSearchLimit,
  parseWebSearchSources,
  parseWebSearchTurn,
  queriesFromOpenAIEvent,
  resolveWebSearchRequest,
  sourcesFromOpenAIEvent,
  webSearchSourcesForPersist,
} from "@/lib/web-search"

describe("web search gating", () => {
  it("enables OpenAI models and not Google or OpenRouter", () => {
    expect(modelSupportsWebSearch("openai/gpt-5.5")).toBe(true)
    expect(modelSupportsWebSearch("google/gemini-3.1-flash-lite")).toBe(false)
    expect(modelSupportsWebSearch("cohere/north-mini-code-1-0")).toBe(false)
    expect(modelSupportsWebSearch("not-a-model")).toBe(false)
  })

  it("ignores search on a non-OpenAI runtime and clamps junk limits", () => {
    expect(
      resolveWebSearchRequest({
        runtimeKind: "google",
        searchEnabled: true,
        searchLimit: 4,
      })
    ).toEqual({ enabled: false, limit: 4 })

    expect(
      resolveWebSearchRequest({
        runtimeKind: "openai",
        searchEnabled: true,
        searchLimit: "3",
      })
    ).toEqual({ enabled: true, limit: 1 })

    expect(
      resolveWebSearchRequest({
        runtimeKind: "openai",
        searchEnabled: "yes",
        searchLimit: 99,
      })
    ).toEqual({ enabled: false, limit: 5 })
  })

  it("treats missing search as off and missing limit as 1", () => {
    expect(parseSearchEnabled(undefined)).toBe(false)
    expect(parseSearchLimit(undefined)).toBe(1)
    expect(clampSearchLimit(0)).toBe(1)
    expect(nextSearchLimit(5)).toBe(1)
    expect(nextSearchLimit(1)).toBe(2)
    expect(stepSearchLimit(1, -1)).toBe(1)
    expect(stepSearchLimit(5, 1)).toBe(5)
    expect(stepSearchLimit(3, 1)).toBe(4)
    expect(stepSearchLimit(3, -1)).toBe(2)
  })
})

describe("web search sources", () => {
  it("maps url_citation annotations and web_search_call sources", () => {
    expect(
      sourcesFromOpenAIEvent({
        type: "response.content_part.done",
        part: {
          type: "output_text",
          annotations: [
            {
              type: "url_citation",
              url: "https://example.com/a",
              title: "Alpha",
            },
            { type: "url_citation", url: "javascript:alert(1)" },
            { type: "file_citation", url: "https://example.com/ignored" },
          ],
        },
      })
    ).toEqual([{ title: "Alpha", url: "https://example.com/a" }])

    expect(
      mergeWebSearchSources(
        sourcesFromOpenAIEvent({
          type: "response.output_item.done",
          item: {
            type: "web_search_call",
            action: {
              sources: [
                { url: "https://news.example/story", title: "Story" },
                { url: "https://news.example/story", title: "Duplicate" },
              ],
            },
          },
        })
      )
    ).toEqual([{ title: "Story", url: "https://news.example/story" }])
  })

  it("collects sources from a completed response and drops junk urls", () => {
    expect(
      mergeWebSearchSources(
        sourcesFromOpenAIEvent({
          type: "response.completed",
          response: {
            output: [
              {
                type: "web_search_call",
                action: {
                  sources: [{ url: "https://a.example", title: "A" }],
                },
              },
              {
                type: "message",
                content: [
                  {
                    type: "output_text",
                    annotations: [
                      {
                        type: "url_citation",
                        url: "https://b.example/path",
                        title: "B",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        })
      )
    ).toEqual([
      { title: "A", url: "https://a.example" },
      { title: "B", url: "https://b.example/path" },
    ])

    expect(normalizeWebSearchSource("not a url")).toBeNull()
    expect(hostnameFromUrl("https://docs.example/page")).toBe("docs.example")
  })

  it("parses CUSTOM payloads and overwrites persist maps with the current turn", () => {
    const parsed = parseWebSearchSources([
      { title: "Keep", url: "https://keep.example" },
      { title: "Dup", url: "https://keep.example" },
      { url: "ftp://nope.example" },
    ])
    expect(parsed).toEqual([{ title: "Keep", url: "https://keep.example" }])

    expect(
      webSearchSourcesForPersist({ older: parsed }, "assistant-2", [
        { title: "Turn", url: "https://turn.example" },
      ])
    ).toEqual({
      older: parsed,
      "assistant-2": [{ title: "Turn", url: "https://turn.example" }],
    })
    const persisted = { older: parsed }
    expect(webSearchSourcesForPersist(persisted, "assistant-2", [])).toBe(
      persisted
    )
  })
})

describe("web search queries", () => {
  it("reads query and queries from a web_search_call action", () => {
    expect(
      mergeWebSearchQueries(
        queriesFromOpenAIEvent({
          type: "response.output_item.added",
          item: {
            type: "web_search_call",
            action: {
              type: "search",
              query: "agentic AI cybersecurity",
              queries: [
                "research design methodology",
                "agentic AI cybersecurity",
              ],
            },
          },
        })
      )
    ).toEqual(["agentic AI cybersecurity", "research design methodology"])
  })

  it("keeps an array CUSTOM payload as sources-only and parses a turn object", () => {
    expect(
      parseWebSearchTurn([{ title: "Keep", url: "https://keep.example" }])
    ).toEqual({
      sources: [{ title: "Keep", url: "https://keep.example" }],
      queries: [],
    })

    expect(
      parseWebSearchTurn({
        sources: [{ title: "Keep", url: "https://keep.example" }],
        queries: ["agentic AI", "agentic AI", ""],
      })
    ).toEqual({
      sources: [{ title: "Keep", url: "https://keep.example" }],
      queries: ["agentic AI"],
    })

    expect(mergeWebSearchQueries([" one ", "one", "two"])).toEqual([
      "one",
      "two",
    ])
  })
})
