import { MOBILE_MEDIA_QUERY } from "@/hooks/constants"
import { useMediaQuery } from "@/hooks/useMediaQuery"

export function useIsMobile() {
  return useMediaQuery(MOBILE_MEDIA_QUERY)
}
