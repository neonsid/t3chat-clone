import { Navigate, useNavigate } from "@tanstack/react-router"
import { LazyMotion, domAnimation } from "motion/react"

import {
  ChatHeaderActions,
  ChatShell,
} from "@/components/chat/shell/ChatShellChrome"
import { ChatThreadView } from "@/components/chat/thread/ChatThreadView"
import { AppSidebar } from "@/components/sidebar/AppSidebar"
import { SidebarInset, SidebarProvider } from "@/components/shared/ui/sidebar"
import { useThreads } from "@/hooks/useThreads"

export function ChatPage({ threadId }: { threadId: string }) {
  const navigate = useNavigate()
  const {
    activeThread,
    threads,
    selectThread,
    createThread,
    deleteThread,
    updateThreadMessages,
    updateThreadGenerationStats,
    toggleThreadPinned,
    archiveThread,
    renameThread,
    regenerateThreadTitle,
  } = useThreads(threadId)

  if (activeThread.id !== threadId) {
    return (
      <Navigate
        to="/chat/$threadId"
        params={{ threadId: activeThread.id }}
        replace
      />
    )
  }

  function openThread(nextThreadId: string) {
    selectThread(nextThreadId)
    void navigate({
      to: "/chat/$threadId",
      params: { threadId: nextThreadId },
    })
  }

  function createNewThread() {
    const thread = createThread()
    void navigate({
      to: "/chat/$threadId",
      params: { threadId: thread.id },
    })
  }

  function removeThread(removedThreadId: string) {
    const nextThread = deleteThread(removedThreadId)
    if (removedThreadId !== activeThread.id) return

    void navigate({
      to: "/chat/$threadId",
      params: { threadId: nextThread.id },
      replace: true,
    })
  }

  function archiveChat(archivedThreadId: string) {
    const nextThread = archiveThread(archivedThreadId)
    if (archivedThreadId !== activeThread.id || !nextThread) return

    void navigate({
      to: "/chat/$threadId",
      params: { threadId: nextThread.id },
      replace: true,
    })
  }

  return (
    <LazyMotion features={domAnimation}>
      <SidebarProvider defaultOpen className="h-dvh min-h-0! overflow-hidden">
        <AppSidebar
          threads={threads}
          activeThreadId={activeThread.id}
          actions={{
            select: openThread,
            create: createNewThread,
            delete: removeThread,
            togglePinned: toggleThreadPinned,
            archive: archiveChat,
            rename: renameThread,
            regenerateTitle: regenerateThreadTitle,
          }}
        />
        <ChatHeaderActions />
        <ChatShell>
          <SidebarInset className="h-full min-h-0 overflow-hidden bg-background">
            <ChatThreadView
              key={activeThread.id}
              threadId={activeThread.id}
              initialMessages={activeThread.messages}
              generationStats={activeThread.generationStats ?? {}}
              onMessagesChange={(messages) =>
                updateThreadMessages(activeThread.id, messages)
              }
              onGenerationStatsChange={(messageId, generationStats) =>
                updateThreadGenerationStats(
                  activeThread.id,
                  messageId,
                  generationStats
                )
              }
              onCreateThread={createNewThread}
            />
          </SidebarInset>
        </ChatShell>
      </SidebarProvider>
    </LazyMotion>
  )
}
