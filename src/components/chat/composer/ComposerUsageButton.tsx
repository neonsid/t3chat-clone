import { ChartNoAxesColumnIcon, TriangleAlertIcon } from "lucide-react"

import { COMPOSER_USAGE } from "@/components/chat/composer/constants"
import { Tooltip } from "@/components/shared/motion/tooltip"
import type { ComposerUsageStripData } from "@/hooks/useComposerUsage"
import { cn } from "@/lib/utils"

export function ComposerUsageButton({
  usage,
}: {
  usage?: ComposerUsageStripData
}) {
  if (!usage?.contextLabel && !usage?.costLabel) return null

  const danger = usage.longChat
  const Icon = danger ? TriangleAlertIcon : ChartNoAxesColumnIcon

  return (
    <Tooltip
      content={<ComposerUsageTooltip usage={usage} />}
      side="top"
      align="start"
      className="min-w-52 rounded-md px-3 py-2.5 font-normal whitespace-normal"
    >
      <button
        type="button"
        aria-label={
          danger ? COMPOSER_USAGE.longChatAriaLabel : COMPOSER_USAGE.ariaLabel
        }
        className={cn(
          "inline-flex size-8 shrink-0 cursor-default items-center justify-center rounded-md transition-colors",
          danger
            ? "text-red-400 hover:bg-accent"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )}
      >
        <Icon className="size-4" />
      </button>
    </Tooltip>
  )
}

function ComposerUsageTooltip({ usage }: { usage: ComposerUsageStripData }) {
  const fillPercent =
    usage.contextFill != null ? Math.round(usage.contextFill * 100) : null

  return (
    <div className="flex w-52 flex-col gap-2.5 text-left text-xs">
      {usage.contextLabel ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-muted-foreground">{COMPOSER_USAGE.context}</span>
          <div className="flex items-center gap-1.5">
            <span className="tabular-nums text-popover-foreground">
              {usage.contextLabel}
            </span>
            {usage.longChat ? (
              <TriangleAlertIcon
                className="size-3.5 shrink-0 text-red-400"
                aria-hidden="true"
              />
            ) : null}
          </div>
          {fillPercent != null ? (
            <div
              className="h-1 overflow-hidden rounded-md bg-muted"
              aria-hidden="true"
            >
              <div
                className={cn(
                  "h-full rounded-md",
                  usage.longChat
                    ? "bg-red-400"
                    : fillPercent >= COMPOSER_USAGE.warnRatio * 100
                      ? "bg-amber-400"
                      : "bg-foreground/70"
                )}
                style={{ width: `${fillPercent}%` }}
              />
            </div>
          ) : null}
          {usage.inputTokensLabel || usage.outputTokensLabel ? (
            <div className="flex flex-col gap-1">
              {usage.inputTokensLabel ? (
                <UsageRow
                  label={COMPOSER_USAGE.input}
                  value={usage.inputTokensLabel}
                  muted
                />
              ) : null}
              {usage.outputTokensLabel ? (
                <UsageRow
                  label={COMPOSER_USAGE.output}
                  value={usage.outputTokensLabel}
                  muted
                />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {usage.costLabel ? (
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground">{COMPOSER_USAGE.cost}</span>
          <UsageRow label={COMPOSER_USAGE.thread} value={usage.costLabel} />
          {usage.lastTurnCostLabel ? (
            <UsageRow
              label={COMPOSER_USAGE.lastTurn}
              value={usage.lastTurnCostLabel}
              muted
            />
          ) : null}
        </div>
      ) : null}

      {usage.cacheHitsLabel || usage.cacheWritesLabel ? (
        <div className="flex flex-col gap-1">
          {usage.cacheHitsLabel ? (
            <UsageRow
              label={COMPOSER_USAGE.cacheHits}
              value={usage.cacheHitsLabel}
            />
          ) : null}
          {usage.cacheWritesLabel ? (
            <UsageRow
              label={COMPOSER_USAGE.cacheWrites}
              value={usage.cacheWritesLabel}
            />
          ) : null}
        </div>
      ) : null}

      {usage.longChat ? (
        <p className="text-[11px] leading-4 font-normal text-red-400">
          {COMPOSER_USAGE.longChat}
        </p>
      ) : null}
      {usage.tokensEstimated ? (
        <p className="text-[11px] leading-4 font-normal text-muted-foreground">
          {COMPOSER_USAGE.tokensEstimated}
        </p>
      ) : null}
      {usage.costLabel &&
      usage.cacheReadEstimated &&
      (usage.cacheHitsLabel || usage.cacheWritesLabel) ? (
        <p className="text-[11px] leading-4 font-normal text-muted-foreground">
          {COMPOSER_USAGE.cacheEstimated}
        </p>
      ) : null}
    </div>
  )
}

function UsageRow({
  label,
  value,
  muted,
}: {
  label: string
  value: string
  muted?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 tabular-nums",
        muted ? "text-muted-foreground" : "text-popover-foreground"
      )}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
