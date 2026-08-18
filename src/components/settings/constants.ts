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
export const CUSTOMIZATION_PATH = "/settings/customization" as const
export const HISTORY_PATH = "/settings/history" as const

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

export const CUSTOMIZATION_PAGE_TITLE = "Customize T3 Chat"

export const COPY_FROM_SCRATCH_ID = "scratch" as const

export const CUSTOMIZATION_PROFILE = {
  title: "Profile",
  info: "Each profile can use a different name, occupation, traits, and extra context for the assistant.",
  defaultName: "Default",
  defaultId: "default",
  addLabel: "Add profile",
  preferredNameLabel: "What should T3 Chat call you?",
  preferredNamePlaceholder: "Enter your name.",
  preferredNameMax: 50,
  occupationLabel: "What do you do?",
  occupationPlaceholder: "Engineer, student, etc.",
  occupationMax: 100,
  traitsLabel: "What traits should T3 Chat have?",
  traitsPlaceholder: "Type a trait and press Enter or Tab...",
  traitsMax: 100,
  extraLabel: "Anything else T3 Chat should know about you?",
  extraPlaceholder: "Interests, values, or preferences to keep in mind",
  extraMax: 3000,
  suggestedTraits: [
    "friendly",
    "witty",
    "concise",
    "curious",
    "empathetic",
    "creative",
    "patient",
  ],
} as const

export const CUSTOMIZATION_CREATE_PROFILE = {
  title: "Create New Profile",
  description:
    "Create a new profile to organize your threads and customize your experience.",
  nameLabel: "Name",
  namePlaceholder: "Work, Personal, etc.",
  nameMax: 50,
  copyFromLabel: "Copy settings from",
  copyFromScratch: "Start from scratch",
  copyFromAriaLabel: "Copy settings from",
  cancel: "Cancel",
  submit: "Create Profile",
  closeLabel: "Close",
} as const

export const CUSTOMIZATION_BEHAVIOR_OPTIONS = [
  {
    id: "disableExternalLinkWarning",
    title: "Disable External Link Warning",
    description:
      "Skip the confirmation dialog when clicking external links. Note: We cannot guarantee the safety of external links, use this option at your own risk.",
    defaultChecked: true,
  },
  {
    id: "invertSendEnter",
    title: "Invert Send/New Line Behavior",
    description:
      "When enabled, use Enter for newlines, and a modifier key + Enter to send messages. When disabled, use Enter to send and Shift + Enter for new lines.",
    defaultChecked: false,
  },
] as const

export const CUSTOMIZATION_VISUAL_OPTIONS = [
  {
    id: "boringTheme",
    title: "Boring Theme",
    description:
      "If you think the pink is too much, turn this on to tone it down.",
    defaultChecked: false,
  },
  {
    id: "hidePersonalInformation",
    title: "Hide Personal Information",
    description: "Hides your name and email from the UI.",
    defaultChecked: false,
  },
  {
    id: "disableThematicBreaks",
    title: "Disable Thematic Breaks",
    description:
      "Hides horizontal lines in chat messages. (Some browsers have trouble rendering these, turn off if you have bugs with duplicated lines)",
    defaultChecked: true,
  },
  {
    id: "statsForNerds",
    title: "Stats for Nerds",
    description:
      "Enables more insights into message stats including tokens per second, time to first token, and estimated tokens in the message.",
    defaultChecked: true,
  },
  {
    id: "minimalistCommandMenu",
    title: "Minimalist command menu",
    description:
      "Hides helper text and keyboard shortcuts in the command menu, showing only the command names.",
    defaultChecked: false,
  },
] as const

export const CUSTOMIZATION_MAIN_FONTS = [
  { id: "geist", label: "Geist (default)" },
  { id: "inter", label: "Inter" },
  { id: "system-sans", label: "System Sans" },
] as const

export const CUSTOMIZATION_CODE_FONTS = [
  { id: "geist-mono", label: "Geist Mono" },
  { id: "system-mono", label: "System Monospace Font" },
] as const

export const CUSTOMIZATION_CHAT_DENSITIES = [
  { id: "compact", label: "Compact" },
  { id: "standard", label: "Standard (default)" },
  { id: "comfortable", label: "Comfortable" },
] as const

export const CUSTOMIZATION_FONTS = {
  title: "Fonts Preview",
  mainLabel: "Main Text Font",
  mainDescription: "Used in general text throughout the app.",
  defaultMainFontId: "geist",
  codeLabel: "Code Font",
  codeDescription: "Used in code blocks and inline code in chat messages.",
  defaultCodeFontId: "system-mono",
  densityLabel: "Chat Density",
  densityDescription: "Adjust the vertical space between message lines.",
  defaultDensityId: "standard",
} as const

