import { SignIn, useUser } from "@clerk/tanstack-react-start"
import { Navigate, createFileRoute } from "@tanstack/react-router"
import { MessageCircleIcon } from "lucide-react"

import { DEFAULT_AUTH_REDIRECT, getSafeAuthRedirect } from "@/lib/auth"

export const Route = createFileRoute("/sign-in")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect_url: getSafeAuthRedirect(search.redirect_url),
  }),
  component: SignInRoute,
})

function SignInRoute() {
  const { isLoaded, isSignedIn } = useUser()
  const { redirect_url: redirectUrl } = Route.useSearch()

  if (isLoaded && isSignedIn) {
    return <Navigate to={redirectUrl} replace />
  }

  return (
    <main className="flex h-dvh items-center justify-center overflow-y-auto bg-background px-5 py-10 text-foreground">
      <div className="flex w-full max-w-sm flex-col items-center">
        <MessageCircleIcon
          aria-hidden="true"
          className="size-11 fill-primary/20 text-primary"
        />
        <h1 className="mt-4 text-center text-2xl font-semibold tracking-tight">
          Sign in to T3 Chat
        </h1>

        <div className="mt-6 flex w-full items-center justify-center rounded-xl border border-border bg-card p-5">
          {isLoaded ? (
            <SignIn
              routing="hash"
              oauthFlow="redirect"
              forceRedirectUrl={redirectUrl}
              signUpForceRedirectUrl={redirectUrl}
              fallbackRedirectUrl={DEFAULT_AUTH_REDIRECT}
              signUpFallbackRedirectUrl={DEFAULT_AUTH_REDIRECT}
              appearance={{
                elements: {
                  rootBox: "w-full",
                  cardBox: "w-full shadow-none",
                  card: "w-full bg-transparent shadow-none p-0",
                  header: { display: "none" },
                  socialButtonsBlockButton:
                    "h-14 rounded-xl border-border bg-transparent text-base font-medium text-foreground hover:bg-accent",
                  dividerRow: { display: "none" },
                  form: { display: "none" },
                  footer: { display: "none" },
                },
              }}
            />
          ) : null}
        </div>
      </div>
    </main>
  )
}
