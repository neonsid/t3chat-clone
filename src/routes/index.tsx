import { useState } from "react"
import type { FormEvent, KeyboardEvent } from "react"
import { fetchServerSentEvents, useChat } from "@tanstack/ai-react"
import { createFileRoute } from "@tanstack/react-router"
import {
  ArrowUpIcon,
  BotIcon,
  LoaderCircleIcon,
  MessageSquareIcon,
} from "lucide-react"

import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"

export const Route = createFileRoute("/")({ component: ChatPage })

function ChatPage() {
  const [input, setInput] = useState("")
  const { messages, sendMessage, isLoading, error } = useChat({
    connection: fetchServerSentEvents("/api/chat"),
  })

  function submitMessage() {
    const content = input.trim()

    if (!content || isLoading) return

    setInput("")
    void sendMessage(content)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submitMessage()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      submitMessage()
    }
  }

  const showThinking = isLoading && messages.at(-1)?.role !== "assistant"

  return (
    <div className="flex h-svh min-h-0 flex-col bg-muted/20">
      <header className="z-10 shrink-0 border-b bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/75">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-3 px-4">
          <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <BotIcon className="size-4" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">New conversation</h1>
            <p className="text-xs text-muted-foreground">AI assistant</p>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1">
        <MessageScrollerProvider autoScroll>
          <MessageScroller>
            <MessageScrollerViewport>
              <MessageScrollerContent
                className={
                  messages.length === 0
                    ? "mx-auto w-full max-w-3xl justify-center px-4 py-8"
                    : "mx-auto w-full max-w-3xl px-4 py-8"
                }
              >
                {messages.length === 0 && (
                  <div className="mx-auto flex max-w-md flex-col items-center text-center">
                    <div className="mb-5 flex size-12 items-center justify-center rounded-2xl border bg-background shadow-sm">
                      <MessageSquareIcon className="size-5" />
                    </div>
                    <h2 className="text-xl font-semibold tracking-tight">
                      What can I help with?
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Ask a question, explore an idea, or get help with
                      something you&apos;re working on.
                    </p>
                  </div>
                )}

                {messages.map((message) => {
                  const isUser = message.role === "user"

                  return (
                    <MessageScrollerItem
                      key={message.id}
                      messageId={message.id}
                      scrollAnchor={isUser}
                    >
                      <Message align={isUser ? "end" : "start"}>
                        {!isUser && (
                          <MessageAvatar>
                            <BotIcon className="size-4" />
                          </MessageAvatar>
                        )}
                        <MessageContent>
                          <MessageHeader>
                            {isUser ? "You" : "Assistant"}
                          </MessageHeader>
                          <Bubble
                            align={isUser ? "end" : "start"}
                            variant={isUser ? "default" : "secondary"}
                          >
                            {message.parts.map((part, index) => {
                              if (part.type === "text") {
                                return (
                                  <BubbleContent
                                    className="whitespace-pre-wrap"
                                    key={`${message.id}-text-${index}`}
                                  >
                                    {part.content}
                                  </BubbleContent>
                                )
                              }

                              if (part.type === "thinking") {
                                return (
                                  <BubbleContent
                                    className="flex items-start gap-2 text-muted-foreground italic"
                                    key={`${message.id}-thinking-${index}`}
                                  >
                                    <LoaderCircleIcon className="mt-0.5 size-4 animate-spin" />
                                    <span>{part.content || "Thinking…"}</span>
                                  </BubbleContent>
                                )
                              }

                              return null
                            })}
                          </Bubble>
                          {isLoading &&
                            !isUser &&
                            message.id === messages.at(-1)?.id && (
                              <MessageFooter>
                                <span role="status">Generating…</span>
                              </MessageFooter>
                            )}
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>
                  )
                })}

                {showThinking && (
                  <MessageScrollerItem messageId="assistant-thinking">
                    <Message>
                      <MessageAvatar>
                        <BotIcon className="size-4" />
                      </MessageAvatar>
                      <MessageContent>
                        <Bubble variant="secondary">
                          <BubbleContent>
                            <span className="flex items-center gap-2">
                              <LoaderCircleIcon className="size-4 animate-spin" />
                              <span className="sr-only">
                                Assistant is thinking
                              </span>
                              <span aria-hidden="true">Thinking…</span>
                            </span>
                          </BubbleContent>
                        </Bubble>
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                )}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>
      </main>

      <footer className="shrink-0 border-t bg-background">
        <div className="mx-auto w-full max-w-3xl px-4 py-3">
          {error && (
            <p className="mb-2 px-3 text-sm text-destructive" role="alert">
              {error.message}
            </p>
          )}
          <form
            className="flex items-end gap-2 rounded-3xl border bg-transparent p-2 shadow-sm transition-shadow focus-within:ring-3 focus-within:ring-ring/30"
            onSubmit={handleSubmit}
          >
            <textarea
              aria-label="Message"
              className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
              disabled={isLoading}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message the assistant"
              rows={1}
              value={input}
            />
            <Button
              aria-label="Send message"
              className="mb-0.5"
              disabled={!input.trim() || isLoading}
              size="icon"
              type="submit"
            >
              {isLoading ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <ArrowUpIcon />
              )}
            </Button>
          </form>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            AI can make mistakes. Check important information.
          </p>
        </div>
      </footer>
    </div>
  )
}
