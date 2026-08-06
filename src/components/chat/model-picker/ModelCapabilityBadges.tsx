import type { ModelCapability } from "@t3chat/model-catalog"

import {
  MAX_VISIBLE_MODEL_CAPABILITIES,
  MODEL_CAPABILITY_LABELS,
  MODEL_CAPABILITY_VISUALS,
} from "@/components/chat/model-picker/constants"
import { Tooltip } from "@/components/shared/motion/tooltip"
import { cn } from "@/lib/utils"

type ModelCapabilityBadgesProps = {
  capabilities: ReadonlyArray<ModelCapability>
  className?: string
}

export function ModelCapabilityBadges({
  capabilities,
  className,
}: ModelCapabilityBadgesProps) {
  if (capabilities.length === 0) return null

  const visibleCapabilities = capabilities.slice(
    0,
    MAX_VISIBLE_MODEL_CAPABILITIES
  )

  return (
    <span
      className={cn(
        "mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] p-2 shadow-sm",
        className
      )}
    >
      {visibleCapabilities.map((capability) => {
        const visual = MODEL_CAPABILITY_VISUALS[capability]
        const label = MODEL_CAPABILITY_LABELS.get(capability) ?? capability
        const Icon = visual.icon

        return (
          <Tooltip key={capability} content={label}>
            <span
              aria-label={label}
              className={cn(
                visual.className,
                "inline-flex size-3 items-center justify-center bg-transparent"
              )}
            >
              <Icon className="size-3" />
            </span>
          </Tooltip>
        )
      })}
    </span>
  )
}
