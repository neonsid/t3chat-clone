import { useEffect, useState } from "react"
import { useConvexAuth, useQuery } from "convex/react"

import { api } from "../../convex/_generated/api"

const MINUTE_MS = 60_000

function billingNow() {
  return Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS
}

export function useBillingAccount() {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()
  const [now, setNow] = useState(billingNow)
  const account = useQuery(
    api.billing.getAccount,
    isAuthenticated ? { now } : "skip"
  )

  useEffect(() => {
    const timer = window.setInterval(() => setNow(billingNow()), MINUTE_MS)
    return () => window.clearInterval(timer)
  }, [])

  return {
    account: account ?? null,
    isLoading: isAuthLoading || (isAuthenticated && account === undefined),
  }
}
