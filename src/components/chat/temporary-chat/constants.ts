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

export const TEMPORARY_CHAT_TOAST_ANCHOR_CLASS = "chat-shell-toast-anchor"
export const TEMPORARY_CHAT_TOAST_STACK_CLASS =
  "pointer-events-none relative z-10 w-80 max-w-[calc(100vw-2rem)]"
export const TEMPORARY_CHAT_TOAST_ITEM_CLASS =
  "flex w-full items-center gap-3 rounded-md border border-border bg-card px-4 py-3 shadow-lg"
