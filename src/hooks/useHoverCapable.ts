import { HOVER_CAPABLE_MEDIA_QUERY } from "@/hooks/constants"
import { useMediaQuery } from "@/hooks/useMediaQuery"

/**
 * Returns true only on devices that have a true hover (mouse / trackpad).
 * Touch devices fire phantom `:hover` on tap that sticks until tap-elsewhere
 * — gate hover-only effects (scale lifts, magnetic pulls) behind this.
 */
export function useHoverCapable() {
  return useMediaQuery(HOVER_CAPABLE_MEDIA_QUERY)
}
