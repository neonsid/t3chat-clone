import { useId, useRef, useState } from "react"
import type { KeyboardEvent } from "react"
import { AnimatePresence, useReducedMotion } from "motion/react"
import * as m from "motion/react-m"

import { REASONING_EFFORTS } from "@/components/chat/composer/constants"
import type {
  ReasoningEffort,
  ReasoningEffortOption,
} from "@/components/chat/composer/constants"
import { Tooltip } from "@/components/shared/motion/tooltip"
import { useWindowEvent } from "@/hooks/useWindowEvent"
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

function ReasoningEffortIcon({
  option,
  className,
}: {
  option: ReasoningEffortOption
  className?: string
}) {
  if (option.icon.kind === "component") {
    const Icon = option.icon.component
    return <Icon className={className} />
  }

  return <BrainAssetIcon src={option.icon.src} className={className} />
}

export type { ReasoningEffort } from "@/components/chat/composer/constants"

type ReasoningEffortSelectProps = {
  value: ReasoningEffort
  supportedEfforts: ReadonlyArray<ReasoningEffort>
  onValueChange: (value: ReasoningEffort) => void
  disabled?: boolean
  className?: string
}

export function ReasoningEffortSelect({
  value,
  supportedEfforts,
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
  const availableOptions = REASONING_EFFORTS.filter((option) =>
    supportedEfforts.includes(option.value)
  )
  const selectedIndex = Math.max(
    availableOptions.findIndex((option) => option.value === value),
    0
  )
  const selectedOption = availableOptions[selectedIndex]
  useWindowEvent("pointerdown", (event) => {
    if (open && !rootRef.current?.contains(event.target as Node)) setOpen(false)
  })
  useWindowEvent("keydown", (event) => {
    if (!open || event.key !== "Escape") return
    setOpen(false)
    triggerRef.current?.focus()
  })

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
      openAndFocus(availableOptions.length - 1)
    }
  }

  function handleListKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    let nextIndex = focusedIndex
    if (event.key === "ArrowDown") {
      nextIndex = (focusedIndex + 1) % availableOptions.length
    } else if (event.key === "ArrowUp") {
      nextIndex =
        (focusedIndex - 1 + availableOptions.length) % availableOptions.length
    } else if (event.key === "Home") {
      nextIndex = 0
    } else if (event.key === "End") {
      nextIndex = availableOptions.length - 1
    } else {
      return
    }

    event.preventDefault()
    setFocusedIndex(nextIndex)
    optionRefs.current[nextIndex]?.focus()
  }

  function selectOption(option: ReasoningEffortOption) {
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
          <ReasoningEffortIcon option={selectedOption} className="size-4" />
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
              {availableOptions.map((option, index) => {
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
                        if (
                          element &&
                          focusMenuOnOpen.current &&
                          index === focusedIndex
                        ) {
                          focusMenuOnOpen.current = false
                          element.focus()
                        }
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
                      <ReasoningEffortIcon
                        option={option}
                        className="size-4 shrink-0"
                      />
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
