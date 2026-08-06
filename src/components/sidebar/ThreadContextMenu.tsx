import {
  ArchiveIcon,
  DownloadIcon,
  ExternalLinkIcon,
  PencilIcon,
  PinIcon,
  RefreshCwIcon,
  Share2Icon,
  Trash2Icon,
} from "lucide-react"

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/shared/motion/context-menu"
import type { ContextMenuTriggerProps } from "@/components/shared/motion/context-menu"
import { ContextMenuItemList } from "@/components/shared/motion/context-menu-item-list"
import type { ContextMenuItemData } from "@/components/shared/motion/context-menu-item-list"
import type { ChatThread } from "@/lib/threads"
import { cn } from "@/lib/utils"

type ThreadContextMenuActions = {
  delete: (threadId: string) => void
  togglePinned: (threadId: string) => void
  archive: (threadId: string) => void
  rename: (threadId: string, title: string) => void
  regenerateTitle: (threadId: string) => void
}

type ThreadContextMenuProps = {
  thread: ChatThread
  actions: ThreadContextMenuActions
  children: ContextMenuTriggerProps["children"]
}

function getThreadText(thread: ChatThread) {
  const sections: string[] = []

  for (const message of thread.messages) {
    let text = ""
    for (const part of message.parts) {
      if (part.type === "text") text += part.content
    }
    if (text) {
      sections.push(
        `## ${message.role === "user" ? "You" : "Assistant"}\n\n${text}`
      )
    }
  }

  return sections.join("\n\n")
}

function exportThread(thread: ChatThread) {
  const blob = new Blob([`# ${thread.title}\n\n${getThreadText(thread)}\n`], {
    type: "text/markdown;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${
    thread.title
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "chat"
  }.md`
  link.click()
  URL.revokeObjectURL(url)
}

async function shareThread(thread: ChatThread) {
  const url = new URL(`/chat/${thread.id}`, window.location.origin).toString()
  const share = Reflect.get(navigator, "share")
  if (typeof share === "function") {
    await share.call(navigator, { title: thread.title, url })
    return
  }
  await navigator.clipboard.writeText(url)
}

function createThreadContextMenuItems(
  thread: ChatThread,
  actions: ThreadContextMenuActions
): ContextMenuItemData[] {
  const isPinned = Boolean(thread.pinnedAt)

  return [
    {
      id: "pin",
      label: isPinned ? "Unpin" : "Pin",
      icon: <PinIcon className={cn("size-4", isPinned && "fill-current")} />,
      onSelect: () => actions.togglePinned(thread.id),
    },
    {
      id: "share",
      label: "Share",
      icon: <Share2Icon className="size-4" />,
      onSelect: () => void shareThread(thread).catch(() => undefined),
    },
    {
      id: "open-new-tab",
      label: "Open in New Tab",
      icon: <ExternalLinkIcon className="size-4" />,
      onSelect: () =>
        window.open(`/chat/${thread.id}`, "_blank", "noopener,noreferrer"),
    },
    {
      id: "rename",
      label: "Rename",
      icon: <PencilIcon className="size-4" />,
      onSelect: () => {
        const title = window.prompt("Rename chat", thread.title)
        if (title != null) actions.rename(thread.id, title)
      },
    },
    {
      id: "regenerate-title",
      label: "Regenerate Title",
      icon: <RefreshCwIcon className="size-4" />,
      onSelect: () => actions.regenerateTitle(thread.id),
    },
    {
      id: "export",
      label: "Export",
      icon: <DownloadIcon className="size-4" />,
      onSelect: () => exportThread(thread),
    },
    {
      id: "archive",
      label: "Archive",
      icon: <ArchiveIcon className="size-4" />,
      onSelect: () => actions.archive(thread.id),
    },
    {
      id: "delete",
      label: "Permanently Delete",
      icon: <Trash2Icon className="size-4" />,
      tone: "destructive",
      onSelect: () => actions.delete(thread.id),
    },
  ]
}

export function ThreadContextMenu({
  thread,
  actions,
  children,
}: ThreadContextMenuProps) {
  const menuItems = createThreadContextMenuItems(thread, actions)

  return (
    <ContextMenu>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
      <ContextMenuContent
        ariaLabel={`${thread.title} actions`}
        className="w-44 min-w-0 bg-popover px-1 [&_[data-context-menu-item=true]]:py-1.5"
      >
        <ContextMenuItemList items={menuItems} />
      </ContextMenuContent>
    </ContextMenu>
  )
}
