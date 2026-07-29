import { useEffect, useMemo, useRef, useState } from "react";
import { SearchIcon, SquarePenIcon, Trash2Icon } from "lucide-react";

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
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ChatThread } from "@/lib/threads";
import { cn } from "@/lib/utils";

type AppSidebarProps = {
  threads: ChatThread[];
  activeThreadId: string;
  onSelectThread: (threadId: string) => void;
  onCreateThread: () => void;
  onDeleteThread: (threadId: string) => void;
};

export function AppSidebar({
  threads,
  activeThreadId,
  onSelectThread,
  onCreateThread,
  onDeleteThread,
}: AppSidebarProps) {
  const { isMobile, setOpen, setOpenMobile } = useSidebar();
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "k") {
        return;
      }
      event.preventDefault();
      if (isMobile) {
        setOpenMobile(true);
      } else {
        setOpen(true);
      }
      window.setTimeout(() => searchInputRef.current?.focus(), 50);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMobile, setOpen, setOpenMobile]);

  const filteredThreads = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return threads;
    return threads.filter((thread) => thread.title.toLowerCase().includes(normalized));
  }, [query, threads]);

  function handleSelect(threadId: string) {
    onSelectThread(threadId);
    if (isMobile) setOpenMobile(false);
  }

  return (
    <Sidebar
      collapsible="offcanvas"
      variant="inset"
      data-sidebar-version="v2"
      className="bg-sidebar text-sidebar-foreground"
    >
      <SidebarHeader className="h-[52px] shrink-0 flex-row items-start gap-2 py-0 pt-0.5 pr-3 pl-[52px]">
        <div className="flex h-8 min-w-0 items-center gap-1 overflow-hidden rounded-md text-sidebar-foreground">
          <span className="truncate text-base leading-none font-medium tracking-tight text-sidebar-muted-foreground">
            T3 Chat
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        <SidebarGroup className="px-2 pb-2 pt-3">
          <div className="flex items-center gap-1">
            <label className="flex h-8 min-w-0 flex-1 cursor-text items-center gap-2 rounded-md px-2 text-sm font-medium text-sidebar-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-within:bg-sidebar-accent focus-within:text-sidebar-foreground">
              <SearchIcon className="size-4 shrink-0 text-sidebar-muted-foreground/80" />
              <input
                ref={searchInputRef}
                data-sidebar-search=""
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search"
                className="min-w-0 flex-1 bg-transparent text-sm text-sidebar-foreground outline-none placeholder:text-sidebar-muted-foreground"
                aria-label="Search chats"
              />
              <kbd className="hidden h-4 min-w-0 items-center rounded-sm bg-muted px-1.5 text-[10px] text-sidebar-muted-foreground ring-1 ring-sidebar-border sm:inline-flex">
                Ctrl+K
              </kbd>
            </label>

            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-label="New chat"
                    onClick={onCreateThread}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-sidebar-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                  />
                }
              >
                <SquarePenIcon className="size-4 text-sidebar-muted-foreground/80" />
              </TooltipTrigger>
              <TooltipContent side="right">New chat</TooltipContent>
            </Tooltip>
          </div>
        </SidebarGroup>

        <SidebarGroup className="px-2 pt-0">
          <div className="px-2 pb-1.5 text-xs font-medium text-sidebar-muted-foreground">Chats</div>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredThreads.length === 0 ? (
                <p className="px-2 py-2 text-xs text-sidebar-muted-foreground">
                  {query.trim() ? "No matching chats" : "No chats yet"}
                </p>
              ) : (
                filteredThreads.map((thread) => {
                  const isActive = thread.id === activeThreadId;

                  return (
                    <SidebarMenuItem key={thread.id}>
                      <SidebarMenuButton
                        isActive={isActive}
                        size="sm"
                        className={cn(
                          "h-8 rounded-md px-2 text-sidebar-muted-foreground transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground data-active:bg-sidebar-accent data-active:font-medium data-active:text-sidebar-foreground",
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
                          event.stopPropagation();
                          onDeleteThread(thread.id);
                        }}
                      >
                        <Trash2Icon />
                      </SidebarMenuAction>
                    </SidebarMenuItem>
                  );
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
