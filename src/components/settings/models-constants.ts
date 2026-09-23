export type ModelsAccessFilter = "all" | "free" | "premium"
export type ModelsView = "list" | "grid"

export const MODELS_PAGE = {
  title: "Models",
  description:
    "Choose which models appear in your selector, and read more about their capabilities.",
  moreLabel: "Model list actions",
  selectRecommended: "Select recommended",
  unselectAll: "Unselect all",
  searchPlaceholder: "Search models...",
  searchLabel: "Search models",
  filterLabel: "Filter",
  listView: "List view",
  gridView: "Grid view",
  newBadge: "NEW",
  newSparkle: "New model",
  freeTierOnly: "Free tier only",
  premiumOnly: "Premium only",
  empty: "No models found.",
  favorite: "Add to favorites",
  unfavorite: "Remove from favorites",
  moreActions: "Model actions",
  newCount: 3,
} as const

export const MODELS_RECOMMENDED_IDS = [
  "openai/gpt-5.5",
  "openai/gpt-5.4-mini",
  "anthropic/claude-sonnet-5",
  "google/gemini-3.1-flash-lite",
  "xai/grok-4.5",
  "deepseek/deepseek-v4-pro",
  "cohere/north-mini-code-1-0",
] as const
