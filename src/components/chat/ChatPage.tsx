import { Navigate, useNavigate } from "@tanstack/react-router"
import { LazyMotion, domAnimation } from "motion/react"

import { AppSidebar } from "@/components/AppSidebar"
import { ChatShell, ChatHeaderActions } from "@/components/chat/chatShellChrome"
import { ChatThreadView } from "@/components/chat/ChatThreadView"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
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

  return (
    <LazyMotion features={domAnimation}>
      <SidebarProvider defaultOpen className="h-dvh min-h-0! overflow-hidden">
        <AppSidebar
          threads={threads}
          activeThreadId={activeThread.id}
          onSelectThread={openThread}
          onCreateThread={createNewThread}
          onDeleteThread={removeThread}
        />
        <ChatHeaderActions />
        <ChatShell>
          <SidebarInset className="h-full min-h-0 overflow-hidden bg-background">
            <ChatThreadView
              key={activeThread.id}
              threadId={activeThread.id}
              initialMessages={activeThread.messages}
              onMessagesChange={(messages) =>
                updateThreadMessages(activeThread.id, messages)
              }
              onCreateThread={createNewThread}
            />
          </SidebarInset>
        </ChatShell>
      </SidebarProvider>
    </LazyMotion>
  )
}
