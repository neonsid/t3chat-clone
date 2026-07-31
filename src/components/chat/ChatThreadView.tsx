import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { fetchServerSentEvents, useChat } from "@tanstack/ai-react";
import type { UIMessage } from "@tanstack/ai-react";

import { BouncingDots } from "@/components/chat/BouncingDots";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatEmptyState } from "@/components/chat/ChatEmptyState";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { SidebarControl } from "@/components/chat/chatShellChrome";
import {
  deriveTimelineMinimapItems,
  findLastUserMessageId,
  focusComposerInput,
  pairMessagesWithPreviousUser,
} from "@/components/chat/chatThreadLogic";
import { TimelineMinimap } from "@/components/chat/TimelineMinimap";
import type { TimelineMinimapItem } from "@/components/chat/TimelineMinimap";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScroller,
} from "@/components/ui/message-scroller";
import { useMountEffect, useValueEffect } from "@/hooks/useMountEffect";
import { cn } from "@/lib/utils";

/**
 * When autoScroll is off, the scroller's one-shot defaultScrollPosition="end"
 * can land short because message items use content-visibility placeholders until
 * painted. Re-scroll after layout settles so the last assistant message is visible
 * on thread load. Runs once per thread (or when a thread gains its first message),
 * not when streaming ends, so a user who scrolled up during a response stays put.
 */
function MessageScrollerEnsureEnd({
  threadId,
  hasMessages,
}: {
  threadId: string;
  hasMessages: boolean;
}) {
  const { scrollToEnd } = useMessageScroller();

  useLayoutEffect(() => {
    if (!hasMessages) return;

    scrollToEnd({ behavior: "auto" });

    let frame = 0;
    const timeout = window.setTimeout(() => {
      scrollToEnd({ behavior: "auto" });
      frame = requestAnimationFrame(() => scrollToEnd({ behavior: "auto" }));
    }, 120);

    return () => {
      window.clearTimeout(timeout);
      cancelAnimationFrame(frame);
    };
  }, [threadId, hasMessages, scrollToEnd]);

  return null;
}

function ChatTimelineMinimap({
  items,
  bottomInset,
}: {
  items: TimelineMinimapItem[];
  bottomInset: number;
}) {
  const { scrollToMessage } = useMessageScroller();

  return (
    <TimelineMinimap
      items={items}
      bottomInset={bottomInset}
      onSelect={(item) => {
        scrollToMessage(item.id, {
          align: "center",
          behavior: "smooth",
        });
      }}
    />
  );
}

export function ChatThreadView({
  threadId,
  initialMessages,
  onMessagesChange,
  onCreateThread,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  onMessagesChange: (messages: UIMessage[]) => void;
  onCreateThread: () => void;
}) {
  const [input, setInput] = useState("");
  const [composerHeight, setComposerHeight] = useState(148);
  const [workStartedAt, setWorkStartedAt] = useState<number | null>(null);
  const composerOverlayRef = useRef<HTMLDivElement | null>(null);

  const { messages, sendMessage, stop, isLoading, error } = useChat({
    id: threadId,
    initialMessages,
    connection: fetchServerSentEvents("/api/chat"),
  });

  useValueEffect(messages, onMessagesChange);

  useMountEffect(() => {
    const element = composerOverlayRef.current;
    if (!element) return;

    const updateHeight = () => {
      setComposerHeight(Math.ceil(element.getBoundingClientRect().height));
    };

    updateHeight();
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateHeight);
    observer?.observe(element);
    window.addEventListener("resize", updateHeight);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  });

  const isEmptyThread = messages.length === 0;
  const showEmptyState = isEmptyThread && input.trim().length === 0;
  const lastMessage = messages.at(-1);
  const showPendingDots = isLoading && lastMessage?.role === "user";

  const minimapItems = useMemo(() => deriveTimelineMinimapItems(messages), [messages]);

  function submitMessage(content = input.trim()) {
    if (!content || isLoading) return;

    setWorkStartedAt(Date.now());
    setInput("");
    void sendMessage(content);
  }

  function fillPrompt(prompt: string) {
    setInput(prompt);
    queueMicrotask(focusComposerInput);
  }

  const activeWorkedMs = isLoading && workStartedAt != null ? Date.now() - workStartedAt : null;
  const messagePairs = pairMessagesWithPreviousUser(messages);
  const latestUserMessageId = findLastUserMessageId(messages);

  return (
    <div className="chat-surface absolute inset-0 min-h-0 overflow-hidden bg-background text-foreground">
      <SidebarControl hasConversation={messages.length > 0} onCreateThread={onCreateThread} />

      <MessageScrollerProvider autoScroll={!isLoading} defaultScrollPosition="end">
        <MessageScrollerEnsureEnd threadId={threadId} hasMessages={!isEmptyThread} />
        <div
          className="absolute inset-0 z-0 overflow-hidden"
          style={{ paddingBottom: Math.max(0, composerHeight - 16) }}
        >
          {!isEmptyThread && <ChatTimelineMinimap items={minimapItems} bottomInset={0} />}

          {showEmptyState ? (
            <div className="flex size-full flex-col items-center overflow-y-auto">
              {/* mt-auto rather than justify-end so the block still scrolls from
                  its top on short viewports instead of overflowing out of reach. */}
              <ChatEmptyState className="mt-auto pt-20 pb-4" onSelectPrompt={fillPrompt} />
            </div>
          ) : (
            <MessageScroller>
              <MessageScrollerViewport>
                <MessageScrollerContent
                  aria-busy={isLoading}
                  className={cn("mx-auto w-full max-w-3xl px-4 pt-20 pb-6")}
                >
                  {messagePairs.map(({ message, previousUserCreatedAt }) => {
                    const isStreaming =
                      isLoading &&
                      message.role === "assistant" &&
                      message.id === messages.at(-1)?.id;

                    return (
                      <MessageScrollerItem
                        key={message.id}
                        messageId={message.id}
                        scrollAnchor={
                          isLoading && message.id === latestUserMessageId
                        }
                      >
                        <ChatMessage
                          message={message}
                          isStreaming={isStreaming}
                          previousUserCreatedAt={previousUserCreatedAt}
                          workedMs={isStreaming ? activeWorkedMs : null}
                        />
                      </MessageScrollerItem>
                    );
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
          )}
        </div>
      </MessageScrollerProvider>

      <div
        ref={composerOverlayRef}
        data-chat-composer-overlay="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 translate-y-4 pt-2"
      >
        <div className="chat-composer-horizontal-inset w-full">
          <div className="pointer-events-auto relative z-10">
            {error && (
              <p className="mb-2 px-1 text-center text-sm text-destructive" role="alert">
                {error.message}
              </p>
            )}
            <ChatComposer
              value={input}
              onChange={setInput}
              onSubmit={() => submitMessage()}
              onStop={stop}
              isLoading={isLoading}
              placeholder={
                isEmptyThread ? "Type your message here..." : "Ask for follow-up changes..."
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
