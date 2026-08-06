import { ZapIcon } from "lucide-react"

export const REASONING_EFFORTS = [
  {
    value: "instant",
    label: "Instant",
    icon: { kind: "component", component: ZapIcon },
  },
  {
    value: "low",
    label: "Low",
    icon: { kind: "asset", src: "/BrainIconLow.svg" },
  },
  {
    value: "medium",
    label: "Medium",
    icon: { kind: "asset", src: "/BrainIconMedium.svg" },
  },
  {
    value: "high",
    label: "High",
    icon: { kind: "asset", src: "/BrainIconHigh.svg" },
  },
] as const

export type ReasoningEffort = (typeof REASONING_EFFORTS)[number]["value"]
export type ReasoningEffortOption = (typeof REASONING_EFFORTS)[number]
