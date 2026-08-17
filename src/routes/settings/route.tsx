import { useUser } from "@clerk/tanstack-react-start"
import { Navigate, createFileRoute, useLocation } from "@tanstack/react-router"

import { SettingsLayout } from "@/components/settings/SettingsLayout"
import { SIGN_IN_PATH } from "@/lib/auth"

export const Route = createFileRoute("/settings")({
  component: SettingsRoute,
  head: () => ({
    meta: [
      {
        title: "Settings",
      },
    ],
  }),
})

function SettingsRoute() {
  const { isLoaded, isSignedIn } = useUser()
  const returnTo = useLocation({ select: (location) => location.href })

  if (isLoaded && !isSignedIn) {
    return (
      <Navigate to={SIGN_IN_PATH} search={{ redirect_url: returnTo }} replace />
    )
  }

  return <SettingsLayout />
}
