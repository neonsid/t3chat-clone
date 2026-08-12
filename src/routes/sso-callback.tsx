import { HandleSSOCallback } from "@clerk/tanstack-react-start"
import { createFileRoute } from "@tanstack/react-router"

import {
  DEFAULT_AUTH_REDIRECT,
  SIGN_IN_PATH,
  consumeAuthRedirect,
} from "@/lib/auth"

export const Route = createFileRoute("/sso-callback")({
  component: SsoCallbackRoute,
})

function SsoCallbackRoute() {
  function go(path: string) {
    window.location.assign(path)
  }

  return (
    <main className="flex h-dvh items-center justify-center bg-background text-foreground">
      <p className="text-sm text-muted-foreground">Finishing sign-in…</p>
      <HandleSSOCallback
        navigateToApp={({ session, decorateUrl }) => {
          if (session?.currentTask) {
            go(decorateUrl(DEFAULT_AUTH_REDIRECT))
            return
          }

          go(decorateUrl(consumeAuthRedirect()))
        }}
        navigateToSignIn={() => go(SIGN_IN_PATH)}
        navigateToSignUp={() => go(SIGN_IN_PATH)}
      />
    </main>
  )
}
