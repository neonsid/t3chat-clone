export const SIDEBAR_SEARCH_SHORTCUT = "k";
export const SIDEBAR_SEARCH_FOCUS_DELAY_MS = 50;
export const SIDEBAR_LOAD_MORE_THRESHOLD_PX = 56;
export const SIDEBAR_TITLE_SHIMMER_WIDTH_CLASS = "w-[70%]";
export const SIDEBAR_RENAME_INPUT_CLASS =
  "h-9 w-full min-w-0 rounded-md bg-sidebar-foreground/10 px-3 text-xs text-sidebar-foreground outline-none";
export const SIDEBAR_THREAD_BUTTON_CLASS =
  "h-9 cursor-pointer rounded-md px-2 text-sidebar-foreground/80 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground data-active:bg-sidebar-accent data-active:font-medium data-active:text-sidebar-foreground";
export const SIDEBAR_THREAD_HOVER_ACTION_CLASS =
  "flex size-7 cursor-pointer items-center justify-center rounded-md bg-transparent text-sidebar-muted-foreground transition-colors hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none";
export const SIDEBAR_THREAD_ROW_TOOLTIP_DELAY_MS = 450;
export const SIDEBAR_THREAD_ACTION_TOOLTIP_DELAY_MS = 250;

export const DAY_IN_MS = 24 * 60 * 60 * 1000;
export const THREAD_SECTION_DEFINITIONS = [
  { id: "today", label: "Today" },
  { id: "week", label: "Previous 7 Days" },
  { id: "month", label: "Last 30 Days" },
  { id: "older", label: "Older" },
] as const;
