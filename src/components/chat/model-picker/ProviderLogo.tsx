import { MODEL_PROVIDER_LOGOS } from "@t3chat/model-catalog"
import type { ModelProviderId } from "@t3chat/model-catalog"

import { cn } from "@/lib/utils"

type ProviderLogoProps = {
  providerId: ModelProviderId
  className?: string
}

/**
 * The logos are inlined rather than loaded as images so they inherit
 * `currentColor` from the surrounding UI. The markup is committed as static
 * catalog data rather than accepted from user or network input.
 */
export function ProviderLogo({ providerId, className }: ProviderLogoProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center [&>svg]:size-full",
        className
      )}
      dangerouslySetInnerHTML={{ __html: MODEL_PROVIDER_LOGOS[providerId] }}
    />
  )
}
