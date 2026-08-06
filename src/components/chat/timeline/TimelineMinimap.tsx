import { useCallback, useState } from "react"
import type { MouseEvent as ReactMouseEvent } from "react"

import {
  resolveTimelineMinimapHasPersistentGutter,
  resolveTimelineMinimapHeightStyle,
  resolveTimelineMinimapHitStripWidth,
  resolveTimelineMinimapIndexFromPointer,
  resolveTimelineMinimapInteractiveWidth,
  resolveTimelineMinimapTopPercent,
} from "@/components/chat/timeline/logic"
import { TIMELINE_MINIMAP_MIN_ITEMS } from "@/components/chat/timeline/constants"
import type { TimelineMinimapItem } from "@/components/chat/timeline/types"
import { useMountEffect } from "@/hooks/useMountEffect"
import { cn } from "@/lib/utils"

type TimelineMinimapProps = {
  items: ReadonlyArray<TimelineMinimapItem>
  onSelect: (item: TimelineMinimapItem) => void
  bottomInset?: number
  className?: string
}

function timelineMinimapEventTargetsPreview(target: EventTarget) {
  return (
    target instanceof Element &&
    target.closest("[data-minimap-preview]") !== null
  )
}

function TimelineMinimapContent({
  items,
  onSelect,
  bottomInset = 0,
  className,
}: TimelineMinimapProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [hasPersistentGutter, setHasPersistentGutter] = useState(false)
  const [hitStripWidth, setHitStripWidth] = useState(0)

  useMountEffect(() => {
    const container = document.querySelector<HTMLElement>(
      '[data-slot="message-scroller-viewport"]'
    )

    const measure = () => {
      const viewportWidth =
        container?.getBoundingClientRect().width ?? window.innerWidth
      setHasPersistentGutter(
        resolveTimelineMinimapHasPersistentGutter(viewportWidth)
      )
      setHitStripWidth(resolveTimelineMinimapHitStripWidth(viewportWidth))
    }

    measure()
    window.addEventListener("resize", measure)
    const observer =
      container && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : null
    if (container) observer?.observe(container)

    return () => {
      window.removeEventListener("resize", measure)
      observer?.disconnect()
    }
  })

  const resolvedActiveIndex =
    activeIndex !== null && activeIndex < items.length ? activeIndex : null
  const activeItem =
    resolvedActiveIndex === null ? null : (items[resolvedActiveIndex] ?? null)
  const activeTopPercent =
    resolvedActiveIndex === null
      ? 0
      : resolveTimelineMinimapTopPercent(resolvedActiveIndex, items.length)
  const activeTooltipTranslate =
    resolvedActiveIndex === null
      ? "-50%"
      : resolvedActiveIndex === 0
        ? "0%"
        : resolvedActiveIndex === items.length - 1
          ? "-100%"
          : "-50%"

  const resolveActiveIndexFromPointer = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      const rect = event.currentTarget.getBoundingClientRect()
      return resolveTimelineMinimapIndexFromPointer({
        itemCount: items.length,
        railTop: rect.top,
        railHeight: rect.height,
        pointerY: event.clientY,
      })
    },
    [items.length]
  )

  const updateActiveIndexFromPointer = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      setActiveIndex(resolveActiveIndexFromPointer(event))
    },
    [resolveActiveIndexFromPointer]
  )

  const moveActiveIndex = useCallback(
    (delta: number) => {
      setActiveIndex((current) => {
        const base = current ?? 0
        return Math.max(0, Math.min(items.length - 1, base + delta))
      })
    },
    [items.length]
  )

  const safeBottomInset = Math.max(0, Math.ceil(bottomInset))

  return (
    <div
      className={cn(
        "group/minimap pointer-events-none absolute top-0 left-0 z-40 hidden w-18 [@media(pointer:fine)]:block",
        hasPersistentGutter
          ? "opacity-100"
          : "opacity-0 transition-opacity duration-150 focus-within:opacity-100 hover:opacity-100",
        className
      )}
      data-testid="timeline-minimap"
      data-persistent-gutter={hasPersistentGutter ? "true" : "false"}
      style={{ bottom: safeBottomInset }}
    >
      <div className="relative h-full w-full select-none">
        <button
          type="button"
          aria-label={`Jump to message: ${activeItem?.userText ?? "User message"}`}
          className={cn(
            "absolute top-1/2 left-3 -translate-y-1/2 cursor-pointer bg-transparent focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:outline-none",
            hitStripWidth > 0 ? "pointer-events-auto" : "pointer-events-none"
          )}
          onBlur={() => setActiveIndex(null)}
          onClick={(event) => {
            if (timelineMinimapEventTargetsPreview(event.target)) return
            const nextIndex = resolveActiveIndexFromPointer(event)
            const nextItem =
              nextIndex === null ? null : (items[nextIndex] ?? null)
            if (nextItem) onSelect(nextItem)
            event.currentTarget.blur()
          }}
          onFocus={() => setActiveIndex((current) => current ?? 0)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault()
              moveActiveIndex(1)
            } else if (event.key === "ArrowUp") {
              event.preventDefault()
              moveActiveIndex(-1)
            } else if (event.key === "Home") {
              event.preventDefault()
              setActiveIndex(0)
            } else if (event.key === "End") {
              event.preventDefault()
              setActiveIndex(items.length - 1)
            } else if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              if (activeItem) onSelect(activeItem)
            }
          }}
          onMouseLeave={() => setActiveIndex(null)}
          onMouseMove={updateActiveIndexFromPointer}
          onMouseDown={(event) => {
            if (timelineMinimapEventTargetsPreview(event.target)) return
            event.preventDefault()
          }}
          style={{
            height: resolveTimelineMinimapHeightStyle(items.length),
            width: resolveTimelineMinimapInteractiveWidth(
              hitStripWidth,
              activeItem !== null
            ),
          }}
        >
          <div className="absolute top-0 left-3 h-full w-px bg-border/15" />
          {items.map((item, index) => {
            const top = `${resolveTimelineMinimapTopPercent(index, items.length)}%`
            const activeDistance =
              resolvedActiveIndex === null
                ? null
                : Math.abs(index - resolvedActiveIndex)

            return (
              <span
                key={item.id}
                aria-hidden="true"
                data-minimap-strip
                className={cn(
                  "pointer-events-none absolute left-0 h-0.5 -translate-y-1/2 rounded-full bg-muted-foreground/35 transition-[background-color,width] duration-150 data-[in-view=true]:bg-foreground/90",
                  activeDistance === 0
                    ? "w-6 bg-muted-foreground/75"
                    : activeDistance === 1
                      ? "w-4"
                      : activeDistance === 2
                        ? "w-2.5"
                        : "w-2"
                )}
                style={{ top }}
              />
            )
          })}

          {activeItem ? (
            <span
              className="pointer-events-auto absolute left-8 w-80 cursor-text select-text"
              data-minimap-preview
              onMouseMove={(event) => event.stopPropagation()}
              style={{
                top: `${activeTopPercent}%`,
                transform: `translateY(${activeTooltipTranslate})`,
              }}
            >
              <span className="dropdown-glass block rounded-xl p-3 text-left text-popover-foreground shadow-xl shadow-black/25">
                <span className="block max-w-full overflow-hidden text-sm leading-5 font-medium text-ellipsis whitespace-nowrap">
                  {activeItem.userText ?? "User message"}
                </span>
                {activeItem.assistantText ? (
                  <span
                    className="mt-1 max-h-[3.75rem] overflow-hidden text-sm leading-5 text-muted-foreground"
                    style={{
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 3,
                    }}
                  >
                    {activeItem.assistantText}
                  </span>
                ) : null}
              </span>
            </span>
          ) : null}
        </button>
      </div>
    </div>
  )
}

export function TimelineMinimap(props: TimelineMinimapProps) {
  if (props.items.length < TIMELINE_MINIMAP_MIN_ITEMS) return null
  return <TimelineMinimapContent {...props} />
}
