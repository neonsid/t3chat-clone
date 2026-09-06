import { createFileRoute } from "@tanstack/react-router"

import { SharedThreadPage } from "@/components/chat/share/SharedThreadPage"

export const Route = createFileRoute("/share/$publicId")({
  component: ShareRoute,
  head: () => ({
    meta: [
      {
        title: "Shared chat",
      },
    ],
  }),
})

function ShareRoute() {
  const { publicId } = Route.useParams()
  return <SharedThreadPage publicId={publicId} />
}
