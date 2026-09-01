import { useState } from "react"
import { useClerk, useUser } from "@clerk/tanstack-react-start"
import { useAction, useMutation } from "convex/react"
import { useNavigate } from "@tanstack/react-router"

import { api } from "../../../convex/_generated/api"
import {
  ACCOUNT_DANGER_ZONE,
  ACCOUNT_PLAN,
  ACCOUNT_SECURITY,
  PLAN_ACTION_LABEL,
  SETTINGS_PLANS,
  type PlanId,
} from "@/components/settings/constants"
import { convexErrorMessage, getPlanAction } from "@/components/settings/logic"
import {
  AnimatedToastStack,
  useAnimatedToastStack,
} from "@/components/shared/motion/animated-toast-stack"
import { Tooltip } from "@/components/shared/motion/tooltip"
import { Button } from "@/components/shared/ui/button"
import { Switch } from "@/components/shared/ui/switch"
import { useBillingAccount } from "@/hooks/useBillingAccount"
import { DEFAULT_AUTH_REDIRECT } from "@/lib/auth"
import { cn } from "@/lib/utils"

export function AccountSettings() {
  const toasts = useAnimatedToastStack({ limit: 1 })

  return (
    <div className="relative flex flex-col gap-10">
      <PlanSelection
        onError={(title) => toasts.showToast({ title, status: "error" })}
      />
      <BillingPreferences />
      <SecurityAndAccess />
      <DangerZone
        onError={(title) => toasts.showToast({ title, status: "error" })}
      />
      <AnimatedToastStack
        toasts={toasts.toasts}
        onDismiss={toasts.dismissToast}
      />
    </div>
  )
}

function PlanSelection({ onError }: { onError: (title: string) => void }) {
  const { account, isLoading } = useBillingAccount()
  const createCheckout = useAction(api.polar.createCheckout)
  const changePlan = useAction(api.polar.changePlan)
  const cancelPlan = useAction(api.polar.cancelPlan)
  const createPortalSession = useAction(api.polar.createPortalSession)
  const [pendingPlanId, setPendingPlanId] = useState<PlanId | "portal" | null>(
    null
  )
  const currentPlanId = account?.planId
  const busy = pendingPlanId !== null

  async function handlePortal() {
    if (!account?.hasBillingCustomer || busy) return
    setPendingPlanId("portal")
    try {
      const { url } = await createPortalSession({
        returnUrl: `${window.location.origin}/settings`,
      })
      window.location.assign(url)
    } catch (error) {
      onError(
        error instanceof Error
          ? convexErrorMessage(error, ACCOUNT_PLAN.portalFailed)
          : ACCOUNT_PLAN.portalFailed
      )
      setPendingPlanId(null)
    }
  }

  async function handlePlanAction(planId: PlanId) {
    if (!currentPlanId || busy) return
    const action = getPlanAction(planId, currentPlanId)
    if (action === "current") return

    if (action === "downgrade" && planId === "free") {
      const confirmed = window.confirm(ACCOUNT_PLAN.cancelConfirm)
      if (!confirmed) return
      setPendingPlanId(planId)
      try {
        await cancelPlan({})
      } catch (error) {
        onError(
          error instanceof Error
            ? convexErrorMessage(error, ACCOUNT_PLAN.changeFailed)
            : ACCOUNT_PLAN.changeFailed
        )
      } finally {
        setPendingPlanId(null)
      }
      return
    }

    if (currentPlanId !== "free") {
      if (planId !== "pro" && planId !== "premier") return
      const planName = SETTINGS_PLANS.find((plan) => plan.id === planId)?.name
      const confirmed = window.confirm(
        ACCOUNT_PLAN.changeConfirm(planName ?? planId)
      )
      if (!confirmed) return
      setPendingPlanId(planId)
      try {
        await changePlan({ planId })
      } catch (error) {
        onError(
          error instanceof Error
            ? convexErrorMessage(error, ACCOUNT_PLAN.changeFailed)
            : ACCOUNT_PLAN.changeFailed
        )
      } finally {
        setPendingPlanId(null)
      }
      return
    }

    if (planId === "free") return
    setPendingPlanId(planId)
    try {
      const { url } = await createCheckout({
        planId,
        origin: window.location.origin,
      })
      window.location.assign(url)
    } catch (error) {
      onError(
        error instanceof Error
          ? convexErrorMessage(error, ACCOUNT_PLAN.checkoutFailed)
          : ACCOUNT_PLAN.checkoutFailed
      )
      setPendingPlanId(null)
    }
  }

  const portalButton = (
    <Button
      type="button"
      variant="outline"
      className="rounded-md"
      disabled={!account?.hasBillingCustomer || busy}
      onClick={() => void handlePortal()}
    >
      Manage Billing & Invoices
    </Button>
  )

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold tracking-tight">
          Choose Your Plan
        </h2>
        {account?.hasBillingCustomer ? (
          portalButton
        ) : (
          <Tooltip content={ACCOUNT_PLAN.portalUnavailable} side="top">
            {portalButton}
          </Tooltip>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3 md:items-stretch">
        {SETTINGS_PLANS.map((plan) => {
          const action = currentPlanId
            ? getPlanAction(plan.id, currentPlanId)
            : "current"
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
                disabled={
                  isLoading ||
                  !currentPlanId ||
                  action === "current" ||
                  busy
                }
                className="mt-6 w-full shrink-0 rounded-md"
                onClick={() => void handlePlanAction(plan.id)}
              >
                {pendingPlanId === plan.id
                  ? "Working…"
                  : isLoading || !currentPlanId
                    ? "…"
                    : PLAN_ACTION_LABEL[action]}
              </Button>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function BillingPreferences() {
  const { account, isLoading } = useBillingAccount()
  const setEmailReceipts = useMutation(api.billing.setEmailReceipts)
  const [pending, setPending] = useState(false)
  const checked = account?.emailReceipts ?? true

  async function handleChange(enabled: boolean) {
    if (isLoading || pending) return
    setPending(true)
    try {
      await setEmailReceipts({ enabled })
    } finally {
      setPending(false)
    }
  }

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
          checked={checked}
          disabled={isLoading || pending}
          onCheckedChange={(enabled) => void handleChange(enabled)}
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

function DangerZone({ onError }: { onError: (title: string) => void }) {
  const { user } = useUser()
  const navigate = useNavigate()
  const scheduleDelete = useMutation(api.accounts.scheduleDelete)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDeleteAccount() {
    if (!user || isDeleting) return
    const confirmed = window.confirm(ACCOUNT_DANGER_ZONE.confirm)
    if (!confirmed) return

    setIsDeleting(true)
    try {
      await scheduleDelete({})
      await user.delete()
      await navigate({ to: DEFAULT_AUTH_REDIRECT })
    } catch (error) {
      onError(
        error instanceof Error
          ? convexErrorMessage(error, ACCOUNT_PLAN.deleteFailed)
          : ACCOUNT_PLAN.deleteFailed
      )
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
