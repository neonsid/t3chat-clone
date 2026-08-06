"use client"
// beui.dev/components/motion/tabs

import { MotionConfig, useReducedMotion } from "motion/react"
import * as m from "motion/react-m"
import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
} from "react"
import type { ReactNode } from "react"

import {
  TABS_LIST_CLASSES,
  TABS_TRANSITION,
} from "@/components/shared/motion/constants"
import type { TabsVariant } from "@/components/shared/motion/constants"
import { cn } from "@/lib/utils"

type TabsContextValue = {
  value: string
  setValue: (value: string) => void
  layoutId: string
  variant: TabsVariant
}

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabs() {
  const context = useContext(TabsContext)
  if (!context) throw new Error("Tabs.* must be used inside <Tabs>")
  return context
}

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  variant = "pill",
  children,
  className,
}: {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  variant?: TabsVariant
  children: ReactNode
  className?: string
}) {
  const [internal, setInternal] = useState(defaultValue ?? "")
  const layoutId = useId()
  const reduce = useReducedMotion()
  const controlled = value !== undefined
  const current = controlled ? value : internal
  const setValue = useCallback(
    (nextValue: string) => {
      if (!controlled) setInternal(nextValue)
      onValueChange?.(nextValue)
    },
    [controlled, onValueChange]
  )
  const contextValue = useMemo(
    () => ({ value: current, setValue, layoutId, variant }),
    [current, layoutId, setValue, variant]
  )

  return (
    <MotionConfig transition={reduce ? { duration: 0 } : TABS_TRANSITION}>
      <TabsContext.Provider value={contextValue}>
        <m.div layoutRoot className={className}>
          {children}
        </m.div>
      </TabsContext.Provider>
    </MotionConfig>
  )
}

export function TabsList({
  children,
  className,
  ...props
}: {
  children: ReactNode
  className?: string
} & Omit<React.ComponentProps<"div">, "children" | "className">) {
  const { variant } = useTabs()

  return (
    <div
      role="tablist"
      className={cn(TABS_LIST_CLASSES[variant], className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function TabsTrigger({
  value,
  children,
  className,
  indicatorClassName,
}: {
  value: string
  children: ReactNode
  className?: string
  indicatorClassName?: string
}) {
  const { value: current, setValue, layoutId, variant } = useTabs()
  const active = current === value

  if (variant === "underline") {
    return (
      <button
        type="button"
        role="tab"
        aria-selected={active}
        data-state={active ? "active" : "inactive"}
        onClick={() => setValue(value)}
        className={cn(
          "relative isolate -mb-px inline-flex min-h-11 items-center px-3 pt-1 pb-2.5 text-sm font-medium transition-colors",
          active
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground",
          className
        )}
      >
        {children}
        {active ? (
          <m.span
            layoutId={layoutId}
            className={cn(
              "absolute right-0 -bottom-px left-0 h-px bg-primary",
              indicatorClassName
            )}
          />
        ) : null}
      </button>
    )
  }

  const radius = variant === "pill" ? "rounded-full" : "rounded-md"

  return (
    <div className="relative">
      {active ? (
        <m.span
          layoutId={layoutId}
          style={{ borderRadius: variant === "pill" ? 9999 : 8 }}
          className={cn(
            "absolute inset-0 bg-primary",
            radius,
            indicatorClassName
          )}
        />
      ) : null}
      <button
        type="button"
        role="tab"
        aria-selected={active}
        data-state={active ? "active" : "inactive"}
        onClick={() => setValue(value)}
        className={cn(
          "relative z-10 inline-flex items-center justify-center bg-transparent px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors outline-none",
          active
            ? "text-primary-foreground"
            : "text-muted-foreground hover:text-foreground",
          radius,
          className
        )}
      >
        {children}
      </button>
    </div>
  )
}
