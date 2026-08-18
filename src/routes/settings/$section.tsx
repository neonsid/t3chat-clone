import { createFileRoute, notFound } from "@tanstack/react-router"

import { SettingsPlaceholder } from "@/components/settings/SettingsPlaceholder"
import {
  isSettingsPlaceholderSection,
  getSettingsTabLabel,
} from "@/components/settings/logic"

export const Route = createFileRoute("/settings/$section")({
  beforeLoad: ({ params }) => {
    if (!isSettingsPlaceholderSection(params.section)) {
      throw notFound()
    }
  },
  component: SettingsSectionRoute,
})

function SettingsSectionRoute() {
  const { section } = Route.useParams()
  if (!isSettingsPlaceholderSection(section)) {
    throw notFound()
  }

  return <SettingsPlaceholder title={getSettingsTabLabel(section)} />
}
