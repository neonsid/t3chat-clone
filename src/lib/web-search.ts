import { isChatModelId, CHAT_MODEL_CONFIG } from "@/lib/chat-models"
import {
  isJsonNumber,
  isJsonObject,
  isJsonString,
  type JsonValue,
} from "@/lib/json-value"

export type WebSearchSource = {
  title: string
  url: string
}

export type WebSearchTurn = {
  sources: WebSearchSource[]
  queries: string[]
}

export const WEB_SEARCH_LIMIT = {
  min: 1,
  max: 5,
} as const

export const MAX_WEB_SEARCH_SOURCES = 20
export const MAX_WEB_SEARCH_QUERIES = 20
export const WEB_SEARCH_SOURCES_EVENT = "web-search.sources"

const EMPTY_WEB_SEARCH_TURN: WebSearchTurn = {
  sources: [],
  queries: [],
}

export function modelSupportsWebSearch(modelId: string): boolean {
  return (
    isChatModelId(modelId) &&
    CHAT_MODEL_CONFIG[modelId].runtime.kind === "openai"
  )
}

export function clampSearchLimit(value: number): number {
  if (!Number.isInteger(value)) return WEB_SEARCH_LIMIT.min
  if (value < WEB_SEARCH_LIMIT.min) return WEB_SEARCH_LIMIT.min
  if (value > WEB_SEARCH_LIMIT.max) return WEB_SEARCH_LIMIT.max
  return value
}

export function nextSearchLimit(current: number): number {
  const clamped = clampSearchLimit(current)
  if (clamped >= WEB_SEARCH_LIMIT.max) return WEB_SEARCH_LIMIT.min
  return clamped + 1
}

export function stepSearchLimit(current: number, delta: number): number {
  if (!Number.isInteger(delta)) return clampSearchLimit(current)
  return clampSearchLimit(clampSearchLimit(current) + delta)
}

export function parseSearchEnabled(value: JsonValue | undefined): boolean {
  return value === true
}

export function parseSearchLimit(value: JsonValue | undefined): number {
  if (!isJsonNumber(value)) return WEB_SEARCH_LIMIT.min
  return clampSearchLimit(value)
}

export function resolveWebSearchRequest(input: {
  runtimeKind: string
  searchEnabled: JsonValue | undefined
  searchLimit: JsonValue | undefined
}) {
  return {
    enabled:
      input.runtimeKind === "openai" && parseSearchEnabled(input.searchEnabled),
    limit: parseSearchLimit(input.searchLimit),
  }
}

export function hostnameFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null
    return parsed.hostname || null
  } catch {
    return null
  }
}