export const CUSTOMIZATION_FONTS_PREVIEW = {
  userMessage:
    "How should I decide whether to retry a failed network request? Keep it short.",
  heading: "Retry Rule",
  body: "Retry only when the failure is temporary. Treat timeouts and rate limits differently from validation or permission errors.",
  bullets: [
    "Retry 408, 429, and 5xx errors.",
    "Stop after a small number of attempts.",
  ],
  codeLanguage: "typescript",
  codeLines: [
    [
      { text: "const", kind: "keyword" },
      {
        text: " retryable = status === 429 || status === 500",
        kind: "plain",
      },
    ],
    [
      { text: "const", kind: "keyword" },
      {
        text: " shouldRetry = retryable && attempts < 3",
        kind: "plain",
      },
    ],
  ],
} as const

export const HISTORY_PAGE_SIZE = 10

export type HistoryMockThread = {
  id: string
  title: string
  updatedLabel: string
  pinned: boolean
}

export type SharedMockShare = {
  id: string
  url: string
  branchCount: number
  viewCount: number
  updatedLabel: string
}

export type SharedMockThread = {
  id: string
  title: string
  shares: ReadonlyArray<SharedMockShare>
}

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
  confirm:
    "Permanently delete all chat history? This cannot be undone.",
} as const

export const HISTORY_MOCK_THREADS: ReadonlyArray<HistoryMockThread> = [
  {
    id: "thread-1",
    title: "Lans and Routing Final Chapter",
    updatedLabel: "3 months ago",
    pinned: true,
  },
  {
    id: "thread-2",
    title: "Lans and Routing Chapter 4,5,6,7",
    updatedLabel: "3 months ago",
    pinned: true,
  },
  {
    id: "thread-3",
    title: "Lans and Routing Chapter 1,2,3",
    updatedLabel: "3 months ago",
    pinned: true,
  },
  {
    id: "thread-4",
    title: "LANs and Routing Main Commands",
    updatedLabel: "3 months ago",
    pinned: true,
  },
  {
    id: "thread-5",
    title: "New Thread",
    updatedLabel: "about 23 hours ago",
    pinned: false,
  },
  {
    id: "thread-6",
    title: "Yupp",
    updatedLabel: "about 23 hours ago",
    pinned: false,
  },
  {
    id: "thread-7",
    title: "React Doctor Triage Plan",
    updatedLabel: "7 days ago",
    pinned: false,
  },
  {
    id: "thread-8",
    title: "Image Content Identification",
    updatedLabel: "1 day ago",
    pinned: false,
  },
  {
    id: "thread-9",
    title: "Image Content Description",
    updatedLabel: "1 day ago",
    pinned: false,
  },
  {
    id: "thread-10",
    title: "Cloudflare R2 File Attachments Implementation",
    updatedLabel: "6 days ago",
    pinned: false,
  },
  {
    id: "thread-11",
    title: "Model picker favorites",
    updatedLabel: "3 months ago",
    pinned: false,
  },
  {
    id: "thread-12",
    title: "Reasoning tab visibility",
    updatedLabel: "3 months ago",
    pinned: false,
  },
]

export const SHARED_MOCK_THREADS: ReadonlyArray<SharedMockThread> = [
  {
    id: "shared-1",
    title: "Turborepo with pnpm setup guide",
    shares: [
      {
        id: "share-1",
        url: "https://t3.chat/share/9gf0h8gtga",
        branchCount: 0,
        viewCount: 0,
        updatedLabel: "7 months ago",
      },
    ],
  },
  {
    id: "shared-2",
    title: "Set Default Browser Arch Linux",
    shares: [
      {
        id: "share-2",
        url: "https://t3.chat/share/k2m91qpl8c",
        branchCount: 1,
        viewCount: 4,
        updatedLabel: "2 months ago",
      },
    ],
  },
  {
    id: "shared-3",
    title: "LANs and Routing Challenge Lab",
    shares: [],
  },
  {
    id: "shared-4",
    title: "Convex auth and identity mapping",
    shares: [],
  },
  {
    id: "shared-5",
    title: "Tailwind v4 theme tokens",
    shares: [],
  },
  {
    id: "shared-6",
    title: "Composer attachment previews",
    shares: [],
  },
  {
    id: "shared-7",
    title: "Temporary chats until first send",
    shares: [],
  },
  {
    id: "shared-8",
    title: "Settings account page layout",
    shares: [],
  },
  {
    id: "shared-9",
    title: "R2 file attachments for PDFs",
    shares: [],
  },
  {
    id: "shared-10",
    title: "Model picker favorites",
    shares: [],
  },
  {
    id: "shared-11",
    title: "Reasoning tab visibility",
    shares: [],
  },
  {
    id: "shared-12",
    title: "Chat empty state composer",
    shares: [],
  },
]
