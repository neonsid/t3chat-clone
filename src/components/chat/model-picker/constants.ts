import {
  BrainIcon,
  EyeIcon,
  FileTextIcon,
  ImagePlusIcon,
  SlidersHorizontalIcon,
  WrenchIcon,
  ZapIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { MODEL_CAPABILITIES, MODEL_PROVIDERS } from "@t3chat/model-catalog"
import type { ModelCapability } from "@t3chat/model-catalog"
import { CHAT_MODEL_CATALOG } from "@/lib/chat-models"

type ModelCapabilityVisual = {
  readonly icon: LucideIcon
  /** Tinted chip surface plus matching icon colour. */
  readonly className: string
}

export const MODEL_CAPABILITY_VISUALS: Record<
  ModelCapability,
  ModelCapabilityVisual
> = {
  fast: {
    icon: ZapIcon,
    className: "bg-amber-500/12 text-amber-400",
  },
  vision: {
    icon: EyeIcon,
    className: "bg-emerald-500/12 text-emerald-400",
  },
  reasoning: {
    icon: BrainIcon,
    className: "bg-violet-500/12 text-violet-400",
  },
  "effort-control": {
    icon: SlidersHorizontalIcon,
    className: "bg-pink-500/12 text-pink-400",
  },
  "tool-calling": {
    icon: WrenchIcon,
    className: "bg-rose-500/12 text-rose-400",
  },
  "image-generation": {
    icon: ImagePlusIcon,
    className: "bg-orange-500/12 text-orange-400",
  },
  pdf: {
    icon: FileTextIcon,
    className: "bg-indigo-500/12 text-indigo-400",
  },
}

export const MODEL_CAPABILITY_LABELS = new Map(
  MODEL_CAPABILITIES.map((capability) => [capability.id, capability.label])
)
export const MAX_VISIBLE_MODEL_CAPABILITIES = 3

const providerIdsWithModels = new Set(
  CHAT_MODEL_CATALOG.map((model) => model.providerId)
)

/** Providers without catalog entries are left off the rail. */
export const MODEL_PICKER_RAIL_PROVIDERS = MODEL_PROVIDERS.filter((provider) =>
  providerIdsWithModels.has(provider.id)
)

export const MODEL_PRICE_METER_SLOTS = [0, 1, 2] as const
export const MODEL_PRICE_TIER_BOUNDS = [0.5, 1.5, 5, 15] as const
export const MODEL_PRICE_TIER_LABELS = [
  "Low model cost",
  "Medium model cost",
  "High model cost",
  "Very high model cost",
] as const

export const MODEL_PICKER_RAIL_TAB_CLASS_NAME =
  "inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-foreground/70 transition-[color,background-color,transform] hover:scale-105 hover:bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none data-active:bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] data-active:text-foreground"
export const MODEL_PICKER_RAIL_END_CUE_FADE_DISTANCE = 48
export const INITIAL_MODEL_PICKER_RAIL_SCROLL_STATE = {
  overflowing: false,
  endCueOpacity: 0,
}
