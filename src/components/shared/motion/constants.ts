import type { Transition, Variants } from "motion/react"

import { EASE_OUT } from "@/lib/ease"

export type MotionSide = "top" | "right" | "bottom" | "left"
export type TabsVariant = "pill" | "underline" | "segment"

export const CONTEXT_MENU_VIEWPORT_PADDING = 8
export const CONTEXT_MENU_LONG_PRESS_DELAY_MS = 520
export const CONTEXT_MENU_LONG_PRESS_TOLERANCE_PX = 10
export const CONTEXT_MENU_MORPH_DURATION_SECONDS = 0.3

export const TOOLTIP_GAP_PX = 8
export const TOOLTIP_WARM_WINDOW_MS = 300
export const TOOLTIP_ANCHOR_TRANSLATE = {
  top: "-50% -100%",
  bottom: "-50% 0",
  left: "-100% -50%",
  right: "0 -50%",
} as const satisfies Record<MotionSide, string>
export const TOOLTIP_TRANSFORM_ORIGIN = {
  top: "center bottom",
  bottom: "center top",
  left: "right center",
  right: "left center",
} as const satisfies Record<MotionSide, string>
export type TooltipOffset = { x?: number; y?: number }
export const TOOLTIP_OFFSET_FROM = {
  top: { y: 8 },
  bottom: { y: -8 },
  left: { x: 8 },
  right: { x: -8 },
} satisfies Record<MotionSide, TooltipOffset>
export const TOOLTIP_REDUCED_VARIANTS: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.14, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: 0.1, ease: EASE_OUT } },
}

export const TABS_TRANSITION: Transition = {
  type: "spring",
  stiffness: 170,
  damping: 24,
  mass: 1.2,
}
export const TABS_LIST_CLASSES = {
  pill: "inline-flex items-center gap-1 rounded-full bg-card p-1",
  underline: "inline-flex items-center gap-1 border-b border-border",
  segment: "inline-flex items-center gap-0 rounded-lg bg-card p-0.5",
} as const satisfies Record<TabsVariant, string>
