import { LazyMotion, domAnimation } from "motion/react";
import { createFileRoute } from "@tanstack/react-router";

import { AppSidebar } from "@/components/AppSidebar";
import { ChatShell, ChatHeaderActions } from "@/components/chat/chatShellChrome";
import { ChatThreadView } from "@/components/chat/ChatThreadView";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useThreads } from "@/hooks/useThreads";

export const Route = createFileRoute("/")({ component: ChatPage });

function ChatPage() {
  const { activeThread, threads, selectThread, createThread, deleteThread, updateActiveMessages } =
    useThreads();

  return (
    <LazyMotion features={domAnimation}>
      <SidebarProvider defaultOpen className="h-dvh min-h-0! overflow-hidden">
        <AppSidebar
          threads={threads}
          activeThreadId={activeThread.id}
          onSelectThread={selectThread}
          onCreateThread={createThread}
          onDeleteThread={deleteThread}
        />
        <ChatHeaderActions />
        <ChatShell>
          <SidebarInset className="h-full min-h-0 overflow-hidden bg-background">
            <ChatThreadView
              key={activeThread.id}
              threadId={activeThread.id}
              initialMessages={activeThread.messages}
              onMessagesChange={updateActiveMessages}
            />
          </SidebarInset>
        </ChatShell>
      </SidebarProvider>
    </LazyMotion>
  );
}
