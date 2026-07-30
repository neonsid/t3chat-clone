import { Tooltip } from "@/components/motion/tooltip"
import { formatCost } from "@/components/chat/model-picker/modelPickerUtils"
import { cn } from "@/lib/utils"

const SLOTS = [0, 1, 2] as const
const TIER_BOUNDS = [0.5, 1.5, 5, 15] as const

function resolveModelPriceMeter(inputCostPerMillion: number | null) {
  if (inputCostPerMillion === null) {
    return {
      tier: 0,
      overflow: false,
      unknown: true,
      label: "Pricing unavailable",
    }
  }

  if (inputCostPerMillion === 0) {
    return { tier: 0, overflow: false, unknown: false, label: "Free" }
  }

  const bound = TIER_BOUNDS.findIndex((limit) => inputCostPerMillion < limit)
  return {
    tier: bound === -1 ? 3 : bound,
    overflow: bound === -1,
    unknown: false,
    label: `$${formatCost(inputCostPerMillion)} per 1M input tokens`,
  }
}

type ModelPriceMeterProps = {
  inputCostPerMillion: number | null
  className?: string
}

/**
 * Three-slot cost meter: filled slots read as `$`, empty ones as dots, and a
 * trailing `+` marks models past the top band.
 */
export function ModelPriceMeter({
  inputCostPerMillion,
  className,
}: ModelPriceMeterProps) {
  const meter = resolveModelPriceMeter(inputCostPerMillion)

  return (
    <Tooltip content={meter.label} wrapperClassName="shrink-0">
      <span
        className={cn(
          "inline-flex items-center font-mono text-xs leading-none tracking-tight",
          meter.overflow ? "text-rose-400" : "text-emerald-500",
          meter.unknown && "text-muted-foreground",
          className
        )}
        aria-label={meter.label}
      >
        {SLOTS.map((slot) =>
          slot < meter.tier ? (
            <span key={slot}>$</span>
          ) : (
            <span key={slot} className="px-px text-muted-foreground/70">
              ·
            </span>
          )
        )}
        {meter.overflow ? <span>+</span> : null}
      </span>
    </Tooltip>
  )
}
