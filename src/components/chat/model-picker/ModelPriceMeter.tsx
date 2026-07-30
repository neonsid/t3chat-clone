import { Tooltip } from "@/components/motion/tooltip"
import { formatCost } from "@/components/chat/model-picker/modelPickerUtils"
import { cn } from "@/lib/utils"

const SLOTS = [0, 1, 2] as const
const TIER_BOUNDS = [0.5, 1.5, 5, 15] as const
const TIER_LABELS = [
  "Low model cost",
  "Medium model cost",
  "High model cost",
  "Very high model cost",
] as const

function resolveModelPriceMeter(inputCostPerMillion: number | null) {
  if (inputCostPerMillion === null) {
    return {
      tier: 0,
      overflow: false,
      unknown: true,
      title: "Model pricing unavailable",
    }
  }

  if (inputCostPerMillion === 0) {
    return {
      tier: 0,
      overflow: false,
      unknown: false,
      title: "Free model",
    }
  }

  const bound = TIER_BOUNDS.findIndex((limit) => inputCostPerMillion < limit)
  return {
    tier: bound === -1 ? 3 : bound,
    overflow: bound === -1,
    unknown: false,
    title: TIER_LABELS[bound === -1 ? TIER_LABELS.length - 1 : bound],
  }
}

type ModelPriceMeterProps = {
  inputCostPerMillion: number | null
  outputCostPerMillion: number | null
  className?: string
}

function formatPriceDetails(
  inputCostPerMillion: number | null,
  outputCostPerMillion: number | null
): string {
  const prices = [
    inputCostPerMillion === null
      ? null
      : `$${formatCost(inputCostPerMillion)} input`,
    outputCostPerMillion === null
      ? null
      : `$${formatCost(outputCostPerMillion)} output`,
  ].filter((price): price is string => price !== null)

  return prices.length > 0
    ? `${prices.join(" · ")} / 1M tokens`
    : "Input and output pricing unavailable"
}

/**
 * Three-slot cost meter: filled slots read as `$`, empty ones as dots, and a
 * trailing `+` marks models past the top band.
 */
export function ModelPriceMeter({
  inputCostPerMillion,
  outputCostPerMillion,
  className,
}: ModelPriceMeterProps) {
  const meter = resolveModelPriceMeter(inputCostPerMillion)
  const details = formatPriceDetails(inputCostPerMillion, outputCostPerMillion)
  const label = `${meter.title}. ${details}`

  return (
    <Tooltip
      content={
        <span className="flex flex-col gap-0.5 text-left">
          <span>{meter.title}</span>
          <span className="font-normal text-popover-foreground/80">
            {details}
          </span>
        </span>
      }
      wrapperClassName="shrink-0"
      className="px-3 py-2"
    >
      <span
        className={cn(
          "inline-flex items-center font-mono text-xs leading-none tracking-tight",
          meter.overflow ? "text-rose-400" : "text-emerald-500",
          meter.unknown && "text-muted-foreground",
          className
        )}
        aria-label={label}
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
