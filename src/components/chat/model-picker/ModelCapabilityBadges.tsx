import { MODEL_CAPABILITIES } from "@t3chat/model-catalog"
import type { ModelCapability } from "@t3chat/model-catalog"

import { MODEL_CAPABILITY_VISUALS } from "@/components/chat/model-picker/modelCapabilityVisuals"
import { Tooltip } from "@/components/motion/tooltip"
import { cn } from "@/lib/utils"

const CAPABILITY_LABELS = new Map(
  MODEL_CAPABILITIES.map((capability) => [capability.id, capability.label])
)

const MAX_VISIBLE_CAPABILITIES = 3

type ModelCapabilityBadgesProps = {
  capabilities: ReadonlyArray<ModelCapability>
  className?: string
}

export function ModelCapabilityBadges({
  capabilities,
  className,
}: ModelCapabilityBadgesProps) {
  if (capabilities.length === 0) return null

  const visibleCapabilities = capabilities.slice(0, MAX_VISIBLE_CAPABILITIES)

  return (
    <span
      className={cn(
        "mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] p-2 shadow-sm",
        className
      )}
    >
      {visibleCapabilities.map((capability) => {
        const visual = MODEL_CAPABILITY_VISUALS[capability]
        const label = CAPABILITY_LABELS.get(capability) ?? capability
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
