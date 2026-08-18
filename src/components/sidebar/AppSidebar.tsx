import { useMemo, useRef, useState } from "react";
import type { ReactNode, UIEvent } from "react";
import {
  ArchiveIcon,
  ChevronUpIcon,
  ClockIcon,
  LoaderCircleIcon,
  PinIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import * as m from "motion/react-m";
import { useShallow } from "zustand/react/shallow";

import { ThreadContextMenu } from "@/components/sidebar/ThreadContextMenu";
import { SidebarAccount } from "@/components/sidebar/SidebarAccount";
import { TEMPORARY_CHAT } from "@/components/chat/temporary-chat/constants";
import {
  SIDEBAR_LOAD_MORE_THRESHOLD_PX,
  SIDEBAR_RENAME_INPUT_CLASS,
  SIDEBAR_SEARCH_FOCUS_DELAY_MS,
  SIDEBAR_SEARCH_SHORTCUT,
  SIDEBAR_THREAD_ACTION_TOOLTIP_DELAY_MS,
  SIDEBAR_THREAD_BUTTON_CLASS,
  SIDEBAR_THREAD_HOVER_ACTION_CLASS,
  SIDEBAR_THREAD_ROW_TOOLTIP_DELAY_MS,
  SIDEBAR_TITLE_SHIMMER_WIDTH_CLASS,
} from "@/components/sidebar/constants";
import { groupSidebarThreads } from "@/components/sidebar/logic";
import { Tooltip } from "@/components/shared/motion/tooltip";
import { Separator } from "@/components/shared/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebarActions,
} from "@/components/shared/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useWindowEvent } from "@/hooks/useWindowEvent";
import type { ChatThread } from "@/lib/threads";
import { cn } from "@/lib/utils";
import { MAX_THREAD_TITLE_LENGTH } from "../../../convex/constants";
import { useSidebarUiStore } from "@/stores/AppStateProvider";

type AppSidebarProps = {
  threads: ChatThread[];
  activeThreadId: string;
  isDataReady: boolean;
  paginationStatus: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";
  onLoadMore: () => void;
  actions: {
    select: (threadId: string) => void;
    create: () => void;
    delete: (threadId: string) => void;
    togglePinned: (threadId: string) => void;
    archive: (threadId: string) => void;
    rename: (threadId: string, title: string) => void;
    regenerateTitle: (threadId: string) => void;
    convert: (threadId: string) => void;
  };
};

function ThreadHoverAction({
  label,
  tooltip,
  destructive = false,
  onClick,
  children,
}: {
  label: string;
  tooltip: string;
  destructive?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip content={tooltip} side="top" delay={SIDEBAR_THREAD_ACTION_TOOLTIP_DELAY_MS}>
      <button
        type="button"
        aria-label={label}
        className={cn(SIDEBAR_THREAD_HOVER_ACTION_CLASS, destructive && "hover:text-destructive")}
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
      >
        {children}
      </button>
    </Tooltip>
  );
}

