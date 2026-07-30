import { useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { fetchServerSentEvents, useChat } from "@tanstack/ai-react"
import type { UIMessage } from "@tanstack/ai-react"
import { createFileRoute } from "@tanstack/react-router"
import { ClockIcon, PlusIcon, SearchIcon } from "lucide-react"
import { LazyMotion, domAnimation } from "motion/react"
import * as m from "motion/react-m"

import { AppSidebar } from "@/components/AppSidebar"
import { SettingsMenu } from "@/components/SettingsMenu"
import { BouncingDots } from "@/components/chat/BouncingDots"
import { ChatComposer } from "@/components/chat/ChatComposer"
import { ChatEmptyState } from "@/components/chat/ChatEmptyState"
import { ChatMessage } from "@/components/chat/ChatMessage"
import { TimelineMinimap } from "@/components/chat/TimelineMinimap"
import type { TimelineMinimapItem } from "@/components/chat/TimelineMinimap"
import { resolveTimelineMinimapPreviewText } from "@/components/chat/timelineMinimapLogic"
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
import { useMountEffect, useValueEffect } from "@/hooks/useMountEffect"
import { useThreads } from "@/hooks/useThreads"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/")({ component: ChatPage })

/**
 * Chrome buttons hover against either the #161616 chip or the near-black gutter
 * depending on sidebar state, so the lift stays translucent to read on both. The
 * opaque `accent` the button variant defaults to sits only three values above
 * the chip and disappears against it.
 */
const controlButtonClass =
  "pointer-events-auto rounded-md bg-[#161616] text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"

const notchButtonClass =
  "pointer-events-auto rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"

function SidebarControl() {
  const { open } = useSidebar()
  return (
    <div
      className={cn(
        "pointer-events-none fixed top-3 left-3 z-60 flex items-center gap-0.5",
        !open && "rounded-md bg-[#161616] ring-4 ring-[#161616]"
      )}
    >
      <SidebarTrigger
        className={cn(
          "pointer-events-auto text-muted-foreground",
          !open &&
            "hover:rounded-md hover:bg-sidebar-accent hover:text-foreground"
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

/* Matches the gutter around the inset canvas, not the canvas itself. */
const HEADER_NOTCH_FILL = "var(--sidebar)"
const HEADER_NOTCH_STROKE = "rgb(255 255 255 / 10%)"

/**
 * The curve has to break just left of the header buttons, so the notch is
 * anchored to the right edge of the canvas: 0.75rem of gutter + 4.125rem of
 * buttons + the 3.5rem lead-in the path needs before the S bend, less the
 * 11rem the element is wide. The flat tail runs off the right edge.
 */
const HEADER_NOTCH_RIGHT = "calc(0.75rem + 4.125rem + 3.5rem - 11rem)"

/**
 * Skewed S-curve that sweeps the header surface down into the canvas, so the
 * controls read as part of the panel edge rather than a chip floating on it.
 * The skew is applied to the element rather than baked into the path so the
 * curve radii stay circular. Width must stay at 4x height to match the viewBox
 * aspect, otherwise preserveAspectRatio letterboxes the curve.
 *
 * Sits 1px above its containing block so the stroke lands on the edge layer's
 * top border rather than below it.
 */
function ChatHeaderNotch() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 128 32"
      style={{ right: HEADER_NOTCH_RIGHT }}
      className="pointer-events-none absolute -top-px h-11 w-44 origin-top-left skew-x-[30deg] overflow-visible"
    >
      <path
        d="M0,0c5.9,0,10.7,4.8,10.7,10.7v10.7c0,5.9,4.8,10.7,10.7,10.7H128V0Z"
        fill={HEADER_NOTCH_FILL}
      />
      <path
        d="M0,0c5.9,0,10.7,4.8,10.7,10.7v10.7c0,5.9,4.8,10.7,10.7,10.7H128"
        fill="none"
        stroke={HEADER_NOTCH_STROKE}
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/**
 * Hairline, corner radius and notch drawn as one absolutely positioned layer
 * rather than a border on the shell plus a fixed SVG. Because it shares the
 * shell's box it inherits the sidebar's inset animation, so the flat run and
 * the curve stay joined for the whole 200ms and fade in as a single piece. A
 * border on the shell instead popped in full width at the top of the viewport
 * and only met the fixed notch on the last frame.
 */
function ChatShellEdge({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 z-50 border-t border-l border-white/10 transition-[opacity,border-radius] duration-200 ease-linear",
        visible ? "rounded-tl-2xl opacity-100" : "opacity-0"
      )}
    >
      <ChatHeaderNotch />
    </div>
  )
}

/* #161616, in the comma syntax Motion's colour parser accepts, so the chip can
   fade its alpha out without travelling through another hue. */
const HEADER_CHIP_SURFACE = "rgba(22, 22, 22, 1)"
const HEADER_CHIP_SURFACE_HIDDEN = "rgba(22, 22, 22, 0)"

/**
 * Off the notch the buttons need their own chip to stand off the canvas; on it
 * the notch already supplies the surface, so the chip dissolves and the row
 * drops 8px into the notch band. Motion drives this because it is a mount-free
 * crossfade with no CSS transition of its own to stay in step with.
 */
function ChatHeaderActions() {
  const { isMobile, open } = useSidebar()
  const onNotch = open && !isMobile

  return (
    <div className="pointer-events-none fixed top-[10px] right-3 z-60">
      <m.div
        className="rounded-lg p-1"
        initial={false}
        animate={{
          y: onNotch ? 8 : 0,
          backgroundColor: onNotch
            ? HEADER_CHIP_SURFACE_HIDDEN
            : HEADER_CHIP_SURFACE,
        }}
        transition={{ duration: 0.2, ease: "linear" }}
      >
        <m.div
          className="flex items-center gap-0.5"
          initial={false}
          animate={{ x: onNotch ? 4 : 0, y: onNotch ? -4 : 0 }}
          transition={{ duration: 0.2, ease: "linear" }}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="History"
            className={notchButtonClass}
          >
            <ClockIcon />
          </Button>
          <SettingsMenu triggerClassName={notchButtonClass} />
        </m.div>
      </m.div>
    </div>
  )
}

function ChatShell({ children }: { children: ReactNode }) {
  const { isMobile, open } = useSidebar()
  const showSidebarEdge = open && !isMobile

  return (
    <div
      data-chat-shell=""
      className={cn(
        "relative flex min-h-0 min-w-0 flex-1 transition-[margin] duration-200 ease-linear",
        showSidebarEdge && "mt-3"
      )}
    >
      <div
        className={cn(
          "relative flex min-h-0 min-w-0 flex-1 overflow-hidden bg-background transition-[border-radius] duration-200 ease-linear",
          showSidebarEdge && "rounded-tl-2xl"
        )}
      >
        {children}
      </div>
      <ChatShellEdge visible={showSidebarEdge} />
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
  )
}

function messageText(message: UIMessage) {
  let text = ""
  for (const part of message.parts) {
    if (part.type !== "text") continue
    text += `${text ? " " : ""}${part.content}`
  }
  return text
}

function deriveTimelineMinimapItems(
  messages: UIMessage[]
): TimelineMinimapItem[] {
  const items: TimelineMinimapItem[] = []

  for (const [index, message] of messages.entries()) {
    if (message.role !== "user") continue

    let assistantText: string | null = null
    for (let nextIndex = index + 1; nextIndex < messages.length; nextIndex++) {
      const next = messages[nextIndex]
      if (next.role === "user") break
      if (next.role === "assistant") {
        assistantText = resolveTimelineMinimapPreviewText(messageText(next))
      }
    }

    items.push({
      id: message.id,
      userText: resolveTimelineMinimapPreviewText(messageText(message)),
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

function scrollToMessage(item: TimelineMinimapItem) {
  const target = document.querySelector(
    `[data-message-id="${CSS.escape(item.id)}"]`
  )
  target?.scrollIntoView({ behavior: "smooth", block: "center" })
}

function pairMessagesWithPreviousUser(messages: UIMessage[]) {
  const pairs: Array<{
    message: UIMessage
    previousUserCreatedAt: UIMessage["createdAt"] | null
  }> = []
  let previousUserCreatedAt: UIMessage["createdAt"] | null = null

  for (const message of messages) {
    pairs.push({ message, previousUserCreatedAt })
    if (message.role === "user") {
      previousUserCreatedAt = message.createdAt ?? null
    }
  }

  return pairs
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

  const activeWorkedMs =
    isLoading && workStartedAt != null ? Date.now() - workStartedAt : null
  const messagePairs = pairMessagesWithPreviousUser(messages)

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
          <div className="flex size-full flex-col items-center overflow-y-auto">
            {/* mt-auto rather than justify-end so the block still scrolls from
                its top on short viewports instead of overflowing out of reach. */}
            <ChatEmptyState
              className="mt-auto pt-20 pb-4"
              onSelectPrompt={fillPrompt}
            />
          </div>
        ) : (
          <MessageScrollerProvider>
            <MessageScroller>
              <MessageScrollerViewport>
                <MessageScrollerContent
                  className={cn("mx-auto w-full max-w-3xl px-4 pt-20 pb-6")}
                >
                  {messagePairs.map(({ message, previousUserCreatedAt }) => {
                    const isStreaming =
                      isLoading &&
                      message.role === "assistant" &&
                      message.id === messages.at(-1)?.id

                    return (
                      <MessageScrollerItem
                        key={message.id}
                        messageId={message.id}
                        data-message-id={message.id}
                      >
                        <ChatMessage
                          message={message}
                          isStreaming={isStreaming}
                          previousUserCreatedAt={previousUserCreatedAt}
                          workedMs={isStreaming ? activeWorkedMs : null}
                        />
                      </MessageScrollerItem>
                    )
                  })}

                  {showPendingDots ? (
                    <MessageScrollerItem messageId="pending-assistant">
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
        aria-hidden="true"
        className="chat-canvas-top-fade pointer-events-none absolute inset-x-0 top-0 z-10 h-20"
      />

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
