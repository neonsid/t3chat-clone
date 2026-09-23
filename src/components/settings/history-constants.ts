export const HISTORY_PAGE_SIZE = 10

export const HISTORY_PAGE = {
  title: "Chat History",
  description:
    "You can back up your chat history from here to restore or transfer your conversations later. Importing will NOT delete any of your existing conversations.",
  titleColumn: "Title",
  previous: "Previous",
  next: "Next",
  moreLabel: "History actions",
  import: "Import",
  export: "Export all",
  exportSelected: "Export selected",
  selectPage: "Select all on this page",
  selectThread: "Select thread",
  archive: "Archive",
  delete: "Delete",
  pinnedLabel: "Pinned",
} as const

export const SHARED_THREADS_PAGE = {
  title: "Shared Threads",
  description: "Manage your shared threads here.",
  emptyTitle: "No threads found.",
  emptyDescription: "No threads found. Create a new thread to get started.",
  createThread: "Create thread",
  expand: "Show shares",
  collapse: "Hide shares",
  selectShare: "Select share",
  editShare: "Edit share",
  branchesLabel: "Branches",
  viewsLabel: "Views",
  selectPage: "Select all shared threads on this page",
} as const

export const HISTORY_DANGER_ZONE = {
  title: "Danger Zone",
  description:
    "Permanently delete your history from both your local device and our servers.",
  action: "Delete Chat History",
  note: "Note: The retention policies of our LLM hosting partners may vary.",
  confirm: "Permanently delete all chat history? This cannot be undone.",
} as const
