export const SETTINGS_PATH = "/settings" as const
export const CUSTOMIZATION_PATH = "/settings/customization" as const
export const HISTORY_PATH = "/settings/history" as const
export const MODELS_PATH = "/settings/models" as const
export const SETTINGS_SECTION_PATH = "/settings/$section" as const

export const SETTINGS_TABS = [
  { id: "account", label: "Account", to: SETTINGS_PATH },
  { id: "customization", label: "Customization", to: CUSTOMIZATION_PATH },
  { id: "history", label: "History & Sync", to: HISTORY_PATH },
  { id: "models", label: "Models", to: MODELS_PATH },
  { id: "api-keys", label: "API Keys", to: SETTINGS_SECTION_PATH },
  { id: "attachments", label: "Attachments", to: SETTINGS_SECTION_PATH },
  { id: "shortcuts", label: "Shortcuts", to: SETTINGS_SECTION_PATH },
  { id: "contact", label: "Contact Us", to: SETTINGS_SECTION_PATH },
] as const

export type SettingsTab = (typeof SETTINGS_TABS)[number]
export type SettingsTabId = SettingsTab["id"]

export const SETTINGS_PLACEHOLDER_SECTION_IDS = [
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

export * from "./account-constants"
export * from "./customization-constants"
export * from "./history-constants"
export * from "./models-constants"
