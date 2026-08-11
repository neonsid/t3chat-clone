export const SIDEBAR_THREAD_PAGE_SIZE = 12
export const SIDEBAR_SEARCH_SHORTCUT = "k"
export const SIDEBAR_SEARCH_FOCUS_DELAY_MS = 50
export const SIDEBAR_LOAD_MORE_DELAY_MS = 320
export const SIDEBAR_LOAD_MORE_THRESHOLD_PX = 56
export const SIDEBAR_TITLE_SHIMMER_WIDTH_CLASS = "w-[70%]"

export const DAY_IN_MS = 24 * 60 * 60 * 1000
export const THREAD_SECTION_DEFINITIONS = [
  { id: "today", label: "Today" },
  { id: "week", label: "Previous 7 Days" },
  { id: "month", label: "Last 30 Days" },
  { id: "older", label: "Older" },
] as const
