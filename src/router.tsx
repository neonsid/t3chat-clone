import { ConvexQueryClient } from "@convex-dev/react-query"
import { QueryClient } from "@tanstack/react-query"
import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"
import { ClerkProvider, useAuth } from "@clerk/tanstack-react-start"
import { ConvexProviderWithClerk } from "convex/react-clerk"

import { installVitePreloadRecovery } from "./lib/vite-preload-recovery"
import { routeTree } from "./routeTree.gen"
import { AppStateProvider } from "./stores/AppStateProvider"

installVitePreloadRecovery()

export function getRouter() {
  const convexUrl = import.meta.env.VITE_CONVEX_URL

  if (!convexUrl) {
    throw new Error(
      "VITE_CONVEX_URL is not set. Run `pnpm convex:dev` to configure Convex."
    )
  }

  const convexQueryClient = new ConvexQueryClient(convexUrl)
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
      },
    },
  })

  convexQueryClient.connect(queryClient)

  const router = createTanStackRouter({
    routeTree,
    context: { queryClient, convexClient: convexQueryClient.convexClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    InnerWrap: ({ children }) => (
      <ClerkProvider
        signInUrl="/sign-in"
        signInFallbackRedirectUrl="/"
        signUpFallbackRedirectUrl="/"
      >
        <ConvexProviderWithClerk
          client={convexQueryClient.convexClient}
          useAuth={useAuth}
        >
          <AppStateProvider>{children}</AppStateProvider>
        </ConvexProviderWithClerk>
      </ClerkProvider>
    ),
  })

  setupRouterSsrQueryIntegration({ router, queryClient })

  return router
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
