import { CUSTOMIZATION_PAGE_TITLE } from "@/components/settings/constants"
import { CustomizationFonts } from "@/components/settings/CustomizationFonts"
import {
  CustomizationBehaviorOptions,
  CustomizationVisualOptions,
} from "@/components/settings/CustomizationOptions"
import { CustomizationProfile } from "@/components/settings/CustomizationProfile"

export function CustomizationSettings() {
  return (
    <div className="flex flex-col gap-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        {CUSTOMIZATION_PAGE_TITLE}
      </h1>
      <CustomizationProfile />
      <CustomizationBehaviorOptions />
      <CustomizationVisualOptions />
      <CustomizationFonts />
    </div>
  )
}
