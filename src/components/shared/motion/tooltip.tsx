"use client"
// beui.dev/components/motion/tooltip

import { AnimatePresence, useReducedMotion } from "motion/react"
import type { Variants } from "motion/react"
import * as m from "motion/react-m"
import {
  cloneElement,
  isValidElement,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import type { ReactElement, ReactNode } from "react"
import { createPortal } from "react-dom"
import { EASE_OUT } from "@/lib/ease"
import {
  TOOLTIP_ALIGN_TRANSLATE_X,
  TOOLTIP_ANCHOR_TRANSLATE,
  TOOLTIP_GAP_PX,
  TOOLTIP_OFFSET_FROM,
  TOOLTIP_REDUCED_VARIANTS,
  TOOLTIP_TRANSFORM_ORIGIN,
  TOOLTIP_WARM_WINDOW_MS,
} from "@/components/shared/motion/constants"
import type {
  MotionSide,
  TooltipAlign,
  TooltipOffset,
} from "@/components/shared/motion/constants"
import { useHoverCapable } from "@/hooks/useHoverCapable"
import { useWindowEvent } from "@/hooks/useWindowEvent"
import { hasDocument } from "@/lib/runtime-env"
import { cn } from "@/lib/utils"

export interface TooltipProps {
  content: ReactNode
  children: ReactElement
  side?: MotionSide
  /** Horizontal align for top/bottom sides. Default center. */
  align?: TooltipAlign
  /** Delay before showing (ms). Default 120. */
  delay?: number
  className?: string
  /** Classes for the outer wrapper span. Use to fix baseline / fill parent. */
  wrapperClassName?: string
}

function buildVariants(side: MotionSide): Variants {
  const o: TooltipOffset = TOOLTIP_OFFSET_FROM[side]
  return {
    initial: {
      opacity: 0,
      scale: 0.9,
      filter: "blur(5px)",
      x: o.x ?? 0,
      y: o.y ?? 0,
    },
    animate: {
      opacity: 1,
      scale: 1,
      filter: "blur(0px)",
      x: 0,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 380,
        damping: 30,
        mass: 0.7,
        opacity: { duration: 0.14, ease: EASE_OUT },
        filter: { duration: 0.18, ease: EASE_OUT },
      },
    },
    exit: {
      opacity: 0,
      scale: 0.94,
      filter: "blur(3px)",
      x: (o.x ?? 0) * 0.6,
      y: (o.y ?? 0) * 0.6,
      transition: { duration: 0.12, ease: EASE_OUT },
    },
  }
}

let lastHiddenAt = 0

function TooltipPositionSync({ onMove }: { onMove: () => void }) {
  useWindowEvent("scroll", onMove, true)
  useWindowEvent("resize", onMove)
  return null
}

export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  delay = 120,
  className,
  wrapperClassName,
}: TooltipProps) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null
  )
  const id = useId()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const anchorRef = useRef<HTMLSpanElement>(null)
  const reduce = useReducedMotion()
  const canHover = useHoverCapable()

  // Anchor point in viewport coords, on the edge of the trigger facing `side`.
  // Position:fixed means these viewport coords place the tooltip directly, so
  // it escapes every ancestor's stacking context and overflow.
  const place = useCallback(() => {
    const el = anchorRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const alignedLeft = {
      start: r.left,
      center: cx,
      end: r.right,
    }[align]
    const point = {
      top: { top: r.top - TOOLTIP_GAP_PX, left: alignedLeft },
      bottom: { top: r.bottom + TOOLTIP_GAP_PX, left: alignedLeft },
      left: { top: cy, left: r.left - TOOLTIP_GAP_PX },
      right: { top: cy, left: r.right + TOOLTIP_GAP_PX },
    } satisfies Record<MotionSide, { top: number; left: number }>
    setCoords(point[side])
  }, [align, side])

  const show = useCallback(() => {
    if (!canHover) return
    if (timer.current) clearTimeout(timer.current)
    const warm = Date.now() - lastHiddenAt < TOOLTIP_WARM_WINDOW_MS
    timer.current = setTimeout(
      () => {
        place()
        setOpen(true)
      },
      warm ? 0 : delay
    )
  }, [canHover, delay, place])

  const hide = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    if (open) lastHiddenAt = Date.now()
    setOpen(false)
  }, [open])

  const variants = useMemo(
    () => (reduce ? TOOLTIP_REDUCED_VARIANTS : buildVariants(side)),
    [reduce, side]
  )

  if (!isValidElement(children)) return children

  type TooltipTriggerProps = {
    onMouseEnter?: () => void
    onMouseLeave?: () => void
    onFocus?: () => void
    onBlur?: () => void
    "aria-describedby"?: string
  }

  // SAFETY: isValidElement already confirmed a single element; cloneElement needs the trigger prop bag.
  const trigger = cloneElement(children as ReactElement<TooltipTriggerProps>, {
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: show,
    onBlur: hide,
    "aria-describedby": id,
  })
  const tooltip = (
    <AnimatePresence>
      {open && coords ? (
        <m.span
          key="tooltip"
          id={id}
          role="tooltip"
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          className={cn(
            "pointer-events-none fixed z-[9999] block rounded-lg border border-border bg-popover/95 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-popover-foreground shadow-[0_8px_24px_rgb(0_0_0/0.24)] backdrop-blur-md",
            className
          )}
          style={{
            top: coords.top,
            left: coords.left,
            translate:
              side === "left" || side === "right"
                ? TOOLTIP_ANCHOR_TRANSLATE[side]
                : `${TOOLTIP_ALIGN_TRANSLATE_X[align]} ${
                    side === "top" ? "-100%" : "0"
                  }`,
            transformOrigin: TOOLTIP_TRANSFORM_ORIGIN[side],
          }}
        >
          <TooltipPositionSync onMove={place} />
          {content}
        </m.span>
      ) : null}
    </AnimatePresence>
  )

  return (
    <>
      <span
        ref={anchorRef}
        className={cn("relative inline-flex align-middle", wrapperClassName)}
      >
        {trigger}
      </span>
      {hasDocument() ? createPortal(tooltip, document.body) : null}
    </>
  )
}
