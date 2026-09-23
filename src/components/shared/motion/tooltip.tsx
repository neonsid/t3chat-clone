"use client"

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"
import type { ReactElement, ReactNode } from "react"

import {
  TOOLTIP_GAP_PX,
  TOOLTIP_WARM_WINDOW_MS,
} from "@/components/shared/motion/constants"
import type {
  MotionSide,
  TooltipAlign,
} from "@/components/shared/motion/constants"
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
  /** Portal target. Dialogs in the top layer need this so the tooltip stays visible. */
  portalContainer?: HTMLElement | null
}

export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  delay = 120,
  className,
  wrapperClassName,
  portalContainer,
}: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delay={delay} timeout={TOOLTIP_WARM_WINDOW_MS}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger
          delay={delay}
          closeOnClick={false}
          className={cn("relative inline-flex align-middle", wrapperClassName)}
          render={children}
        />
        <TooltipPrimitive.Portal container={portalContainer ?? undefined}>
          <TooltipPrimitive.Positioner
            side={side}
            align={align}
            sideOffset={TOOLTIP_GAP_PX}
            className="isolate z-[9999]"
          >
            <TooltipPrimitive.Popup
              className={cn(
                "pointer-events-none rounded-lg border border-border bg-popover/95 px-2.5 py-2 text-xs font-medium whitespace-nowrap text-popover-foreground shadow-[0_8px_24px_rgb(0_0_0/0.24)] backdrop-blur-md",
                className
              )}
            >
              {content}
            </TooltipPrimitive.Popup>
          </TooltipPrimitive.Positioner>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
