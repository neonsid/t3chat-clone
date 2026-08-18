import {
  PLAN_RANK,
  SETTINGS_PATH,
  SETTINGS_TABS,
  SETTINGS_PLACEHOLDER_SECTION_IDS,
} from "@/components/settings/constants"
import type {
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

export function getPlanAction(
  planId: PlanId,
  currentPlanId: PlanId
): PlanAction {
  if (planId === currentPlanId) return "current"
  return PLAN_RANK[planId] < PLAN_RANK[currentPlanId] ? "downgrade" : "upgrade"
}
