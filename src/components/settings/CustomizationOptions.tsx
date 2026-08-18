import { useState } from "react"

import {
  CUSTOMIZATION_BEHAVIOR_OPTIONS,
  CUSTOMIZATION_VISUAL_OPTIONS,
} from "@/components/settings/constants"
import { SettingsToggleRow } from "@/components/settings/SettingsToggleRow"

export function CustomizationBehaviorOptions() {
  const [values, setValues] = useState({
    disableExternalLinkWarning:
      CUSTOMIZATION_BEHAVIOR_OPTIONS[0].defaultChecked,
    invertSendEnter: CUSTOMIZATION_BEHAVIOR_OPTIONS[1].defaultChecked,
  })

  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight">Behavior Options</h2>
      <div className="mt-2">
        {CUSTOMIZATION_BEHAVIOR_OPTIONS.map((option) => (
          <SettingsToggleRow
            key={option.id}
            title={option.title}
            description={option.description}
            checked={values[option.id]}
            onCheckedChange={(checked) =>
              setValues({ ...values, [option.id]: checked })
            }
          />
        ))}
      </div>
    </section>
  )
}

export function CustomizationVisualOptions() {
  const [values, setValues] = useState({
    boringTheme: CUSTOMIZATION_VISUAL_OPTIONS[0].defaultChecked,
    hidePersonalInformation: CUSTOMIZATION_VISUAL_OPTIONS[1].defaultChecked,
    disableThematicBreaks: CUSTOMIZATION_VISUAL_OPTIONS[2].defaultChecked,
    statsForNerds: CUSTOMIZATION_VISUAL_OPTIONS[3].defaultChecked,
    minimalistCommandMenu: CUSTOMIZATION_VISUAL_OPTIONS[4].defaultChecked,
  })

  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight">Visual Options</h2>
      <div className="mt-2">
        {CUSTOMIZATION_VISUAL_OPTIONS.map((option) => (
          <SettingsToggleRow
            key={option.id}
            title={option.title}
            description={option.description}
            checked={values[option.id]}
            onCheckedChange={(checked) =>
              setValues({ ...values, [option.id]: checked })
            }
          />
        ))}
      </div>
    </section>
  )
}
