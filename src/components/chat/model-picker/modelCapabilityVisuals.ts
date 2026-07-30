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
import type { ModelCapability } from "@t3chat/model-catalog"

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
