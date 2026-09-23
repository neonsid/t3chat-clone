"use client"

import { ContextMenu as ContextMenuPrimitive } from "@base-ui/react/context-menu"
import { useReducedMotion } from "motion/react"
import * as m from "motion/react-m"
import type { ReactElement, ReactNode, Ref } from "react"

import {
  CONTEXT_MENU_MORPH_DURATION_SECONDS,
  CONTEXT_MENU_VIEWPORT_PADDING,
} from "@/components/shared/motion/constants"
import { EASE_OUT } from "@/lib/ease"
import { cn } from "@/lib/utils"

type TriggerElementProps = React.HTMLAttributes<HTMLElement> & {
  ref?: Ref<HTMLElement>
}

export interface ContextMenuProps {
  children: ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

export function ContextMenu({
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  className,
}: ContextMenuProps) {
  return (
    <ContextMenuPrimitive.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={(next) => onOpenChange?.(next)}
    >
      <div className={cn("contents", className)}>{children}</div>
    </ContextMenuPrimitive.Root>
  )
}

export interface ContextMenuTriggerProps {
  children: ReactElement<TriggerElementProps>
  disabled?: boolean
  className?: string
}

export function ContextMenuTrigger({
  children,
  disabled = false,
  className,
}: ContextMenuTriggerProps) {
  if (disabled) {
    return children
  }

  return (
    <ContextMenuPrimitive.Trigger className={className} render={children} />
  )
}

export interface ContextMenuContentProps {
  children: ReactNode
  className?: string
  ariaLabel?: string
}

export function ContextMenuContent({
  children,
  className,
  ariaLabel = "Context menu",
}: ContextMenuContentProps) {
  const reduce = useReducedMotion() ?? false

  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Positioner
        side="bottom"
        align="start"
        sideOffset={0}
        collisionPadding={CONTEXT_MENU_VIEWPORT_PADDING}
        className="isolate z-[100] [filter:drop-shadow(0_18px_28px_rgba(0,0,0,0.2))]"
      >
        <ContextMenuPrimitive.Popup
          aria-label={ariaLabel}
          className={cn(
            "min-w-56 origin-top-left overflow-hidden rounded-xl border border-border bg-card p-1.5 text-foreground outline-none",
            className
          )}
          render={
            <m.div
              initial={
                reduce
                  ? { opacity: 0 }
                  : { opacity: 0, clipPath: "inset(8% 8% 8% 8% round 10px)" }
              }
              animate={
                reduce
                  ? { opacity: 1 }
                  : {
                      opacity: 1,
                      clipPath: "inset(0% 0% 0% 0% round 12px)",
                    }
              }
              transition={
                reduce
                  ? { duration: 0.1, ease: EASE_OUT }
                  : {
                      duration: CONTEXT_MENU_MORPH_DURATION_SECONDS,
                      ease: EASE_OUT,
                    }
              }
            />
          }
        >
          {children}
        </ContextMenuPrimitive.Popup>
      </ContextMenuPrimitive.Positioner>
    </ContextMenuPrimitive.Portal>
  )
}

type ContextMenuItemTone = "default" | "destructive"

export interface ContextMenuItemProps {
  children: ReactNode
  onSelect?: () => void
  disabled?: boolean
  closeOnSelect?: boolean
  tone?: ContextMenuItemTone
  inset?: boolean
  className?: string
  textValue?: string
}

export function ContextMenuItem({
  children,
  onSelect,
  disabled = false,
  closeOnSelect = true,
  tone = "default",
  inset = false,
  className,
  textValue,
}: ContextMenuItemProps) {
  return (
    <ContextMenuPrimitive.Item
      disabled={disabled}
      closeOnClick={closeOnSelect}
      label={textValue}
      data-context-menu-item="true"
      data-disabled={disabled ? "true" : undefined}
      data-label={textValue}
      onClick={() => {
        if (!disabled) onSelect?.()
      }}
      className={cn(
        "relative isolate flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-[13px] outline-none select-none",
        "focus-visible:ring-2 focus-visible:ring-foreground/15",
        "disabled:pointer-events-none disabled:opacity-40",
        inset && "pl-8",
        tone === "destructive"
          ? "text-destructive data-highlighted:bg-destructive/10"
          : "text-foreground data-highlighted:bg-foreground/[0.065]",
        className
      )}
    >
      {children}
    </ContextMenuPrimitive.Item>
  )
}
