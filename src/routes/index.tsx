import { useMemo, useRef, useState } from "react"
import { fetchServerSentEvents, useChat } from "@tanstack/ai-react"
import type { UIMessage } from "@tanstack/ai-react"
import { createFileRoute } from "@tanstack/react-router"
import {
  ClockIcon,
  PlusIcon,
  SearchIcon,
  SlidersHorizontalIcon,
} from "lucide-react"

import { AppSidebar } from "@/components/AppSidebar"
import { BouncingDots } from "@/components/chat/BouncingDots"
import { ChatComposer } from "@/components/chat/ChatComposer"
import { ChatEmptyState } from "@/components/chat/ChatEmptyState"
import { ChatMessage } from "@/components/chat/ChatMessage"
import { TimelineMinimap } from "@/components/chat/TimelineMinimap"
import type { TimelineMinimapItem } from "@/components/chat/TimelineMinimap"
import { Button } from "@/components/ui/button"
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
import { useMountEffect, useValueEffect } from "@/hooks/useMountEffect"
import { useThreads } from "@/hooks/useThreads"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/")({ component: ChatPage })

const controlButtonClass =
  "pointer-events-auto bg-[#161616] rounded-md text-muted-foreground hover:bg-accent hover:text-foreground hover:p-1"

function SidebarControl() {
  const { open } = useSidebar()
  return (
    <div
      className={cn(
        "pointer-events-none fixed top-[10px] left-3 z-60 flex items-center gap-0.5",
        !open && "rounded-md bg-[#161616] ring-4 ring-[#161616]"
      )}
    >
      <SidebarTrigger
        className={cn(
          "pointer-events-auto text-muted-foreground",
          !open && "hover:rounded-md hover:bg-accent hover:text-foreground"
        )}
      />
      {!open && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Search"
            className={controlButtonClass}
          >
            <SearchIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="New chat"
            className={controlButtonClass}
          >
            <PlusIcon />
          </Button>
        </>
      )}
    </div>
  )
}

function ChatHeaderActions() {
  return (
    <div className="pointer-events-none fixed top-[10px] right-3 z-60 flex items-center gap-0.5 rounded-lg bg-[#161616] p-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="History"
        className={controlButtonClass}
      >
        <ClockIcon />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Settings"
        className={controlButtonClass}
      >
        <SlidersHorizontalIcon />
      </Button>
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
      <SidebarProvider defaultOpen className="h-dvh min-h-0! overflow-hidden">
        <AppSidebar
          threads={threads}
          activeThreadId={activeThread.id}
          onSelectThread={selectThread}
          onCreateThread={createThread}
          onDeleteThread={deleteThread}
        />
        <ChatHeaderActions />
        <SidebarInset className="h-full min-h-0 overflow-hidden bg-background">
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

function focusComposerInput() {
  document
    .querySelector<HTMLTextAreaElement>("[data-chat-composer-input]")
    ?.focus()
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
  const [composerHeight, setComposerHeight] = useState(148)
  const [workStartedAt, setWorkStartedAt] = useState<number | null>(null)
  const composerOverlayRef = useRef<HTMLDivElement | null>(null)

  const { messages, sendMessage, isLoading, error } = useChat({
    id: threadId,
    initialMessages,
    connection: fetchServerSentEvents("/api/chat"),
  })

  useValueEffect(messages, onMessagesChange)

  useMountEffect(() => {
    const element = composerOverlayRef.current
    if (!element) return

    const updateHeight = () => {
      setComposerHeight(Math.ceil(element.getBoundingClientRect().height))
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
  })

  const isEmptyThread = messages.length === 0
  const showEmptyState = isEmptyThread && input.trim().length === 0
  const lastMessage = messages.at(-1)
  const showPendingDots = isLoading && lastMessage?.role === "user"

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

  function fillPrompt(prompt: string) {
    setInput(prompt)
    queueMicrotask(focusComposerInput)
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
    <div className="chat-surface absolute inset-0 min-h-0 overflow-hidden bg-background text-foreground">
      <SidebarControl />

      <div
        className="absolute inset-0 z-0 overflow-hidden"
        style={{ paddingBottom: Math.max(0, composerHeight - 16) }}
      >
        {!isEmptyThread && (
          <TimelineMinimap
            items={minimapItems}
            bottomInset={0}
            onSelect={scrollToMessage}
          />
        )}

        {showEmptyState ? (
          <div className="flex size-full items-center justify-center overflow-y-auto">
            <ChatEmptyState className="py-10" onSelectPrompt={fillPrompt} />
          </div>
        ) : (
          <MessageScrollerProvider autoScroll={!isEmptyThread}>
            <MessageScroller>
              <MessageScrollerViewport>
                <MessageScrollerContent
                  className={cn("mx-auto w-full max-w-3xl px-4 pt-8 pb-6")}
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
                          previousUserCreatedAt={
                            previousUser?.createdAt ?? null
                          }
                          workedMs={isStreaming ? activeWorkedMs : null}
                        />
                      </MessageScrollerItem>
                    )
                  })}

                  {showPendingDots ? (
                    <MessageScrollerItem
                      messageId="pending-assistant"
                      scrollAnchor={false}
                    >
                      <BouncingDots className="px-1" />
                    </MessageScrollerItem>
                  ) : null}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              {!isEmptyThread && <MessageScrollerButton />}
            </MessageScroller>
          </MessageScrollerProvider>
        )}
      </div>

      <div
        ref={composerOverlayRef}
        data-chat-composer-overlay="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 translate-y-4 pt-2"
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
    </div>
  )
}
