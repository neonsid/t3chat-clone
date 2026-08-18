export const TEMPORARY_CHAT = {
  label: "Temporary chat",
  toggleLabel: "Temporary chat",
  enableTooltipTitle: "Enable temporary chat",
  enableTooltipDescription: "Messages won't be saved to your account",
  convertTooltipTitle: "Convert to stored chat",
  convertTooltipDescription: "Click to convert to a stored chat",
  convertTitle: "Convert to stored chat?",
  convertDescription:
    "This will store the chat permanently. It will no longer be temporary.",
  cancel: "Cancel",
  convert: "Convert",
  convertedToast: "Chat converted to stored chat",
  onlyOnNewChat: "Temporary chat is only available on new chats",
  contextOpenNewTab: "Open in New Tab",
  contextRename: "Rename",
  contextConvert: "Convert to stored chat",
  contextDelete: "Delete",
} as const

export const TEMPORARY_CHAT_TOAST_ANCHOR_CLASS =
  "pointer-events-none absolute right-4 z-30 flex justify-end"
export const TEMPORARY_CHAT_TOAST_STACK_CLASS =
  "pointer-events-none relative z-10 w-fit max-w-[min(100%,20rem)]"
export const TEMPORARY_CHAT_TOAST_ITEM_CLASS =
  "flex w-fit max-w-full items-center gap-2.5 rounded-md border border-border bg-card px-3 py-2 shadow-lg"