function ThreadRowButton({
  isRenaming,
  isTemporary,
  isActive,
  isBusy,
  isTitlePending,
  displayTitle,
  renameDraft,
  onRenameDraftChange,
  onCommitRename,
  onCancelRename,
  onSelect,
}: {
  isRenaming: boolean;
  isTemporary: boolean;
  isActive: boolean;
  isBusy: boolean;
  isTitlePending: boolean;
  displayTitle: string;
  renameDraft: string;
  onRenameDraftChange: (value: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onSelect: () => void;
}) {
  if (isRenaming) {
    return (
      <div className="w-full">
        <input
          aria-label="Rename chat"
          autoFocus
          className={SIDEBAR_RENAME_INPUT_CLASS}
          maxLength={MAX_THREAD_TITLE_LENGTH}
          value={renameDraft}
          onBlur={onCommitRename}
          onChange={(event) => onRenameDraftChange(event.target.value)}
          onClick={(event) => event.stopPropagation()}
          onFocus={(event) => event.currentTarget.select()}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              onCancelRename();
            }
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
        />
      </div>
    );
  }

  return (
    <Tooltip
      content={
        isTemporary
          ? TEMPORARY_CHAT.label
          : isTitlePending
            ? "Generating title…"
            : displayTitle
      }
      side="right"
      delay={SIDEBAR_THREAD_ROW_TOOLTIP_DELAY_MS}
      wrapperClassName="w-full"
    >
      <SidebarMenuButton
        isActive={isActive}
        size="sm"
        aria-label={isTemporary ? TEMPORARY_CHAT.label : undefined}
        className={cn(SIDEBAR_THREAD_BUTTON_CLASS, isBusy && "pe-9")}
        onClick={onSelect}
      >
        {isTemporary ? (
          <ClockIcon aria-hidden="true" className="size-3.5 text-sidebar-foreground/80" />
        ) : null}
        {isTitlePending ? (
          <span
            aria-label="Generating title"
            className={cn(
              "sidebar-thread-title-shimmer min-w-0 flex-1",
              SIDEBAR_TITLE_SHIMMER_WIDTH_CLASS,
            )}
          />
        ) : (
          <span className="sidebar-thread-title min-w-0 flex-1 truncate">{displayTitle}</span>
        )}
      </SidebarMenuButton>
    </Tooltip>
  );
}

function ThreadRowActions({
  isBusy,
  isRenaming,
  isTemporary,
  isPinned,
  isTitlePending,
  displayTitle,
  onDelete,
  onTogglePinned,
  onArchive,
}: {
  isBusy: boolean;
  isRenaming: boolean;
  isTemporary: boolean;
  isPinned: boolean;
  isTitlePending: boolean;
  displayTitle: string;
  onDelete: () => void;
  onTogglePinned: () => void;
  onArchive: () => void;
}) {
  if (isBusy) {
    return (
      <div className="sidebar-thread-status absolute top-1 right-1 flex size-7 items-center justify-center">
        <LoaderCircleIcon
          aria-hidden="true"
          className="size-3.5 animate-spin text-sidebar-foreground/80"
        />
        <span className="sr-only">
          {isTitlePending ? "Generating title" : "Assistant is responding"}
        </span>
      </div>
    );
  }

  if (isRenaming) return null;

  return (
    <div className="sidebar-thread-actions absolute top-1 right-1 flex items-center gap-0.5 rounded-md">
      {isTemporary ? (
        <ThreadHoverAction
          label={`Delete ${displayTitle}`}
          tooltip="Delete chat"
          destructive
          onClick={onDelete}
        >
          <Trash2Icon aria-hidden="true" className="size-3.5" />
        </ThreadHoverAction>
      ) : (
        <>
          <ThreadHoverAction
            label={isPinned ? `Unpin ${displayTitle}` : `Pin ${displayTitle}`}
            tooltip={isPinned ? "Unpin chat" : "Pin chat"}
            onClick={onTogglePinned}
          >
            <PinIcon aria-hidden="true" className={cn("size-3.5", isPinned && "fill-current")} />
          </ThreadHoverAction>
          <ThreadHoverAction
            label={`Archive ${displayTitle}`}
            tooltip="Archive chat"
            onClick={onArchive}
          >
            <ArchiveIcon aria-hidden="true" className="size-3.5" />
          </ThreadHoverAction>
        </>
      )}
    </div>
  );
}

