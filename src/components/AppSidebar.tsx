import { useEffectEvent, useMemo, useRef, useState } from "react"
import type { UIEvent } from "react"
import {
  ArchiveIcon,
  ChevronUpIcon,
  LoaderCircleIcon,
  PinIcon,
  SearchIcon,
} from "lucide-react"
import * as m from "motion/react-m"

import { Tooltip } from "@/components/motion/tooltip"
import { ThreadContextMenu } from "@/components/ThreadContextMenu"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useMountEffect } from "@/hooks/useMountEffect"
import {
  groupSidebarThreads,
  SIDEBAR_THREAD_PAGE_SIZE,
} from "@/lib/sidebar-threads"
import type { ChatThread } from "@/lib/threads"
import { cn } from "@/lib/utils"

type AppSidebarProps = {
  threads: ChatThread[]
  activeThreadId: string
  actions: {
    select: (threadId: string) => void
    create: () => void
    delete: (threadId: string) => void
    togglePinned: (threadId: string) => void
    archive: (threadId: string) => void
    rename: (threadId: string, title: string) => void
    regenerateTitle: (threadId: string) => void
  }
}

export function AppSidebar({
  threads,
  activeThreadId,
  actions,
}: AppSidebarProps) {
  const { isMobile, setOpen, setOpenMobile } = useSidebar()
  const [query, setQuery] = useState("")
  const [pinnedOpen, setPinnedOpen] = useState(true)
  const [visibleCount, setVisibleCount] = useState(SIDEBAR_THREAD_PAGE_SIZE)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const loadMoreTimerRef = useRef<number | null>(null)

  const onSearchShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "k") {
      return
    }
    event.preventDefault()
    if (isMobile) {
      setOpenMobile(true)
    } else {
      setOpen(true)
    }
    window.setTimeout(() => searchInputRef.current?.focus(), 50)
  })

  useMountEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => onSearchShortcut(event)
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  })

  useMountEffect(() => () => {
    if (loadMoreTimerRef.current) clearTimeout(loadMoreTimerRef.current)
  })

  const filteredThreads = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const conversationThreads = threads.filter(
      (thread) => thread.messages.length > 0 && !thread.archivedAt
    )
    if (!normalized) return conversationThreads
    return conversationThreads.filter((thread) =>
      thread.title.toLowerCase().includes(normalized)
    )
  }, [query, threads])

  const orderedThreads = useMemo(
    () => [
      ...filteredThreads
        .filter((thread) => thread.pinnedAt != null)
        .sort((a, b) => (b.pinnedAt ?? 0) - (a.pinnedAt ?? 0)),
      ...filteredThreads.filter((thread) => thread.pinnedAt == null),
    ],
    [filteredThreads]
  )
  const visibleThreads = orderedThreads.slice(0, visibleCount)
  const pinnedThreads = visibleThreads
    .filter((thread) => thread.pinnedAt)
    .sort((a, b) => (b.pinnedAt ?? 0) - (a.pinnedAt ?? 0))
  const regularSections = groupSidebarThreads(
    visibleThreads.filter((thread) => !thread.pinnedAt)
  )
  const hasMoreThreads = visibleCount < orderedThreads.length

  function handleSelect(threadId: string) {
    actions.select(threadId)
    if (isMobile) setOpenMobile(false)
  }

  function loadMoreThreads() {
    if (!hasMoreThreads || isLoadingMore) return
    setIsLoadingMore(true)
    loadMoreTimerRef.current = window.setTimeout(() => {
      setVisibleCount((count) => count + SIDEBAR_THREAD_PAGE_SIZE)
      setIsLoadingMore(false)
      loadMoreTimerRef.current = null
    }, 320)
  }

  function handleListScroll(event: UIEvent<HTMLDivElement>) {
    const element = event.currentTarget
    if (element.scrollHeight - element.scrollTop - element.clientHeight < 56) {
      loadMoreThreads()
    }
  }

  function renderThread(thread: ChatThread) {
    const isActive = thread.id === activeThreadId
    const isPinned = Boolean(thread.pinnedAt)

    return (
      <SidebarMenuItem key={thread.id} className="sidebar-thread-row">
        <ThreadContextMenu thread={thread} actions={actions}>
          <div className="w-full">
            <Tooltip
              content={thread.title}
              side="right"
              delay={450}
              wrapperClassName="w-full"
            >
              <SidebarMenuButton
                isActive={isActive}
                size="sm"
                className={cn(
                  "h-9 rounded-md px-2 text-sidebar-muted-foreground transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground data-active:bg-sidebar-accent data-active:font-medium data-active:text-sidebar-foreground"
                )}
                onClick={() => handleSelect(thread.id)}
              >
                <span className="sidebar-thread-title min-w-0 flex-1 truncate">
                  {thread.title}
                </span>
              </SidebarMenuButton>
            </Tooltip>
          </div>
        </ThreadContextMenu>

        <div className="sidebar-thread-actions absolute top-1 right-1 flex items-center gap-0.5 rounded-md">
          <Tooltip
            content={isPinned ? "Unpin chat" : "Pin chat"}
            side="top"
            delay={250}
          >
            <button
              type="button"
              aria-label={
                isPinned ? `Unpin ${thread.title}` : `Pin ${thread.title}`
              }
              className="flex size-7 cursor-pointer items-center justify-center rounded-sm bg-transparent text-sidebar-muted-foreground transition-colors hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
              onClick={(event) => {
                event.stopPropagation()
                actions.togglePinned(thread.id)
              }}
            >
              <PinIcon
                aria-hidden="true"
                className={cn("size-3.5", isPinned && "fill-current")}
              />
            </button>
          </Tooltip>
          <Tooltip content="Archive chat" side="top" delay={250}>
            <button
              type="button"
              aria-label={`Archive ${thread.title}`}
              className="flex size-7 cursor-pointer items-center justify-center rounded-sm bg-transparent p-1 text-sidebar-muted-foreground transition-colors hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
              onClick={(event) => {
                event.stopPropagation()
                actions.archive(thread.id)
              }}
            >
              <ArchiveIcon aria-hidden="true" className="size-3.5" />
            </button>
          </Tooltip>
        </div>
      </SidebarMenuItem>
    )
  }

  return (
    <Sidebar
      collapsible="offcanvas"
      variant="inset"
      data-sidebar-version="v2"
      className="bg-sidebar text-sidebar-foreground"
    >
      <SidebarHeader className="shrink-0 gap-0 p-0">
        <div className="flex h-[52px] items-start pt-0.5 pr-3 pl-[52px]">
          <div className="flex h-8 min-w-0 items-center gap-1 overflow-hidden rounded-md text-sidebar-foreground">
            <span className="truncate text-base leading-none font-medium tracking-tight text-sidebar-muted-foreground">
              T3 Chat
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 px-2 pb-3">
          <m.button
            type="button"
            onClick={actions.create}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 500, damping: 16 }}
            className="sidebar-new-chat-button inline-flex h-9 w-full cursor-pointer items-center justify-center rounded-md text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            New Chat
          </m.button>

          <div className="group flex flex-col">
            <label className="flex cursor-text items-center gap-2 py-2">
              <SearchIcon
                className="size-4 shrink-0 text-sidebar-muted-foreground"
                aria-hidden="true"
              />
              <input
                ref={searchInputRef}
                data-sidebar-search=""
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setVisibleCount(SIDEBAR_THREAD_PAGE_SIZE)
                }}
                placeholder="Search your threads..."
                className="min-w-0 flex-1 bg-transparent text-sm text-sidebar-foreground outline-none placeholder:text-sidebar-muted-foreground"
                aria-label="Search chats"
              />
            </label>
            <Separator className="my-1 transition-colors" />
          </div>
        </div>
      </SidebarHeader>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <SidebarContent className="gap-0" onScroll={handleListScroll}>
          {filteredThreads.length === 0 ? (
            <p className="px-4 py-2 text-xs text-sidebar-muted-foreground">
              {query.trim() ? "No matching chats" : "No chats yet"}
            </p>
          ) : (
            <>
              {pinnedThreads.length > 0 ? (
                <SidebarGroup className="px-2 pb-1">
                  <button
                    type="button"
                    aria-expanded={pinnedOpen}
                    className="flex w-full cursor-pointer items-center gap-1.5 px-2 pb-1.5 text-xs font-semibold text-sidebar-foreground/70 transition-colors outline-none hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                    onClick={() => setPinnedOpen((open) => !open)}
                  >
                    <PinIcon className="size-3.5" aria-hidden="true" />
                    Pinned
                    <ChevronUpIcon
                      aria-hidden="true"
                      className={cn(
                        "ml-auto size-3.5 transition-transform duration-200",
                        !pinnedOpen && "rotate-180"
                      )}
                    />
                  </button>
                  {pinnedOpen ? (
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {pinnedThreads.map(renderThread)}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  ) : null}
                </SidebarGroup>
              ) : null}

              {regularSections.map((section) => (
                <SidebarGroup key={section.id} className="px-2 pb-1">
                  <div className="px-2 pb-1.5 text-xs font-semibold text-sidebar-foreground/60">
                    {section.label}
                  </div>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {section.threads.map(renderThread)}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              ))}

              {hasMoreThreads || isLoadingMore ? (
                <button
                  type="button"
                  data-sidebar-pagination-loader="true"
                  aria-live="polite"
                  aria-label="Load more chats"
                  disabled={isLoadingMore}
                  onClick={loadMoreThreads}
                  className="flex h-10 w-full cursor-pointer items-center justify-center text-sidebar-muted-foreground transition-colors hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none disabled:cursor-wait"
                >
                  <LoaderCircleIcon
                    aria-hidden="true"
                    className={cn(
                      "size-4",
                      isLoadingMore && "animate-spin text-sidebar-foreground"
                    )}
                  />
                  <span className="sr-only">
                    {isLoadingMore
                      ? "Loading more chats"
                      : "More chats load when you scroll"}
                  </span>
                </button>
              ) : null}
            </>
          )}
        </SidebarContent>

        <div
          aria-hidden="true"
          className="sidebar-list-top-fade pointer-events-none absolute inset-x-0 top-0 z-10 h-6"
        />
      </div>
    </Sidebar>
  )
}
