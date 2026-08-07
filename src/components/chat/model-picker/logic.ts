import { MODEL_PROVIDERS } from "@t3chat/model-catalog"
import type {
  ModelCapability,
  ModelCatalogEntry,
  ModelProviderId,
} from "@t3chat/model-catalog"
import { CHAT_MODEL_CATALOG } from "@/lib/chat-models"

export type ModelQuery = {
  readonly search: string
  readonly capabilities: ReadonlyArray<ModelCapability>
  readonly providerId: ModelProviderId | null
  readonly favoritesOnly: boolean
  readonly combineResults: boolean
}

const providerNames = new Map(
  MODEL_PROVIDERS.map((provider) => [provider.id, provider.name])
)

function normalize(value: string): string {
  return value.toLowerCase().replace(/[\s._-]+/g, "")
}

const searchableTextById = new Map(
  CHAT_MODEL_CATALOG.map((model) => [
    model.id,
    normalize(
      `${model.name} ${model.modelId} ${
        providerNames.get(model.providerId) ?? model.providerId
      } ${model.description ?? ""}`
    ),
  ])
)

const capabilitiesByModelId = new Map(
  CHAT_MODEL_CATALOG.map((model) => [model.id, new Set(model.capabilities)])
)

const modelsByRecency = [...CHAT_MODEL_CATALOG].sort(
  (a, b) =>
    (b.lastUpdated ?? "").localeCompare(a.lastUpdated ?? "") ||
    a.name.localeCompare(b.name)
)

export function ignoresRailScope(query: ModelQuery): boolean {
  return query.combineResults
}

/**
 * Filters the pre-indexed catalog in a single pass. The catalog's base order is
 * computed once, so each query only partitions matches into favorite and
 * non-favorite groups instead of rebuilding search text and sorting again.
 */
export function filterModels(
  query: ModelQuery,
  favoriteIds: ReadonlySet<string>
): ReadonlyArray<ModelCatalogEntry> {
  const needle = normalize(query.search)
  const unscoped = ignoresRailScope(query)
  const providerId = unscoped ? null : query.providerId
  const favoritesOnly = unscoped ? false : query.favoritesOnly
  const favorites: ModelCatalogEntry[] = []
  const others: ModelCatalogEntry[] = []

  for (const model of modelsByRecency) {
    const favorite = favoriteIds.has(model.id)
    if (favoritesOnly && !favorite) continue
    if (providerId && model.providerId !== providerId) continue
    const modelCapabilities = capabilitiesByModelId.get(model.id)
    if (
      query.capabilities.some(
        (capability) => !modelCapabilities?.has(capability)
      )
    ) {
      continue
    }
    const searchableText = searchableTextById.get(model.id) ?? ""
    if (needle && !searchableText.includes(needle)) continue
    if (favorite) favorites.push(model)
    else others.push(model)
  }

  return favorites.concat(others)
}

export function formatCost(costPerMillion: number): string {
  return costPerMillion < 1
    ? costPerMillion.toFixed(2).replace(/0$/, "")
    : String(costPerMillion)
}

export function formatTokenLimit(tokens: number | null): string | null {
  if (tokens === null || tokens <= 0) return null
  if (tokens >= 1_000_000) {
    const millions = tokens / 1_000_000
    return `${millions % 1 === 0 ? millions : millions.toFixed(1)}M`
  }
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}K`
  return String(tokens)
}
