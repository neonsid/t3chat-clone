import { useEffect, useMemo, useRef, useState } from "react"
import { fetchServerSentEvents, useChat } from "@tanstack/ai-react"
import type { UIMessage } from "@tanstack/ai-react"
import { createFileRoute } from "@tanstack/react-router"

import { AppSidebar } from "@/components/AppSidebar"
import { ChatComposer } from "@/components/chat/ChatComposer"
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
  useSidebar,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useDraftHeroTransition } from "@/hooks/useDraftHeroTransition"
import { useThreads } from "@/hooks/useThreads"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/")({ component: ChatPage })

function CollapsedSidebarControl() {
  const { open, isMobile, openMobile } = useSidebar()
  const visible = isMobile ? !openMobile : !open
  if (!visible) return null

  return (
    <div className="pointer-events-none absolute top-0 left-0 z-30 flex h-12 items-center px-3">
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

  const isDraftHeroState = messages.length === 0
  const [
    attachDraftHeroTransitionGroupRef,
    attachDraftHeroComposerAnchorRef,
    captureComposerRect,
  ] = useDraftHeroTransition(isDraftHeroState)

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
  }, [isDraftHeroState])

  const minimapItems = useMemo(
    () => deriveTimelineMinimapItems(messages),
    [messages]
  )

  function submitMessage() {
    const content = input.trim()
    if (!content || isLoading) return

    captureComposerRect()
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
      <CollapsedSidebarControl />

      <main className="relative min-h-0 flex-1">
        {!isDraftHeroState && (
          <TimelineMinimap
            items={minimapItems}
            bottomInset={composerOverlayHeight}
            onSelect={scrollToMessage}
          />
        )}

        <MessageScrollerProvider autoScroll={!isDraftHeroState}>
          <MessageScroller>
            <MessageScrollerViewport>
              <MessageScrollerContent
                className={cn(
                  "mx-auto w-full max-w-3xl px-4",
                  isDraftHeroState ? "justify-center py-8" : "pt-8 pb-6"
                )}
                style={
                  isDraftHeroState
                    ? undefined
                    : { paddingBottom: composerOverlayHeight + 24 }
                }
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
            {!isDraftHeroState && <MessageScrollerButton />}
          </MessageScroller>
        </MessageScrollerProvider>

        <div
          ref={composerOverlayRef}
          data-chat-composer-overlay="true"
          className={
            isDraftHeroState
              ? "pointer-events-none absolute inset-0 z-20 flex items-center"
              : "pointer-events-none absolute inset-x-0 bottom-0 z-20 pt-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pt-2"
          }
        >
          <div
            ref={attachDraftHeroTransitionGroupRef}
            className="chat-composer-horizontal-inset w-full"
          >
            <div className="pointer-events-auto relative z-10">
              {isDraftHeroState && (
                <div className="absolute inset-x-0 bottom-full z-0">
                  <div className="pb-8">
                    <h1 className="mx-auto w-full max-w-5xl text-center text-2xl font-normal tracking-tight text-foreground sm:text-3xl">
                      What can I help with?
                    </h1>
                  </div>
                </div>
              )}

              <div ref={attachDraftHeroComposerAnchorRef} className="relative">
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
                  onSubmit={submitMessage}
                  isLoading={isLoading}
                  placeholder={
                    isDraftHeroState
                      ? "Ask anything..."
                      : "Ask for follow-up changes..."
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
