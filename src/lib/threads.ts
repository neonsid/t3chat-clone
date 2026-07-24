import type { UIMessage } from "@tanstack/ai-react"

export type ChatThread = {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: UIMessage[]
}

const STORAGE_KEY = "t3chat.threads.v1"

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `thread_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function createEmptyThread(partial?: Partial<ChatThread>): ChatThread {
  const now = Date.now()
  return {
    id: createId(),
    title: "New chat",
    createdAt: now,
    updatedAt: now,
    messages: [],
    ...partial,
  }
}

export function titleFromMessages(messages: UIMessage[]): string {
  const firstUser = messages.find((message) => message.role === "user")
  if (!firstUser) return "New chat"

  const text = firstUser.parts
    .filter((part) => part.type === "text")
    .map((part) => part.content)
    .join(" ")
    .trim()

  if (!text) return "New chat"
  return text.length > 48 ? `${text.slice(0, 48).trimEnd()}…` : text
}

type StoredState = {
  activeThreadId: string
  threads: ChatThread[]
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

export function loadThreadState(): StoredState {
  const fallback = createEmptyThread()
  if (!canUseStorage()) {
    return { activeThreadId: fallback.id, threads: [fallback] }
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { activeThreadId: fallback.id, threads: [fallback] }
    }

    const parsed = JSON.parse(raw) as Partial<StoredState>
    const threads = Array.isArray(parsed.threads)
      ? parsed.threads.filter(
          (thread): thread is ChatThread =>
            Boolean(thread) &&
            typeof thread.id === "string" &&
            typeof thread.title === "string" &&
            Array.isArray(thread.messages)
        )
      : []

    if (threads.length === 0) {
      return { activeThreadId: fallback.id, threads: [fallback] }
    }

    const activeThreadId =
      typeof parsed.activeThreadId === "string" &&
      threads.some((thread) => thread.id === parsed.activeThreadId)
        ? parsed.activeThreadId
        : threads[0].id

    return { activeThreadId, threads }
  } catch {
    return { activeThreadId: fallback.id, threads: [fallback] }
  }
}

export function saveThreadState(state: StoredState) {
  if (!canUseStorage()) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function formatShortTimestamp(value: Date | number | string | undefined) {
  if (!value) return ""
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}
