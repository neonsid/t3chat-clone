import { useState } from "react"
import { Link } from "@tanstack/react-router"
import {
  MonitorIcon,
  MoonIcon,
  SettingsIcon,
  SlidersHorizontalIcon,
  SunIcon,
} from "lucide-react"

import { SETTINGS_PATH } from "@/components/settings/constants"
import { Tabs, TabsList, TabsTrigger } from "@/components/shared/motion/tabs"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shared/ui/popover"
import {
  DEFAULT_COLOR_THEME_ID,
  isColorSchemePreference,
  T3_CHAT_COLOR_THEME_ID,
} from "@/lib/theme"
import { cn } from "@/lib/utils"
import { usePreferencesStore } from "@/stores/AppStateProvider"

export function SettingsMenu({
  triggerClassName,
}: {
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const theme = usePreferencesStore((state) => state.theme)
  const setTheme = usePreferencesStore((state) => state.setTheme)
  const colorTheme = usePreferencesStore((state) => state.colorTheme)
  const setColorTheme = usePreferencesStore((state) => state.setColorTheme)

  function handleDefaultThemeChange(value: string) {
    if (!isColorSchemePreference(value)) return
    setColorTheme(DEFAULT_COLOR_THEME_ID)
    setTheme(value)
  }

  function handleT3ChatThemeChange(value: string) {
    if (!isColorSchemePreference(value)) return
    setColorTheme(T3_CHAT_COLOR_THEME_ID)
    setTheme(value)
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
            value={colorTheme === DEFAULT_COLOR_THEME_ID ? theme : ""}
            onValueChange={handleDefaultThemeChange}
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

        <div className="flex h-9 items-center gap-2 px-1.5">
          <span className="shrink-0 text-sm font-medium">T3 Chat</span>

          <Tabs
            value={colorTheme === T3_CHAT_COLOR_THEME_ID ? theme : ""}
            onValueChange={handleT3ChatThemeChange}
            variant="segment"
            className="min-w-0 flex-1"
          >
            <TabsList
              aria-label="T3 Chat theme"
              className="h-7 w-full gap-1 rounded-full bg-accent p-0.5 [&>div]:min-w-0 [&>div]:flex-1"
            >
              <TabsTrigger
                value="light"
                className="h-6 w-full rounded-md px-2 py-1 data-[state=active]:text-foreground"
                indicatorClassName="bg-foreground/10 shadow-sm"
              >
                <SunIcon className="size-4" aria-hidden="true" />
                <span className="sr-only">T3 Chat light theme</span>
              </TabsTrigger>
              <TabsTrigger
                value="system"
                className="h-6 w-full rounded-full px-2 py-2 data-[state=active]:text-foreground"
                indicatorClassName="bg-foreground/10 shadow-sm"
              >
                <MonitorIcon className="size-4" aria-hidden="true" />
                <span className="sr-only">T3 Chat system theme</span>
              </TabsTrigger>
              <TabsTrigger
                value="dark"
                className="h-6 w-full rounded-md px-2 py-1 data-[state=active]:text-foreground"
                indicatorClassName="bg-foreground/10 shadow-sm"
              >
                <MoonIcon className="size-4" aria-hidden="true" />
                <span className="sr-only">T3 Chat dark theme</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="my-1 h-px bg-border" />

        <Link
          to={SETTINGS_PATH}
          onClick={() => setOpen(false)}
          className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-lg px-1.5 text-left text-sm font-medium transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
        >
          <SettingsIcon className="size-4 shrink-0" aria-hidden="true" />
          <span>Settings</span>
        </Link>
      </PopoverContent>
    </Popover>
  )
}
