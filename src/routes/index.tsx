import { useEffect, useMemo, useRef, useState } from "react"
import { fetchServerSentEvents, useChat } from "@tanstack/ai-react"
import type { UIMessage } from "@tanstack/ai-react"
import { createFileRoute } from "@tanstack/react-router"

import { AppSidebar } from "@/components/AppSidebar"
import { ChatComposer } from "@/components/chat/ChatComposer"
import { ChatEmptyState } from "@/components/chat/ChatEmptyState"
import { ChatMessage } from "@/components/chat/ChatMessage"
import { TimelineMinimap } from "@/components/chat/TimelineMinimap"
import type { TimelineMinimapItem } from "@/components/chat/TimelineMinimap"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useThreads } from "@/hooks/useThreads"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/")({ component: ChatPage })

function SidebarControl() {
  return (
    <div className="pointer-events-none fixed top-[10px] left-3 z-60">
      <SidebarTrigger className="pointer-events-auto text-muted-foreground hover:bg-accent hover:text-foreground" />
    </div>
  )
}

function ChatPage() {
  const {
    activeThread,
    threads,
    selectThread,
    createThread,
    deleteThread,
    updateActiveMessages,
  } = useThreads()

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen className="h-svh min-h-0! overflow-hidden">
        <AppSidebar
          threads={threads}
          activeThreadId={activeThread.id}
          onSelectThread={selectThread}
          onCreateThread={createThread}
          onDeleteThread={deleteThread}
        />
        <SidebarInset className="min-h-0 overflow-hidden bg-background">
          <ChatThreadView
            key={activeThread.id}
            threadId={activeThread.id}
            initialMessages={activeThread.messages}
            onMessagesChange={updateActiveMessages}
          />
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}

function compactMinimapPreview(text: string | null | undefined) {
  const compact = text?.replace(/\s+/g, " ").trim() ?? ""
  return compact.length > 0 ? compact : null
}

function messageText(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.content)
    .join(" ")
}

function deriveTimelineMinimapItems(
  messages: UIMessage[]
): TimelineMinimapItem[] {
  const items: TimelineMinimapItem[] = []

  for (const [index, message] of messages.entries()) {
    if (message.role !== "user") continue

    let assistantText: string | null = null
    for (const next of messages.slice(index + 1)) {
      if (next.role === "user") break
      if (next.role === "assistant") {
        assistantText = compactMinimapPreview(messageText(next))
      }
    }

    items.push({
      id: message.id,
      userText: compactMinimapPreview(messageText(message)),
      assistantText,
    })
  }

  return items
}

function ChatThreadView({
  threadId,
  initialMessages,
  onMessagesChange,
}: {
  threadId: string
  initialMessages: UIMessage[]
  onMessagesChange: (messages: UIMessage[]) => void
}) {
  const [input, setInput] = useState("")
  const [composerOverlayHeight, setComposerOverlayHeight] = useState(120)
  const [workStartedAt, setWorkStartedAt] = useState<number | null>(null)
  const composerOverlayRef = useRef<HTMLDivElement | null>(null)
  const { messages, sendMessage, isLoading, error } = useChat({
    id: threadId,
    initialMessages,
    connection: fetchServerSentEvents("/api/chat"),
  })

  const isEmptyThread = messages.length === 0
  const showEmptyState = isEmptyThread && input.trim().length === 0

  useEffect(() => {
    onMessagesChange(messages)
  }, [messages, onMessagesChange])

  useEffect(() => {
    if (isLoading) {
      setWorkStartedAt((current) => current ?? Date.now())
      return
    }
    setWorkStartedAt(null)
  }, [isLoading])

  useEffect(() => {
    const element = composerOverlayRef.current
    if (!element) return

    const updateHeight = () => {
      setComposerOverlayHeight(element.getBoundingClientRect().height)
    }

    updateHeight()
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updateHeight)
    observer?.observe(element)
    window.addEventListener("resize", updateHeight)

    return () => {
      observer?.disconnect()
      window.removeEventListener("resize", updateHeight)
    }
  }, [])

  const minimapItems = useMemo(
    () => deriveTimelineMinimapItems(messages),
    [messages]
  )

  function submitMessage(content = input.trim()) {
    if (!content || isLoading) return

    setWorkStartedAt(Date.now())
    setInput("")
    void sendMessage(content)
  }

  function scrollToMessage(item: TimelineMinimapItem) {
    const target = document.querySelector(
      `[data-message-id="${CSS.escape(item.id)}"]`
    )
    target?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  const activeWorkedMs =
    isLoading && workStartedAt != null ? Date.now() - workStartedAt : null

  return (
    <div className="chat-surface relative flex h-full min-h-0 flex-col bg-background text-foreground">
      <SidebarControl />

      <main className="relative min-h-0 flex-1">
        {!isEmptyThread && (
          <TimelineMinimap
            items={minimapItems}
            bottomInset={composerOverlayHeight}
            onSelect={scrollToMessage}
          />
        )}

        {showEmptyState ? (
          <div
            className="absolute inset-x-0 top-0 flex items-center justify-center overflow-y-auto"
            style={{ bottom: composerOverlayHeight }}
          >
            <ChatEmptyState
              className="py-10"
              onSelectPrompt={(prompt) => submitMessage(prompt)}
            />
          </div>
        ) : (
          <MessageScrollerProvider autoScroll={!isEmptyThread}>
            <MessageScroller>
              <MessageScrollerViewport>
                <MessageScrollerContent
                  className={cn(
                    "mx-auto w-full max-w-3xl px-4 pt-8 pb-6"
                  )}
                  style={{ paddingBottom: composerOverlayHeight + 24 }}
                >
                  {messages.map((message, index) => {
                    const isStreaming =
                      isLoading &&
                      message.role === "assistant" &&
                      message.id === messages.at(-1)?.id

                    const previousUser = [...messages.slice(0, index)]
                      .reverse()
                      .find((entry) => entry.role === "user")

                    return (
                      <MessageScrollerItem
                        key={message.id}
                        messageId={message.id}
                        scrollAnchor={message.role === "user"}
                        data-message-id={message.id}
                      >
                        <ChatMessage
                          message={message}
                          isStreaming={isStreaming}
                          previousUserCreatedAt={previousUser?.createdAt ?? null}
                          workedMs={isStreaming ? activeWorkedMs : null}
                        />
                      </MessageScrollerItem>
                    )
                  })}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              {!isEmptyThread && <MessageScrollerButton />}
            </MessageScroller>
          </MessageScrollerProvider>
        )}

        <div
          ref={composerOverlayRef}
          data-chat-composer-overlay="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 pt-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pt-2"
        >
          <div className="chat-composer-horizontal-inset w-full">
            <div className="pointer-events-auto relative z-10">
              {error && (
                <p
                  className="mb-2 px-1 text-center text-sm text-destructive"
                  role="alert"
                >
                  {error.message}
                </p>
              )}
              <ChatComposer
                value={input}
                onChange={setInput}
                onSubmit={() => submitMessage()}
                isLoading={isLoading}
                placeholder={
                  isEmptyThread
                    ? "Type your message here..."
                    : "Ask for follow-up changes..."
                }
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
