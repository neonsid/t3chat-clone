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

export function getActiveSettingsTabId(pathname: string): SettingsTabId {
  const prefix = `${SETTINGS_PATH}/`
  if (!pathname.startsWith(prefix)) return "account"
  const section = pathname.slice(prefix.length)
  return isSettingsPlaceholderSection(section) ? section : "account"
}

export function getPlanAction(
  planId: PlanId,
  currentPlanId: PlanId
): PlanAction {
  if (planId === currentPlanId) return "current"
  return PLAN_RANK[planId] < PLAN_RANK[currentPlanId] ? "downgrade" : "upgrade"
}
