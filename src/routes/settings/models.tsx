import { createFileRoute } from "@tanstack/react-router"

import { ModelsSettings } from "@/components/settings/ModelsSettings"

export const Route = createFileRoute("/settings/models")({
  component: ModelsSettings,
})
