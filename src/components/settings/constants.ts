import type { LucideIcon } from "lucide-react"
import {
  CheckIcon,
  ClockIcon,
  ImageIcon,
  SearchIcon,
  SparklesIcon,
  WrenchIcon,
  ZapIcon,
} from "lucide-react"

export const SETTINGS_PATH = "/settings" as const

export const SETTINGS_HIDE_SCROLLBAR_CLASS =
  "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"

export const SETTINGS_TABS = [
  { id: "account", label: "Account" },
  { id: "customization", label: "Customization" },
  { id: "history", label: "History & Sync" },
  { id: "models", label: "Models" },
  { id: "api-keys", label: "API Keys" },
  { id: "attachments", label: "Attachments" },
  { id: "shortcuts", label: "Shortcuts" },
  { id: "contact", label: "Contact Us" },
] as const

export type SettingsTab = (typeof SETTINGS_TABS)[number]
export type SettingsTabId = SettingsTab["id"]

export const SETTINGS_PLACEHOLDER_SECTION_IDS = [
  "customization",
  "history",
  "models",
  "api-keys",
  "attachments",
  "shortcuts",
  "contact",
] as const

export type SettingsPlaceholderSectionId =
  (typeof SETTINGS_PLACEHOLDER_SECTION_IDS)[number]

export const SETTINGS_SHORTCUTS = [
  { id: "search", label: "Search", keys: ["mod", "K"] },
  { id: "new-chat", label: "New Chat", keys: ["mod", "Shift", "O"] },
  { id: "toggle-sidebar", label: "Toggle Sidebar", keys: ["mod", "B"] },
  { id: "open-model-picker", label: "Open Model Picker", keys: ["mod", "/"] },
  {
    id: "delete-chat",
    label: "Delete Current Chat",
    keys: ["mod", "Shift", "⌫"],
  },
] as const

export const ACCOUNT_SECURITY = {
  title: "Security & Access",
  emailTitle: "Account Email",
  emailDescription: "Change the email address associated with your account.",
  emailAction: "Change Email",
  devicesTitle: "Devices",
  devicesDescription:
    "Manage and sign out from other devices that are currently logged in to your account.",
  devicesAction: "View Devices",
} as const

export const ACCOUNT_DANGER_ZONE = {
  title: "Danger Zone",
  description: "Permanently delete your account and all associated data.",
  action: "Delete Account",
  confirm:
    "Permanently delete your account and all associated data? This cannot be undone.",
} as const

export const SETTINGS_USAGE = {
  currentPlanId: "pro",
  currentPlanLabel: "Pro Plan",
  baseRemainingLabel: "3h 20m",
  basePercent: 83,
  burstPercent: 12,
  renewsOnLabel: "Aug 22, 2026",
  info: "Base usage refills on a rolling window. Burst overage is extra capacity after the base limit is used.",
} as const

export type PlanId = "free" | "pro" | "premier"

export const PLAN_RANK = {
  free: 0,
  pro: 1,
  premier: 2,
} as const satisfies Record<PlanId, number>

export const PLAN_ACTION_LABEL = {
  current: "Current Plan",
  downgrade: "Downgrade",
  upgrade: "Upgrade",
} as const

export type PlanAction = keyof typeof PLAN_ACTION_LABEL

export type PlanFeature = {
  label: string
  icon: LucideIcon
}

export type PlanDefinition = {
  id: PlanId
  name: string
  price: string
  description: string
  featured?: boolean
  features: ReadonlyArray<PlanFeature>
}

export const SETTINGS_PLANS: ReadonlyArray<PlanDefinition> = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    description: "Try the product with a smaller model set and daily limits.",
    features: [
      { label: "Access to select models", icon: CheckIcon },
      { label: "Limited daily messages", icon: CheckIcon },
      { label: "Standard response speed", icon: CheckIcon },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$8 / month",
    description: "The full chat workspace for daily use.",
    featured: true,
    features: [
      { label: "Access to all models", icon: SparklesIcon },
      { label: "Higher usage limits", icon: ClockIcon },
      { label: "Image generation", icon: ImageIcon },
      { label: "Custom tools & prompts", icon: WrenchIcon },
      { label: "Web search", icon: SearchIcon },
    ],
  },
  {
    id: "premier",
    name: "Premier",
    price: "$50 / month",
    description: "Everything in Pro, with headroom for heavy use.",
    features: [
      { label: "Everything in Pro", icon: CheckIcon },
      { label: "10× usage limits", icon: ClockIcon },
      { label: "Burst overage included", icon: ZapIcon },
      { label: "Priority access at peak times", icon: SparklesIcon },
    ],
  },
]
