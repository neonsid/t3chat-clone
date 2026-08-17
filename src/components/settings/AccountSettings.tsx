import { useState } from "react"
import { useClerk, useUser } from "@clerk/tanstack-react-start"
import { useNavigate } from "@tanstack/react-router"

import {
  ACCOUNT_DANGER_ZONE,
  ACCOUNT_SECURITY,
  PLAN_ACTION_LABEL,
  SETTINGS_PLANS,
  SETTINGS_USAGE,
} from "@/components/settings/constants"
import { getPlanAction } from "@/components/settings/logic"
import { Button } from "@/components/shared/ui/button"
import { Switch } from "@/components/shared/ui/switch"
import { DEFAULT_AUTH_REDIRECT } from "@/lib/auth"
import { cn } from "@/lib/utils"

export function AccountSettings() {
  return (
    <div className="flex flex-col gap-10">
      <PlanSelection />
      <BillingPreferences />
      <SecurityAndAccess />
      <DangerZone />
    </div>
  )
}

function PlanSelection() {
  const currentPlanId = SETTINGS_USAGE.currentPlanId

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold tracking-tight">
          Choose Your Plan
        </h2>
        <Button type="button" variant="outline" className="rounded-md">
          Manage Billing & Invoices
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3 md:items-stretch">
        {SETTINGS_PLANS.map((plan) => {
          const action = getPlanAction(plan.id, currentPlanId)
          return (
            <article
              key={plan.id}
              className={cn(
                "relative flex h-full flex-col rounded-2xl border bg-card p-5",
                plan.featured
                  ? "border-primary shadow-[0_0_0_1px_var(--primary)]"
                  : "border-border"
              )}
            >
              {plan.featured ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[11px] font-semibold text-primary-foreground">
                  Most Popular
                </span>
              ) : null}

              <div className="flex flex-1 flex-col">
                <h3 className="text-lg font-semibold tracking-tight">
                  {plan.name}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {plan.price}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {plan.description}
                </p>

                <ul className="mt-5 flex flex-col gap-2.5">
                  {plan.features.map((feature) => {
                    const Icon = feature.icon
                    return (
                      <li
                        key={feature.label}
                        className="flex items-start gap-2.5 text-sm text-foreground"
                      >
                        <Icon
                          className="mt-0.5 size-4 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                        {feature.label}
                      </li>
                    )
                  })}
                </ul>
              </div>

              <Button
                type="button"
                variant={action === "upgrade" ? "default" : "outline"}
                disabled={action === "current"}
                className="mt-6 w-full shrink-0 rounded-md"
              >
                {PLAN_ACTION_LABEL[action]}
              </Button>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function BillingPreferences() {
  const [emailReceipts, setEmailReceipts] = useState(true)

  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight">
        Billing Preferences
      </h2>
      <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            Email me receipts
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Send receipts to your account email when a payment succeeds
          </p>
        </div>
        <Switch
          checked={emailReceipts}
          onCheckedChange={setEmailReceipts}
          aria-label="Email me receipts"
        />
      </div>
    </section>
  )
}

function SecurityAndAccess() {
  const clerk = useClerk()

  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight">
        {ACCOUNT_SECURITY.title}
      </h2>
      <div className="mt-6 flex flex-col gap-8">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {ACCOUNT_SECURITY.emailTitle}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {ACCOUNT_SECURITY.emailDescription}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 rounded-md"
            onClick={() => clerk.openUserProfile()}
          >
            {ACCOUNT_SECURITY.emailAction}
          </Button>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {ACCOUNT_SECURITY.devicesTitle}
          </h3>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {ACCOUNT_SECURITY.devicesDescription}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 rounded-md"
            onClick={() => clerk.openUserProfile()}
          >
            {ACCOUNT_SECURITY.devicesAction}
          </Button>
        </div>
      </div>
    </section>
  )
}

function DangerZone() {
  const { user } = useUser()
  const navigate = useNavigate()
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDeleteAccount() {
    if (!user || isDeleting) return
    const confirmed = window.confirm(ACCOUNT_DANGER_ZONE.confirm)
    if (!confirmed) return

    setIsDeleting(true)
    try {
      await user.delete()
      await navigate({ to: DEFAULT_AUTH_REDIRECT })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <section className="rounded-2xl border border-border px-5 py-6">
      <h2 className="text-xl font-semibold tracking-tight">
        {ACCOUNT_DANGER_ZONE.title}
      </h2>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        {ACCOUNT_DANGER_ZONE.description}
      </p>
      <Button
        type="button"
        variant="destructive"
        disabled={isDeleting}
        className="mt-4 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90"
        onClick={() => void handleDeleteAccount()}
      >
        {ACCOUNT_DANGER_ZONE.action}
      </Button>
    </section>
  )
}
