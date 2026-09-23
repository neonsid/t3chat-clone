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
