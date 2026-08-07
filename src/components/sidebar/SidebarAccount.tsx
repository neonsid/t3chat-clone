import { useClerk, useUser } from "@clerk/tanstack-react-start"
import { Link, useLocation } from "@tanstack/react-router"
import {
  LogInIcon,
  LogOutIcon,
  MessageSquareIcon,
  SettingsIcon,
  UserRoundPlusIcon,
} from "lucide-react"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shared/ui/popover"
import { Separator } from "@/components/shared/ui/separator"
import { DEFAULT_AUTH_REDIRECT, SIGN_IN_PATH } from "@/lib/auth"

export function SidebarAccount() {
  const { isLoaded, isSignedIn, user } = useUser()
  const clerk = useClerk()
  const returnTo = useLocation({ select: (location) => location.href })

  if (!isLoaded) return <div aria-hidden="true" className="h-11" />

  if (!isSignedIn) {
    return (
      <Link
        to={SIGN_IN_PATH}
        search={{ redirect_url: returnTo }}
        className="flex h-11 w-full items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent px-4 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/80 focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
      >
        <LogInIcon aria-hidden="true" className="size-5" />
        Login
      </Link>
    )
  }

  const displayName =
    user.fullName ??
    user.firstName ??
    user.primaryEmailAddress?.emailAddress ??
    "Account"
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="Open account menu"
            className="flex h-8 w-full cursor-pointer items-center justify-between px-1 text-left focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
          />
        }
      >
        <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-medium text-primary-foreground ring-2 ring-sidebar-ring/80 ring-offset-2 ring-offset-sidebar">
          {user.hasImage ? (
            <img
              src={user.imageUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            initial
          )}
        </span>
        <UserRoundPlusIcon
          aria-hidden="true"
          className="size-5 text-sidebar-foreground"
        />
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="start"
        alignOffset={4}
        sideOffset={8}
        className="w-[calc(var(--anchor-width)-0.5rem)] min-w-[calc(var(--anchor-width)-0.5rem)] overflow-hidden rounded-xl p-0"
      >
        <div className="space-y-2.5 px-4 py-3.5">
          <p className="truncate text-sm font-semibold tracking-tight">
            {displayName}
          </p>
          <span className="inline-flex rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground">
            Pro
          </span>
        </div>
        <Separator />
        <div className="space-y-0.5 p-1.5">
          <button
            type="button"
            className="flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
          >
            <SettingsIcon aria-hidden="true" className="size-4" />
            Settings
          </button>
          <button
            type="button"
            className="flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
          >
            <MessageSquareIcon aria-hidden="true" className="size-4" />
            Feedback
          </button>
        </div>
        <Separator />
        <div className="p-1.5">
          <button
            type="button"
            onClick={() =>
              void clerk.signOut({
                redirectUrl: returnTo || DEFAULT_AUTH_REDIRECT,
              })
            }
            className="flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
          >
            <LogOutIcon aria-hidden="true" className="size-4" />
            Sign out
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
