import { useRef, useState } from "react"
import type { FormEvent, KeyboardEvent, ReactNode } from "react"
import {
  GlobeIcon,
  LoaderCircleIcon,
  PaperclipIcon,
  ZapIcon,
} from "lucide-react"

import { ModelPicker } from "@/components/chat/model-picker/ModelPicker"
import { cn } from "@/lib/utils"

interface ChatComposerProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isLoading?: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  disabled = false,
  placeholder = "Type your message here...",
  className,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [instantEnabled, setInstantEnabled] = useState(true)
  const [searchEnabled, setSearchEnabled] = useState(false)
  const canSend = value.trim().length > 0 && !isLoading && !disabled

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSend) return
    onSubmit()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      if (canSend) onSubmit()
    }
  }

  return (
    <div
      className={cn(
        "chat-composer-glass-shell relative mx-auto w-full max-w-3xl",
        className
      )}
    >
      <div className="chat-composer-glass-host relative z-10 w-full overflow-hidden rounded-[18px]">
        <form
          className="mx-auto w-full max-w-3xl min-w-0"
          data-chat-composer-form="true"
          onSubmit={handleSubmit}
        >
          <div className="px-4 pt-4 sm:px-5 sm:pt-5">
            <textarea
              ref={textareaRef}
              data-chat-composer-input="true"
              aria-label="Message"
              className="field-sizing-content max-h-50 min-h-12 w-full resize-none bg-transparent text-[15px] leading-6 text-foreground outline-none placeholder:text-muted-foreground/55 disabled:opacity-60"
              disabled={disabled || isLoading}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={1}
              value={value}
            />
          </div>

          <div className="flex min-w-0 items-center gap-2 px-3 pb-7 sm:px-4 sm:pb-8">
            <ModelPicker />

            <div className="flex min-w-0 flex-1 [scrollbar-width:none] items-center justify-start gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
              <ToolbarToggle
                pressed={instantEnabled}
                onPressedChange={setInstantEnabled}
                label="Instant"
                icon={<ZapIcon className="size-3.5" />}
              />
              <ToolbarToggle
                pressed={searchEnabled}
                onPressedChange={setSearchEnabled}
                label="Search"
                icon={<GlobeIcon className="size-3.5" />}
              />
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-transparent px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Attach"
              >
                <PaperclipIcon className="size-3.5" />
                Attach
              </button>
            </div>

            <button
              type="submit"
              aria-label={isLoading ? "Sending" : "Send message"}
              disabled={!canSend}
              className="relative isolate flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground shadow-xs shadow-primary/24 transition-[color,background-color,opacity,transform,box-shadow] duration-150 active:scale-95 enabled:cursor-pointer enabled:hover:scale-105 enabled:hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-30 disabled:shadow-none disabled:hover:scale-100"
            >
              {isLoading ? (
                <LoaderCircleIcon className="size-3.5 animate-spin" />
              ) : (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M7 11.5V2.5M7 2.5L3 6.5M7 2.5L11 6.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ToolbarToggle({
  pressed,
  onPressedChange,
  label,
  icon,
}: {
  pressed: boolean
  onPressedChange: (next: boolean) => void
  label: string
  icon: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-sm transition-colors",
        pressed
          ? "border-foreground/15 bg-accent text-foreground"
          : "border-border/70 bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  )
}
