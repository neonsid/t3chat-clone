import { useClerk, useUser } from "@clerk/tanstack-react-start"
import {
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router"
import { ArrowLeftIcon, MoonIcon, SunIcon } from "lucide-react"
import { LazyMotion, domAnimation } from "motion/react"

import { SettingsRail } from "@/components/settings/SettingsRail"
import {
  CUSTOMIZATION_PATH,
  HISTORY_PATH,
  MODELS_PATH,
  SETTINGS_HIDE_SCROLLBAR_CLASS,
  SETTINGS_PATH,
  SETTINGS_TABS,
} from "@/components/settings/constants"
import {
  getActiveSettingsTabId,
  isSettingsPlaceholderSection,
} from "@/components/settings/logic"
import { Tabs, TabsList, TabsTrigger } from "@/components/shared/motion/tabs"
import { Button } from "@/components/shared/ui/button"
import { Skeleton } from "@/components/shared/ui/skeleton"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { DEFAULT_AUTH_REDIRECT } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { usePreferencesStore } from "@/stores/AppStateProvider"

export function SettingsLayout() {
  const { isLoaded } = useUser()

  return (
    <LazyMotion features={domAnimation}>
      <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
        <SettingsHeader />
        {isLoaded ? <SettingsBody /> : <SettingsBodySkeleton />}
      </div>
    </LazyMotion>
  )
}

function SettingsHeader() {
  const clerk = useClerk()
  const returnTo = useRouterState({ select: (state) => state.location.href })
  const theme = usePreferencesStore((state) => state.theme)
  const setTheme = usePreferencesStore((state) => state.setTheme)
  const systemDark = useMediaQuery("(prefers-color-scheme: dark)")
  const isDark = theme === "dark" || (theme === "system" && systemDark)

  return (
    <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
      >
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
        Back to Chat
      </Link>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="text-muted-foreground hover:text-foreground"
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </Button>
        <button
          type="button"
          onClick={() =>
            void clerk.signOut({
              redirectUrl: returnTo || DEFAULT_AUTH_REDIRECT,
            })
          }
          className="cursor-pointer rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}

function SettingsBody() {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-y-auto",
        SETTINGS_HIDE_SCROLLBAR_CLASS
      )}
    >
      <div className="lg:flex lg:items-start">
        <aside className="w-full shrink-0 px-5 py-8 lg:w-80 xl:w-96">
          <SettingsRail />
        </aside>
        <main className="min-w-0 flex-1 px-5 pb-10 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-5xl">
            <SettingsTabs />
            <div className="mt-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function SettingsTabs() {
  const navigate = useNavigate()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const activeTab = getActiveSettingsTabId(pathname)

  function handleTabChange(nextTab: string) {
    if (nextTab === "account") {
      void navigate({ to: SETTINGS_PATH })
      return
    }
    if (nextTab === "customization") {
      void navigate({ to: CUSTOMIZATION_PATH })
      return
    }
    if (nextTab === "history") {
      void navigate({ to: HISTORY_PATH })
      return
    }
    if (nextTab === "models") {
      void navigate({ to: MODELS_PATH })
      return
    }
    if (!isSettingsPlaceholderSection(nextTab)) return
    void navigate({
      to: "/settings/$section",
      params: { section: nextTab },
    })
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      variant="segment"
      className="min-w-0"
    >
      <TabsList
        aria-label="Settings"
        className={cn(
          "h-auto w-max max-w-full gap-0 overflow-x-auto rounded-md bg-accent p-1 [&>div]:shrink-0",
          SETTINGS_HIDE_SCROLLBAR_CLASS
        )}
      >
        {SETTINGS_TABS.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className="rounded-md px-3.5 py-1.5 text-foreground data-[state=inactive]:text-muted-foreground"
            indicatorClassName="rounded-md bg-background shadow-sm"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

function SettingsBodySkeleton() {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-y-auto",
        SETTINGS_HIDE_SCROLLBAR_CLASS
      )}
    >
      <div className="lg:flex lg:items-start">
        <aside className="flex w-full flex-col items-center px-5 py-8 lg:w-80 xl:w-96">
          <Skeleton className="size-20 rounded-full" />
          <Skeleton className="mt-4 h-5 w-40" />
          <Skeleton className="mt-2 h-4 w-48" />
          <Skeleton className="mt-8 h-36 w-full rounded-2xl" />
          <Skeleton className="mt-4 h-40 w-full rounded-2xl" />
        </aside>
        <div className="min-w-0 flex-1 px-5 py-8">
          <Skeleton className="h-9 w-full max-w-xl rounded-md" />
          <Skeleton className="mt-8 h-72 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
