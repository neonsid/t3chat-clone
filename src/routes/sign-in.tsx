import { useSignIn, useUser } from "@clerk/tanstack-react-start"
import { Navigate, createFileRoute } from "@tanstack/react-router"
import { MessageCircleIcon } from "lucide-react"
import { useState } from "react"

import {
  SSO_CALLBACK_PATH,
  getSafeAuthRedirect,
  rememberAuthRedirect,
} from "@/lib/auth"

export const Route = createFileRoute("/sign-in")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect_url: getSafeAuthRedirect(search.redirect_url),
  }),
  component: SignInRoute,
})

function SignInRoute() {
  const { isLoaded, isSignedIn } = useUser()
  const { signIn, fetchStatus } = useSignIn()
  const { redirect_url: redirectUrl } = Route.useSearch()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)

  if (isLoaded && isSignedIn) {
    return <Navigate to={redirectUrl} replace />
  }

  const isBusy = !isLoaded || isStarting || fetchStatus === "fetching"

  async function continueWithGoogle() {
    if (isBusy) return

    setErrorMessage(null)
    setIsStarting(true)
    rememberAuthRedirect(redirectUrl)

    const { error } = await signIn.sso({
      strategy: "oauth_google",
      redirectUrl,
      redirectCallbackUrl: SSO_CALLBACK_PATH,
    })

    if (error) {
      setErrorMessage(error.message || "Could not start Google sign-in.")
      setIsStarting(false)
    }
  }

  return (
    <main className="flex h-dvh items-center justify-center overflow-y-auto bg-background px-5 py-10 text-foreground">
      <div className="flex w-full max-w-[22rem] flex-col items-center">
        <MessageCircleIcon
          aria-hidden="true"
          className="size-10 text-primary"
          strokeWidth={1.75}
        />
        <h1 className="mt-5 text-center text-[1.65rem] font-semibold tracking-tight">
          Sign in to T3 Chat
        </h1>

        <div className="mt-8 w-full rounded-md bg-[color-mix(in_srgb,var(--foreground)_9%,var(--background))] p-1">
          <div className="rounded-[5px] bg-card px-5 py-5">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void continueWithGoogle()}
              className="flex h-14 w-full cursor-pointer items-center justify-center gap-3 rounded-md border border-border bg-accent text-[15px] font-medium text-foreground transition-colors hover:bg-[color-mix(in_srgb,var(--accent)_88%,var(--foreground)_12%)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              <GoogleGlyph />
              Continue with Google
            </button>

            {errorMessage ? (
              <p className="mt-3 text-center text-sm text-destructive" role="alert">
                {errorMessage}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  )
}

function GoogleGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
      />
    </svg>
  )
}
