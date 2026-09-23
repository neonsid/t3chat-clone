"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { MotionConfig, useReducedMotion } from "motion/react"
import * as m from "motion/react-m"
import { createContext, useContext, useId, useState } from "react"
import type { ReactNode } from "react"

import {
  TABS_LIST_CLASSES,
  TABS_TRANSITION,
} from "@/components/shared/motion/constants"
import type { TabsVariant } from "@/components/shared/motion/constants"
import { cn } from "@/lib/utils"

type TabsContextValue = {
  value: string
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
  const current = value ?? internal

  return (
    <MotionConfig transition={reduce ? { duration: 0 } : TABS_TRANSITION}>
      <TabsContext.Provider value={{ value: current, layoutId, variant }}>
        <TabsPrimitive.Root
          value={current}
          onValueChange={(next) => {
            if (next == null) return
            const nextValue = String(next)
            if (value === undefined) setInternal(nextValue)
            onValueChange?.(nextValue)
          }}
          className={className}
        >
          {children}
        </TabsPrimitive.Root>
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
    <TabsPrimitive.List
      className={cn(TABS_LIST_CLASSES[variant], className)}
      {...props}
    >
      {children}
    </TabsPrimitive.List>
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
  const { value: current, layoutId, variant } = useTabs()
  const active = current === value

  if (variant === "underline") {
    return (
      <TabsPrimitive.Tab
        value={value}
        data-state={active ? "active" : "inactive"}
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
      </TabsPrimitive.Tab>
    )
  }

  const radius = variant === "pill" ? "rounded-full" : "rounded-md"

  return (
    <div className="relative">
      {active ? (
        <m.span
          layoutId={layoutId}
          style={variant === "pill" ? { borderRadius: 9999 } : undefined}
          className={cn(
            "absolute inset-0 bg-primary",
            radius,
            indicatorClassName
          )}
        />
      ) : null}
      <TabsPrimitive.Tab
        value={value}
        data-state={active ? "active" : "inactive"}
        className={cn(
          "relative z-10 inline-flex cursor-pointer items-center justify-center bg-transparent px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors outline-none",
          active
            ? "text-primary-foreground"
            : "text-muted-foreground hover:text-foreground",
          radius,
          className
        )}
      >
        {children}
      </TabsPrimitive.Tab>
    </div>
  )
}