export function AppSidebar({
  threads,
  activeThreadId,
  isDataReady,
  paginationStatus,
  onLoadMore,
  actions,
}: AppSidebarProps) {
  // Actions-only: open toggles must not re-render the full thread list.
  const { setOpen, setOpenMobile } = useSidebarActions();
  const isMobile = useIsMobile();
  const sidebar = useSidebarUiStore(
    useShallow((state) => ({
      searchQuery: state.searchQuery,
      pinnedExpanded: state.pinnedExpanded,
      setSearchQuery: state.setSearchQuery,
      setPinnedExpanded: state.setPinnedExpanded,
    })),
  );
  const searchInputRef = useRef<HTMLInputElement>(null);
  const skipRenameCommitRef = useRef(false);
  const [renamingThreadId, setRenamingThreadId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [committedTitle, setCommittedTitle] = useState<{
    threadId: string;
    title: string;
  } | null>(null);

  useWindowEvent("keydown", (event) => {
    if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== SIDEBAR_SEARCH_SHORTCUT) {
      return;
    }
    event.preventDefault();
    if (isMobile) {
      setOpenMobile(true);
    } else {
      setOpen(true);
    }
    window.setTimeout(() => searchInputRef.current?.focus(), SIDEBAR_SEARCH_FOCUS_DELAY_MS);
  });

  const orderedThreads = useMemo(
    () => [
      ...threads
        .filter((thread) => thread.pinnedAt != null)
        .sort((a, b) => (b.pinnedAt ?? 0) - (a.pinnedAt ?? 0)),
      ...threads.filter((thread) => thread.pinnedAt == null),
    ],
    [threads],
  );
  const pinnedThreads = orderedThreads
    .filter((thread) => thread.pinnedAt)
    .sort((a, b) => (b.pinnedAt ?? 0) - (a.pinnedAt ?? 0));
  const regularSections = groupSidebarThreads(orderedThreads.filter((thread) => !thread.pinnedAt));
  const hasMoreThreads = paginationStatus === "CanLoadMore";
  const isLoadingMore =
    paginationStatus === "LoadingMore" || paginationStatus === "LoadingFirstPage";

  function beginRename(thread: ChatThread) {
    setRenamingThreadId(thread.id);
    setRenameDraft(thread.title);
  }

  function cancelRename() {
    skipRenameCommitRef.current = true;
    setRenamingThreadId(null);
  }

  function commitRename() {
    if (skipRenameCommitRef.current) {
      skipRenameCommitRef.current = false;
      return;
    }
    if (renamingThreadId === null) return;
    const title = renameDraft.trim();
    const threadId = renamingThreadId;
    setRenamingThreadId(null);
    if (!title) return;
    setCommittedTitle({ threadId, title });
    actions.rename(threadId, title);
  }

  if (
    committedTitle !== null &&
    threads.some(
      (thread) => thread.id === committedTitle.threadId && thread.title === committedTitle.title,
    )
  ) {
    setCommittedTitle(null);
  }

  function handleSelect(threadId: string) {
    actions.select(threadId);
    if (isMobile) setOpenMobile(false);
  }

  function loadMoreThreads() {
    if (!hasMoreThreads || isLoadingMore) return;
    onLoadMore();
  }

  function handleListScroll(event: UIEvent<HTMLDivElement>) {
    const element = event.currentTarget;
    if (
      element.scrollHeight - element.scrollTop - element.clientHeight <
      SIDEBAR_LOAD_MORE_THRESHOLD_PX
    ) {
      loadMoreThreads();
    }
  }

  function renderThread(thread: ChatThread) {
    const isActive = thread.id === activeThreadId;
    const isPinned = Boolean(thread.pinnedAt);
    const isTitlePending = thread.titleSource === "pending";
    const isTemporary = Boolean(thread.isTemporary);
    const isBusy = isTitlePending || thread.isStreaming;
    const isRenaming = renamingThreadId === thread.id;
    const displayTitle =
      thread.id === committedTitle?.threadId ? committedTitle.title : thread.title;

    return (
      <SidebarMenuItem
        key={thread.id}
        className="sidebar-thread-row"
        data-thread-busy={isBusy ? "true" : undefined}
      >
        {isRenaming ? (
          <ThreadRowButton
            isRenaming={isRenaming}
            isTemporary={isTemporary}
            isActive={isActive}
            isBusy={isBusy}
            isTitlePending={isTitlePending}
            displayTitle={displayTitle}
            renameDraft={renameDraft}
            onRenameDraftChange={setRenameDraft}
            onCommitRename={commitRename}
            onCancelRename={cancelRename}
            onSelect={() => handleSelect(thread.id)}
          />
        ) : (
          <ThreadContextMenu
            thread={thread}
            actions={{
              ...actions,
              beginRename: () => beginRename(thread),
            }}
          >
            <div className="w-full">
              <ThreadRowButton
                isRenaming={isRenaming}
                isTemporary={isTemporary}
                isActive={isActive}
                isBusy={isBusy}
                isTitlePending={isTitlePending}
                displayTitle={displayTitle}
                renameDraft={renameDraft}
                onRenameDraftChange={setRenameDraft}
                onCommitRename={commitRename}
                onCancelRename={cancelRename}
                onSelect={() => handleSelect(thread.id)}
              />
            </div>
          </ThreadContextMenu>
        )}

        <ThreadRowActions
          isBusy={isBusy}
          isRenaming={isRenaming}
          isTemporary={isTemporary}
          isPinned={isPinned}
          isTitlePending={isTitlePending}
          displayTitle={displayTitle}
          onDelete={() => actions.delete(thread.id)}
          onTogglePinned={() => actions.togglePinned(thread.id)}
          onArchive={() => actions.archive(thread.id)}
        />
      </SidebarMenuItem>
    );
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
                value={sidebar.searchQuery}
                onChange={(event) => {
                  sidebar.setSearchQuery(event.target.value);
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
        <SidebarContent aria-busy={!isDataReady} className="gap-0" onScroll={handleListScroll}>
          {!isDataReady ? null : threads.length === 0 ? (
            <p className="px-4 py-2 text-xs text-sidebar-muted-foreground">
              {sidebar.searchQuery.trim() ? "No matching chats" : "No chats yet"}
            </p>
          ) : (
            <>
              {pinnedThreads.length > 0 ? (
                <SidebarGroup className="px-2 pb-1">
                  <button
                    type="button"
                    aria-expanded={sidebar.pinnedExpanded}
                    className="flex w-full cursor-pointer items-center gap-1.5 px-2 pb-1.5 text-xs font-semibold text-sidebar-foreground/70 transition-colors outline-none hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                    onClick={() => sidebar.setPinnedExpanded(!sidebar.pinnedExpanded)}
                  >
                    <PinIcon className="size-3.5" aria-hidden="true" />
                    Pinned
                    <ChevronUpIcon
                      aria-hidden="true"
                      className={cn(
                        "ml-auto size-3.5 transition-transform duration-200",
                        !sidebar.pinnedExpanded && "rotate-180",
                      )}
                    />
                  </button>
                  {sidebar.pinnedExpanded ? (
                    <SidebarGroupContent>
                      <SidebarMenu>{pinnedThreads.map(renderThread)}</SidebarMenu>
                    </SidebarGroupContent>
                  ) : null}
                </SidebarGroup>
              ) : null}

              {regularSections.map((section) => (
                <SidebarGroup key={section.id} className="px-2 pb-1">
                  <div className="px-2 pb-1.5 text-sm font-semibold text-sidebar-foreground/60">
                    {section.label}
                  </div>
                  <SidebarGroupContent>
                    <SidebarMenu>{section.threads.map(renderThread)}</SidebarMenu>
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
                    className={cn("size-4", isLoadingMore && "animate-spin text-sidebar-foreground")}
                  />
                  <span className="sr-only">
                    {isLoadingMore ? "Loading more chats" : "More chats load when you scroll"}
                  </span>
                </button>
              ) : null}
            </>
          )}
        </SidebarContent>
      </div>
      <SidebarFooter className="shrink-0 border-sidebar-border p-1">
        <SidebarAccount />
      </SidebarFooter>
    </Sidebar>
  );
}
