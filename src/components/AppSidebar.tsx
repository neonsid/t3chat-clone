import { useEffect, useMemo, useRef, useState } from "react"
import { SearchIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import type { ChatThread } from "@/lib/threads"
import { cn } from "@/lib/utils"

type AppSidebarProps = {
  threads: ChatThread[]
  activeThreadId: string
  onSelectThread: (threadId: string) => void
  onCreateThread: () => void
  onDeleteThread: (threadId: string) => void
}

export function AppSidebar({
  threads,
  activeThreadId,
  onSelectThread,
  onCreateThread,
  onDeleteThread,
}: AppSidebarProps) {
  const { isMobile, setOpen, setOpenMobile } = useSidebar()
  const [query, setQuery] = useState("")
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        !(event.ctrlKey || event.metaKey) ||
        event.key.toLowerCase() !== "k"
      ) {
        return
      }
      event.preventDefault()
      if (isMobile) {
        setOpenMobile(true)
      } else {
        setOpen(true)
      }
      window.setTimeout(() => searchInputRef.current?.focus(), 50)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isMobile, setOpen, setOpenMobile])

  const filteredThreads = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return threads
    return threads.filter((thread) =>
      thread.title.toLowerCase().includes(normalized)
    )
  }, [query, threads])

  function handleSelect(threadId: string) {
    onSelectThread(threadId)
    if (isMobile) setOpenMobile(false)
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
          <Button
            type="button"
            onClick={onCreateThread}
            className="h-9 w-full rounded-md border border-sidebar-border bg-sidebar-accent text-sm font-medium text-sidebar-foreground shadow-[inset_0_1px_0_rgb(255_255_255/6%)] hover:bg-[color-mix(in_srgb,var(--sidebar-foreground)_12%,transparent)] hover:text-sidebar-accent-foreground"
          >
            New Chat
          </Button>

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
                onChange={(event) => setQuery(event.target.value)}
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
        <SidebarContent className="gap-0">
          <SidebarGroup className="px-2">
            <div className="px-2 pb-1.5 text-xs font-medium text-sidebar-muted-foreground">
              Chats
            </div>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredThreads.length === 0 ? (
                  <p className="px-2 py-2 text-xs text-sidebar-muted-foreground">
                    {query.trim() ? "No matching chats" : "No chats yet"}
                  </p>
                ) : (
                  filteredThreads.map((thread) => {
                    const isActive = thread.id === activeThreadId

                    return (
                      <SidebarMenuItem key={thread.id}>
                        <SidebarMenuButton
                          isActive={isActive}
                          size="sm"
                          className={cn(
                            "h-8 rounded-md px-2 text-sidebar-muted-foreground transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground data-active:bg-sidebar-accent data-active:font-medium data-active:text-sidebar-foreground"
                          )}
                          onClick={() => handleSelect(thread.id)}
                          tooltip={thread.title}
                        >
                          <span className="truncate">{thread.title}</span>
                        </SidebarMenuButton>
                        <SidebarMenuAction
                          showOnHover
                          aria-label={`Delete ${thread.title}`}
                          className="text-sidebar-muted-foreground transition-opacity duration-150 hover:text-destructive"
                          onClick={(event) => {
                            event.stopPropagation()
                            onDeleteThread(thread.id)
                          }}
                        >
                          <Trash2Icon />
                        </SidebarMenuAction>
                      </SidebarMenuItem>
                    )
                  })
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <div
          aria-hidden="true"
          className="sidebar-list-top-fade pointer-events-none absolute inset-x-0 top-0 z-10 h-6"
        />
      </div>
    </Sidebar>
  )
}
