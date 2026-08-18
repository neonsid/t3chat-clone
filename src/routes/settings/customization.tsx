import { createFileRoute } from "@tanstack/react-router"

import { CustomizationSettings } from "@/components/settings/CustomizationSettings"

export const Route = createFileRoute("/settings/customization")({
  component: CustomizationSettings,
})
