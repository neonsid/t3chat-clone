import type { ChatThread } from "@/lib/threads"

export const SIDEBAR_THREAD_PAGE_SIZE = 12

export type SidebarThreadSection = {
  id: string
  label: string
  threads: ChatThread[]
}

const DAY_IN_MS = 24 * 60 * 60 * 1000
const THREAD_SECTION_DEFINITIONS = [
  { id: "today", label: "Today" },
  { id: "week", label: "Previous 7 Days" },
  { id: "month", label: "Last 30 Days" },
  { id: "older", label: "Older" },
] as const

export function groupSidebarThreads(
  threads: ChatThread[]
): SidebarThreadSection[] {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const today = startOfToday.getTime()
  const sevenDaysAgo = today - 7 * DAY_IN_MS
  const thirtyDaysAgo = today - 30 * DAY_IN_MS
  const sections: SidebarThreadSection[] = THREAD_SECTION_DEFINITIONS.map(
    (section) => ({ ...section, threads: [] })
  )

  for (const thread of threads) {
    if (thread.updatedAt >= today) sections[0].threads.push(thread)
    else if (thread.updatedAt >= sevenDaysAgo) sections[1].threads.push(thread)
    else if (thread.updatedAt >= thirtyDaysAgo) sections[2].threads.push(thread)
    else sections[3].threads.push(thread)
  }

  return sections.filter((section) => section.threads.length > 0)
}
