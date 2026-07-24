import { useState } from "react"
import type { FormEvent, KeyboardEvent } from "react"
import { createCodePlugin } from "@streamdown/code"
import { fetchServerSentEvents, useChat } from "@tanstack/ai-react"
import { createFileRoute } from "@tanstack/react-router"
import {
  ArrowUpIcon,
  BotIcon,
  LoaderCircleIcon,
  MessageSquareIcon,
} from "lucide-react"
import { Streamdown } from "streamdown"

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

const streamdownPlugins = {
  code: createCodePlugin({
    themes: ["github-light", "min-dark"],
  }),
}

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
    <div className="chat-surface dark flex h-svh min-h-0 flex-col bg-[#151515] text-[#ededed]">
      <header className="z-10 shrink-0 border-b border-white/[0.07] bg-[#181818]/95 backdrop-blur supports-backdrop-filter:bg-[#181818]/80">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-3 px-4">
          <div className="flex size-8 items-center justify-center rounded-full border border-white/[0.08] bg-[#232323] text-[#d7d7d7]">
            <BotIcon className="size-4" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">New conversation</h1>
            <p className="text-xs text-[#8b8b8b]">AI assistant</p>
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
                    <div className="mb-5 flex size-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#202020] text-[#d7d7d7] shadow-lg shadow-black/20">
                      <MessageSquareIcon className="size-5" />
                    </div>
                    <h2 className="text-xl font-semibold tracking-tight">
                      What can I help with?
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[#929292]">
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
                          <MessageAvatar className="border border-white/[0.08] bg-[#202020] text-[#bcbcbc]">
                            <BotIcon className="size-4" />
                          </MessageAvatar>
                        )}
                        <MessageContent>
                          <MessageHeader className="text-[#888888]">
                            {isUser ? "You" : "Assistant"}
                          </MessageHeader>
                          <Bubble
                            align={isUser ? "end" : "start"}
                            variant={isUser ? "secondary" : "ghost"}
                          >
                            {message.parts.map((part, index) => {
                              if (part.type === "text") {
                                const isStreaming =
                                  !isUser &&
                                  isLoading &&
                                  message.id === messages.at(-1)?.id

                                return (
                                  <BubbleContent
                                    className={
                                      isUser
                                        ? "border-white/[0.07] bg-[#272727] whitespace-pre-wrap text-[#e7e7e7]"
                                        : "text-[#d7d7d7] [&_[data-streamdown]]:min-w-0"
                                    }
                                    key={`${message.id}-text-${index}`}
                                  >
                                    {isUser ? (
                                      part.content
                                    ) : (
                                      <Streamdown
                                        lineNumbers={false}
                                        mode={
                                          isStreaming ? "streaming" : "static"
                                        }
                                        plugins={streamdownPlugins}
                                      >
                                        {part.content}
                                      </Streamdown>
                                    )}
                                  </BubbleContent>
                                )
                              }

                              if (part.type === "thinking") {
                                return (
                                  <BubbleContent
                                    className="flex items-start gap-2 text-[#858585] italic"
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
                              <MessageFooter className="text-[#777777]">
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
                      <MessageAvatar className="border border-white/[0.08] bg-[#202020] text-[#bcbcbc]">
                        <BotIcon className="size-4" />
                      </MessageAvatar>
                      <MessageContent>
                        <Bubble variant="ghost">
                          <BubbleContent className="text-[#858585]">
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

      <footer className="shrink-0 border-t border-white/[0.07] bg-[#181818]">
        <div className="mx-auto w-full max-w-3xl px-4 py-3">
          {error && (
            <p className="mb-2 px-3 text-sm text-destructive" role="alert">
              {error.message}
            </p>
          )}
          <form
            className="flex items-end gap-2 rounded-3xl border border-white/[0.08] bg-[#222222] p-2 shadow-lg shadow-black/20 transition-shadow focus-within:border-white/[0.14] focus-within:ring-3 focus-within:ring-white/[0.06]"
            onSubmit={handleSubmit}
          >
            <textarea
              aria-label="Message"
              className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-[#ededed] outline-none placeholder:text-[#777777]"
              disabled={isLoading}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message the assistant"
              rows={1}
              value={input}
            />
            <Button
              aria-label="Send message"
              className="mb-0.5 bg-[#ededed] text-[#171717] hover:bg-white"
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
          <p className="mt-2 text-center text-[11px] text-[#707070]">
            AI can make mistakes. Check important information.
          </p>
        </div>
      </footer>
    </div>
  )
}
