import { Fragment } from "react"
import { useUser } from "@clerk/tanstack-react-start"
import { Link } from "@tanstack/react-router"
import { ClockIcon, InfoIcon } from "lucide-react"

import {
  SETTINGS_SHORTCUTS,
  SETTINGS_USAGE,
} from "@/components/settings/constants"
import { Tooltip } from "@/components/shared/motion/tooltip"
import { useIsApplePlatform } from "@/hooks/useIsApplePlatform"
import { getUserProfileInfo } from "@/lib/user-profile"
import { cn } from "@/lib/utils"

export function SettingsRail({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center", className)}>
      <SettingsProfile />
      <div className="mt-8 flex w-full flex-col gap-4">
        <UsageLimitsCard />
        <KeyboardShortcutsCard />
      </div>
    </div>
  )
}

function SettingsProfile() {
  const { user } = useUser()
  const profile = getUserProfileInfo(user)

  return (
    <div className="flex flex-col items-center text-center">
      <span className="flex size-20 items-center justify-center overflow-hidden rounded-full bg-primary text-2xl font-medium text-primary-foreground">
        {profile.imageUrl ? (
          <img
            src={profile.imageUrl}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          profile.initial
        )}
      </span>
      <h2 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
        {profile.displayName}
      </h2>
      {profile.email ? (
        <p className="mt-1 text-sm text-muted-foreground">{profile.email}</p>
      ) : null}
      <span className="mt-3 inline-flex rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground">
        {SETTINGS_USAGE.currentPlanLabel}
      </span>
    </div>
  )
}

function UsageLimitsCard() {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Usage Limits</h3>
        <Tooltip content={SETTINGS_USAGE.info} side="top">
          <button
            type="button"
            aria-label="About usage limits"
            className="inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
          >
            <InfoIcon className="size-3.5" />
          </button>
        </Tooltip>
      </div>

      <UsageMeter
        className="mt-4"
        label="Base"
        valueLabel={SETTINGS_USAGE.baseRemainingLabel}
        percent={SETTINGS_USAGE.basePercent}
      />
      <UsageMeter
        className="mt-3"
        label="Burst overage"
        percent={SETTINGS_USAGE.burstPercent}
      />

      <p className="mt-4 text-xs text-muted-foreground">
        Plan renews on {SETTINGS_USAGE.renewsOnLabel}
      </p>
    </section>
  )
}

function UsageMeter({
  label,
  valueLabel,
  percent,
  className,
}: {
  label: string
  valueLabel?: string
  percent: number
  className?: string
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
        <span className="text-foreground">{label}</span>
        {valueLabel ? (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <ClockIcon className="size-3.5" aria-hidden="true" />
            {valueLabel}
          </span>
        ) : null}
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

function KeyboardShortcutsCard() {
  const modifier = useIsApplePlatform() ? "⌘" : "Ctrl"

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground">
        Keyboard Shortcuts
      </h3>
      <ul className="mt-3 space-y-2.5">
        {SETTINGS_SHORTCUTS.map((shortcut) => (
          <li
            key={shortcut.id}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="text-foreground">{shortcut.label}</span>
            <span className="flex items-center gap-1">
              {shortcut.keys.map((key, index) => (
                <Fragment key={`${shortcut.id}-${key}`}>
                  {index > 0 ? (
                    <span className="text-xs text-muted-foreground">+</span>
                  ) : null}
                  <kbd className="rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] font-medium text-foreground">
                    {key === "mod" ? modifier : key}
                  </kbd>
                </Fragment>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <Link
        to="/settings/$section"
        params={{ section: "shortcuts" }}
        className="mt-4 inline-block text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
      >
        Customize shortcuts
      </Link>
    </section>
  )
}
