import { useEffect, useId, useRef, useState } from "react"
import type { KeyboardEvent } from "react"
import { ZapIcon } from "lucide-react"
import { AnimatePresence, useReducedMotion } from "motion/react"
import * as m from "motion/react-m"

import { Tooltip } from "@/components/motion/tooltip"
import { EASE_OUT } from "@/lib/ease"
import { cn } from "@/lib/utils"

function BrainAssetIcon({
  src,
  className,
}: {
  src: string
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block bg-current", className)}
      style={{
        maskImage: `url("${src}")`,
        maskPosition: "center",
        maskRepeat: "no-repeat",
        maskSize: "contain",
        WebkitMaskImage: `url("${src}")`,
        WebkitMaskPosition: "center",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
      }}
    />
  )
}

function BrainIconLow({ className }: { className?: string }) {
  return <BrainAssetIcon src="/BrainIconLow.svg" className={className} />
}

function BrainIconMedium({ className }: { className?: string }) {
  return <BrainAssetIcon src="/BrainIconMedium.svg" className={className} />
}

function BrainIconHigh({ className }: { className?: string }) {
  return <BrainAssetIcon src="/BrainIconHigh.svg" className={className} />
}

const REASONING_EFFORTS = [
  { value: "instant", label: "Instant", icon: ZapIcon },
  { value: "low", label: "Low", icon: BrainIconLow },
  { value: "medium", label: "Medium", icon: BrainIconMedium },
  { value: "high", label: "High", icon: BrainIconHigh },
] as const

export type ReasoningEffort = (typeof REASONING_EFFORTS)[number]["value"]

type ReasoningEffortSelectProps = {
  value: ReasoningEffort
  onValueChange: (value: ReasoningEffort) => void
  disabled?: boolean
  className?: string
}

export function ReasoningEffortSelect({
  value,
  onValueChange,
  disabled = false,
  className,
}: ReasoningEffortSelectProps) {
  const [open, setOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const reduceMotion = useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const focusMenuOnOpen = useRef(false)
  const listboxId = useId()
  const selectedIndex = Math.max(
    REASONING_EFFORTS.findIndex((option) => option.value === value),
    0
  )
  const selectedOption = REASONING_EFFORTS[selectedIndex]
  const SelectedIcon = selectedOption.icon

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return
      setOpen(false)
      triggerRef.current?.focus()
    }

    window.addEventListener("pointerdown", handlePointerDown)
    window.addEventListener("keydown", handleEscape)
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown)
      window.removeEventListener("keydown", handleEscape)
    }
  }, [open])

  useEffect(() => {
    if (!open || !focusMenuOnOpen.current) return
    focusMenuOnOpen.current = false
    optionRefs.current[focusedIndex]?.focus()
  }, [focusedIndex, open])

  function openAndFocus(index: number) {
    setFocusedIndex(index)
    focusMenuOnOpen.current = true
    setOpen(true)
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      openAndFocus(selectedIndex)
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      openAndFocus(REASONING_EFFORTS.length - 1)
    }
  }

  function handleListKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    let nextIndex = focusedIndex
    if (event.key === "ArrowDown") {
      nextIndex = (focusedIndex + 1) % REASONING_EFFORTS.length
    } else if (event.key === "ArrowUp") {
      nextIndex =
        (focusedIndex - 1 + REASONING_EFFORTS.length) % REASONING_EFFORTS.length
    } else if (event.key === "Home") {
      nextIndex = 0
    } else if (event.key === "End") {
      nextIndex = REASONING_EFFORTS.length - 1
    } else {
      return
    }

    event.preventDefault()
    setFocusedIndex(nextIndex)
    optionRefs.current[nextIndex]?.focus()
  }

  function selectOption(option: (typeof REASONING_EFFORTS)[number]) {
    onValueChange(option.value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div
      ref={rootRef}
      className={cn("relative shrink-0", className)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <Tooltip content="Set reasoning effort">
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={handleTriggerKeyDown}
          className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-accent px-2.5 py-1.5 text-sm text-foreground transition-colors hover:bg-accent/80 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
        >
          <SelectedIcon className="size-4" />
          <span>{selectedOption.label}</span>
        </button>
      </Tooltip>

      <AnimatePresence>
        {open ? (
          <m.div
            initial={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 8, scale: 0.96, filter: "blur(4px)" }
            }
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              filter: "blur(0px)",
            }}
            exit={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 5, scale: 0.97, filter: "blur(3px)" }
            }
            transition={{ duration: 0.16, ease: EASE_OUT }}
            className="dropdown-glass absolute bottom-full left-0 z-50 mb-2 w-52 origin-bottom-left overflow-hidden rounded-xl p-1"
          >
            <ul
              id={listboxId}
              role="listbox"
              aria-label="Reasoning effort"
              onKeyDown={handleListKeyDown}
            >
              {REASONING_EFFORTS.map((option, index) => {
                const Icon = option.icon
                const selected = option.value === value

                return (
                  <m.li
                    key={option.value}
                    initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.14,
                      delay: reduceMotion ? 0 : index * 0.025,
                      ease: EASE_OUT,
                    }}
                  >
                    <button
                      ref={(element) => {
                        optionRefs.current[index] = element
                      }}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onFocus={() => setFocusedIndex(index)}
                      onClick={() => selectOption(option)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
                        selected && "bg-accent/70"
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span>{option.label}</span>
                    </button>
                  </m.li>
                )
              })}
            </ul>
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
