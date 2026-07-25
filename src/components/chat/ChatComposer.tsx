import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react"
import {
  ChevronDownIcon,
  GlobeIcon,
  LoaderCircleIcon,
  PaperclipIcon,
  ZapIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

interface ChatComposerProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isLoading?: boolean
  disabled?: boolean
  modelLabel?: string
  placeholder?: string
  className?: string
}

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  disabled = false,
  modelLabel = "GPT-5.6 Terra",
  placeholder = "Type your message here...",
  className,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [instantEnabled, setInstantEnabled] = useState(true)
  const [searchEnabled, setSearchEnabled] = useState(false)
  const canSend = value.trim().length > 0 && !isLoading && !disabled

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = "0px"
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
  }, [value])

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
      <div className="chat-composer-glass-host relative z-10 w-full rounded-[22px]">
        <form
          className="mx-auto w-full min-w-0 max-w-3xl"
          data-chat-composer-form="true"
          onSubmit={handleSubmit}
        >
          <div className="group rounded-[22px] p-px transition-colors duration-200">
            <div className="rounded-[20px] transition-[background-color] duration-200">
              <div className="px-3.5 pt-3.5 sm:px-4 sm:pt-4">
                <textarea
                  ref={textareaRef}
                  aria-label="Message"
                  className="max-h-50 min-h-12 w-full resize-none bg-transparent text-[15px] leading-6 text-foreground outline-none placeholder:text-muted-foreground/45 disabled:opacity-60"
                  disabled={disabled || isLoading}
                  onChange={(event) => onChange(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  rows={2}
                  value={value}
                />
              </div>

              <div className="flex min-w-0 items-center gap-2 px-2.5 pb-2.5 sm:px-3 sm:pb-3">
                <button
                  type="button"
                  className="inline-flex min-w-0 max-w-48 shrink items-center gap-1.5 rounded-full px-2 py-1.5 text-sm text-muted-foreground/80 transition-colors hover:bg-accent hover:text-foreground sm:max-w-56 sm:px-3"
                  aria-label="Model"
                >
                  <span className="truncate">{modelLabel}</span>
                  <span
                    className="shrink-0 text-[11px] font-medium tracking-tight text-emerald-500"
                    aria-hidden="true"
                  >
                    $$$
                  </span>
                  <ChevronDownIcon className="size-3 shrink-0 opacity-60" />
                </button>

                <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                  className="relative isolate flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary text-primary-foreground shadow-xs shadow-primary/24 transition-all duration-150 enabled:cursor-pointer enabled:hover:scale-105 enabled:hover:bg-primary/90 active:scale-95 disabled:pointer-events-none disabled:opacity-30 disabled:shadow-none disabled:hover:scale-100 sm:h-8 sm:w-8"
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
            </div>
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
