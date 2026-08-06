import { useState } from "react"
import {
  MonitorIcon,
  MoonIcon,
  SettingsIcon,
  SlidersHorizontalIcon,
  SunIcon,
} from "lucide-react"

import { Tabs, TabsList, TabsTrigger } from "@/components/shared/motion/tabs"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shared/ui/popover"
import { useMountEffect } from "@/hooks/useMountEffect"
import {
  applyTheme,
  isColorSchemePreference,
  readColorSchemePreference,
  storeColorSchemePreference,
} from "@/lib/theme"
import type { ColorSchemePreference } from "@/lib/theme"
import { cn } from "@/lib/utils"

export function SettingsMenu({
  triggerClassName,
}: {
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState<ColorSchemePreference>("system")

  useMountEffect(() => {
    const initialTheme = readColorSchemePreference()
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
    const handleSystemThemeChange = () => {
      if (readColorSchemePreference() === "system") applyTheme("system")
    }

    setTheme(initialTheme)
    applyTheme(initialTheme)
    systemTheme.addEventListener("change", handleSystemThemeChange)

    return () => {
      systemTheme.removeEventListener("change", handleSystemThemeChange)
    }
  })

  function handleThemeChange(value: string) {
    if (!isColorSchemePreference(value)) return
    setTheme(value)
    storeColorSchemePreference(value)
    applyTheme(value)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="Settings"
            className={cn(
              "inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none aria-expanded:bg-sidebar-accent aria-expanded:text-foreground",
              triggerClassName
            )}
          />
        }
      >
        <SlidersHorizontalIcon className="size-4" />
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={8}
        className="w-52 overflow-hidden p-1.5"
      >
        <div className="flex h-9 items-center gap-2 px-1.5">
          <span className="shrink-0 text-sm font-medium">Theme</span>

          <Tabs
            value={theme}
            onValueChange={handleThemeChange}
            variant="segment"
            className="min-w-0 flex-1"
          >
            <TabsList
              aria-label="Theme"
              className="h-7 w-full gap-1 rounded-full bg-accent p-0.5 [&>div]:min-w-0 [&>div]:flex-1"
            >
              <TabsTrigger
                value="light"
                className="h-6 w-full rounded-md px-2 py-1 data-[state=active]:text-foreground"
                indicatorClassName="bg-foreground/10 shadow-sm"
              >
                <SunIcon className="size-4" aria-hidden="true" />
                <span className="sr-only">Light theme</span>
              </TabsTrigger>
              <TabsTrigger
                value="system"
                className="h-6 w-full rounded-full px-2 py-2 data-[state=active]:text-foreground"
                indicatorClassName="bg-foreground/10 shadow-sm"
              >
                <MonitorIcon className="size-4" aria-hidden="true" />
                <span className="sr-only">System theme</span>
              </TabsTrigger>
              <TabsTrigger
                value="dark"
                className="h-6 w-full rounded-md px-2 py-1 data-[state=active]:text-foreground"
                indicatorClassName="bg-foreground/10 shadow-sm"
              >
                <MoonIcon className="size-4" aria-hidden="true" />
                <span className="sr-only">Dark theme</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="my-1 h-px bg-border" />

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-lg px-1.5 text-left text-sm font-medium transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
        >
          <SettingsIcon className="size-4 shrink-0" aria-hidden="true" />
          <span>Settings</span>
        </button>
      </PopoverContent>
    </Popover>
  )
}