export function displayUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.hostname}${parsed.pathname === "/" ? "" : parsed.pathname}`
  } catch {
    return url
  }
}

function titleFromUrl(url: string): string {
  return hostnameFromUrl(url) ?? url
}

export function normalizeWebSearchSource(
  url: string,
  title?: string
): WebSearchSource | null {
  const trimmedUrl = url.trim()
  if (!hostnameFromUrl(trimmedUrl)) return null
  const trimmedTitle = title?.trim() ?? ""
  return {
    url: trimmedUrl,
    title: trimmedTitle || titleFromUrl(trimmedUrl),
  }
}

export function mergeWebSearchSources(
  sources: ReadonlyArray<WebSearchSource>
): WebSearchSource[] {
  const seen = new Set<string>()
  const merged: WebSearchSource[] = []
  for (const source of sources) {
    if (seen.has(source.url)) continue
    seen.add(source.url)
    merged.push(source)
    if (merged.length >= MAX_WEB_SEARCH_SOURCES) break
  }
  return merged
}

export function mergeWebSearchQueries(
  queries: ReadonlyArray<string>
): string[] {
  const seen = new Set<string>()
  const merged: string[] = []
  for (const query of queries) {
    const trimmed = query.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    merged.push(trimmed)
    if (merged.length >= MAX_WEB_SEARCH_QUERIES) break
  }
  return merged
}

function sourcesFromJsonList(value: JsonValue | undefined): WebSearchSource[] {
  if (!Array.isArray(value)) return []
  const sources: WebSearchSource[] = []
  for (const entry of value) {
    if (!isJsonObject(entry) || !isJsonString(entry.url)) continue
    const source = normalizeWebSearchSource(
      entry.url,
      isJsonString(entry.title) ? entry.title : undefined
    )
    if (source) sources.push(source)
  }
  return sources
}

function queriesFromJsonList(value: JsonValue | undefined): string[] {
  if (!Array.isArray(value)) return []
  return mergeWebSearchQueries(value.filter((query) => isJsonString(query)))
}

function sourcesFromOutputItem(item: JsonValue | undefined): WebSearchSource[] {
  if (!isJsonObject(item)) return []
  if (item.type === "web_search_call") {
    const action = item.action
    if (!isJsonObject(action)) return []
    return sourcesFromJsonList(action.sources)
  }
  if (item.type !== "message") return []
  const content = item.content
  if (!Array.isArray(content)) return []
  const sources: WebSearchSource[] = []
  for (const part of content) {
    sources.push(...sourcesFromContentPart(part))
  }
  return sources
}

function queriesFromAction(action: JsonValue | undefined): string[] {
  if (!isJsonObject(action)) return []
  const queries: string[] = []
  if (isJsonString(action.query)) queries.push(action.query)
  if (!Array.isArray(action.queries)) return queries
  for (const query of action.queries) {
    if (isJsonString(query)) queries.push(query)
  }
  return queries
}

function queriesFromOutputItem(item: JsonValue | undefined): string[] {
  if (!isJsonObject(item) || item.type !== "web_search_call") return []
  return queriesFromAction(item.action)
}

function sourcesFromContentPart(
  part: JsonValue | undefined
): WebSearchSource[] {
  if (!isJsonObject(part)) return []
  if (part.type !== "output_text") return []
  const annotations = part.annotations
  if (!Array.isArray(annotations)) return []
  const sources: WebSearchSource[] = []
  for (const annotation of annotations) {
    if (!isJsonObject(annotation) || annotation.type !== "url_citation")
      continue
    if (!isJsonString(annotation.url)) continue
    const source = normalizeWebSearchSource(
      annotation.url,
      isJsonString(annotation.title) ? annotation.title : undefined
    )
    if (source) sources.push(source)
  }
  return sources
}

function completedResponseItems(event: JsonValue): JsonValue[] {
  if (!isJsonObject(event) || event.type !== "response.completed") return []
  const response = event.response
  if (!isJsonObject(response) || !Array.isArray(response.output)) return []
  return response.output
}

export function sourcesFromOpenAIEvent(event: JsonValue): WebSearchSource[] {
  if (!isJsonObject(event)) return []
  if (
    event.type === "response.output_item.added" ||
    event.type === "response.output_item.done"
  ) {
    return sourcesFromOutputItem(event.item)
  }
  if (event.type === "response.content_part.done") {
    return sourcesFromContentPart(event.part)
  }
  const sources: WebSearchSource[] = []
  for (const item of completedResponseItems(event)) {
    sources.push(...sourcesFromOutputItem(item))
  }
  return sources
}

export function queriesFromOpenAIEvent(event: JsonValue): string[] {
  if (!isJsonObject(event)) return []
  if (
    event.type === "response.output_item.added" ||
    event.type === "response.output_item.done" ||
    event.type === "response.web_search_call.in_progress" ||
    event.type === "response.web_search_call.searching" ||
    event.type === "response.web_search_call.completed"
  ) {
    return queriesFromOutputItem(event.item)
  }
  const queries: string[] = []
  for (const item of completedResponseItems(event)) {
    queries.push(...queriesFromOutputItem(item))
  }
  return queries
}

export function parseWebSearchTurn(
  value: JsonValue | undefined
): WebSearchTurn {
  if (Array.isArray(value)) {
    return {
      sources: mergeWebSearchSources(sourcesFromJsonList(value)),
      queries: [],
    }
  }
  if (!isJsonObject(value)) return EMPTY_WEB_SEARCH_TURN
  return {
    sources: mergeWebSearchSources(sourcesFromJsonList(value.sources)),
    queries: queriesFromJsonList(value.queries),
  }
}

export function parseWebSearchSources(value: JsonValue | undefined) {
  return parseWebSearchTurn(value).sources
}

export function parseWebSearchQueries(value: JsonValue | undefined) {
  if (Array.isArray(value)) return queriesFromJsonList(value)
  return parseWebSearchTurn(value).queries
}

export function webSearchSourcesForPersist(
  persisted: Record<string, WebSearchSource[]>,
  lastAssistantMessageId: string | undefined,
  turnSources: WebSearchSource[]
) {
  if (!lastAssistantMessageId || turnSources.length === 0) return persisted
  return { ...persisted, [lastAssistantMessageId]: turnSources }
}

export function webSearchQueriesForPersist(
  persisted: Record<string, string[]>,
  lastAssistantMessageId: string | undefined,
  turnQueries: string[]
) {
  if (!lastAssistantMessageId || turnQueries.length === 0) return persisted
  return { ...persisted, [lastAssistantMessageId]: turnQueries }
}
