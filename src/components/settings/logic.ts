import { MODEL_PROVIDERS } from "@t3chat/model-catalog"
import type {
  ModelCapability,
  ModelCatalogEntry,
} from "@t3chat/model-catalog"

import {
  PLAN_RANK,
  SETTINGS_PATH,
  SETTINGS_TABS,
  SETTINGS_PLACEHOLDER_SECTION_IDS,
  COPY_FROM_SCRATCH_ID,
  CUSTOMIZATION_CREATE_PROFILE,
} from "@/components/settings/constants"
import type {
  ModelsAccessFilter,
  PlanAction,
  PlanId,
  SettingsPlaceholderSectionId,
  SettingsTabId,
} from "@/components/settings/constants"

export function isSettingsPlaceholderSection(
  value: string
): value is SettingsPlaceholderSectionId {
  return SETTINGS_PLACEHOLDER_SECTION_IDS.some((id) => id === value)
}

export function getSettingsTabLabel(section: SettingsPlaceholderSectionId) {
  const tab = SETTINGS_TABS.find((item) => item.id === section)
  return tab?.label ?? "Settings"
}

export function isSettingsTabId(value: string): value is SettingsTabId {
  return SETTINGS_TABS.some((tab) => tab.id === value)
}

export function getActiveSettingsTabId(pathname: string): SettingsTabId {
  const prefix = `${SETTINGS_PATH}/`
  if (!pathname.startsWith(prefix)) return "account"
  const section = pathname.slice(prefix.length)
  return isSettingsTabId(section) ? section : "account"
}

export function traitCharacterCount(
  traits: ReadonlyArray<string>,
  draft: string
) {
  const joined = traits.join(", ")
  if (joined.length === 0) return draft.length
  if (draft.length === 0) return joined.length
  return joined.length + 2 + draft.length
}

export function canAddTrait(
  traits: ReadonlyArray<string>,
  trait: string,
  maxCharacters: number
) {
  const next = trait.trim()
  if (next.length === 0) return false
  if (traits.some((item) => item.toLowerCase() === next.toLowerCase())) {
    return false
  }
  return traitCharacterCount(traits, next) <= maxCharacters
}

export function getCopyFromOptions(
  profiles: ReadonlyArray<{ id: string; name: string }>
) {
  return [
    {
      id: COPY_FROM_SCRATCH_ID,
      label: CUSTOMIZATION_CREATE_PROFILE.copyFromScratch,
    },
    ...profiles.map((profile) => ({
      id: profile.id,
      label: profile.name,
    })),
  ]
}

export function getPlanAction(
  planId: PlanId,
  currentPlanId: PlanId
): PlanAction {
  if (planId === currentPlanId) return "current"
  return PLAN_RANK[planId] < PLAN_RANK[currentPlanId] ? "downgrade" : "upgrade"
}

export function getHistoryPage<T>(
  items: ReadonlyArray<T>,
  page: number,
  pageSize: number
) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(Math.max(0, page), pageCount - 1)
  const start = safePage * pageSize
  return {
    page: safePage,
    pageCount,
    items: items.slice(start, start + pageSize),
    canPrev: safePage > 0,
    canNext: safePage < pageCount - 1,
  }
}

export function toggleIdInList(ids: ReadonlyArray<string>, id: string) {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]
}

export function pageSelection(
  pageIds: ReadonlyArray<string>,
  selectedIds: ReadonlyArray<string>
): "none" | "some" | "all" {
  if (pageIds.length === 0) return "none"
  const selected = new Set(selectedIds)
  let count = 0
  for (const id of pageIds) {
    if (selected.has(id)) count += 1
  }
  if (count === 0) return "none"
  if (count === pageIds.length) return "all"
  return "some"
}

export function setPageSelected(
  pageIds: ReadonlyArray<string>,
  selectedIds: ReadonlyArray<string>,
  selected: boolean
) {
  const pageSet = new Set(pageIds)
  const kept = selectedIds.filter((id) => !pageSet.has(id))
  return selected ? [...kept, ...pageIds] : kept
}

export function removeIds<T extends { id: string }>(
  items: ReadonlyArray<T>,
  ids: ReadonlyArray<string>
) {
  const remove = new Set(ids)
  return items.filter((item) => !remove.has(item.id))
}

export function historyActionLabel(action: string, count: number) {
  return `${action} (${count})`
}

const providerNames = new Map(
  MODEL_PROVIDERS.map((provider) => [provider.id, provider.name])
)

function normalizeModelText(value: string) {
  return value.toLowerCase().replace(/[\s._-]+/g, "")
}

export function filterSettingsModels(
  models: ReadonlyArray<ModelCatalogEntry>,
  query: {
    search: string
    capabilities: ReadonlyArray<ModelCapability>
    access: ModelsAccessFilter
  }
) {
  const needle = normalizeModelText(query.search)
  return models.filter((model) => {
    if (query.access === "free" && model.inputCostPerMillion !== 0) {
      return false
    }
    if (
      query.access === "premium" &&
      (model.inputCostPerMillion === null || model.inputCostPerMillion <= 0)
    ) {
      return false
    }
    if (
      query.capabilities.some(
        (capability) => !model.capabilities.includes(capability)
      )
    ) {
      return false
    }
    if (!needle) return true
    const haystack = normalizeModelText(
      `${model.name} ${model.modelId} ${
        providerNames.get(model.providerId) ?? model.providerId
      } ${model.description ?? ""}`
    )
    return haystack.includes(needle)
  })
}

export function getNewestCatalogModels(
  models: ReadonlyArray<ModelCatalogEntry>,
  limit: number
) {
  return [...models]
    .filter((model) => model.lastUpdated)
    .sort(
      (a, b) =>
        (b.lastUpdated ?? "").localeCompare(a.lastUpdated ?? "") ||
        a.name.localeCompare(b.name)
    )
    .slice(0, limit)
}

export function formatNewModelsBanner(
  models: ReadonlyArray<{ name: string }>
) {
  if (models.length === 0) return null
  return `${models.length} new — ${models.map((model) => model.name).join(", ")}`
}

export function modelVersionSubtitle(model: ModelCatalogEntry) {
  const normalizedName = normalizeModelText(model.name)
  const normalizedId = normalizeModelText(model.modelId)
  if (normalizedName.includes(normalizedId)) return null
  return model.modelId
}
