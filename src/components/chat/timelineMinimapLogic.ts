export const TIMELINE_MINIMAP_ITEM_SPACING = 8
export const TIMELINE_MINIMAP_MIN_ITEMS = 2
export const TIMELINE_MINIMAP_MAX_HEIGHT_CSS = "calc(100vh - 18rem)"
export const TIMELINE_CONTENT_MAX_WIDTH = 768
export const TIMELINE_MINIMAP_PERSISTENT_GUTTER = 48
export const TIMELINE_MINIMAP_HIT_STRIP_LEFT = 12
export const TIMELINE_MINIMAP_HIT_STRIP_MAX_WIDTH = 40
export const TIMELINE_MINIMAP_EXPANDED_HIT_STRIP_WIDTH = "22rem"

export function resolveTimelineMinimapHeightStyle(itemCount: number): string {
  const naturalHeight = Math.max(1, (itemCount - 1) * TIMELINE_MINIMAP_ITEM_SPACING)
  return `min(${naturalHeight}px, ${TIMELINE_MINIMAP_MAX_HEIGHT_CSS})`
}

export function resolveTimelineMinimapTopPercent(
  index: number,
  itemCount: number
): number {
  if (itemCount <= 1) return 0
  return (Math.max(0, Math.min(index, itemCount - 1)) / (itemCount - 1)) * 100
}

export function resolveTimelineMinimapIndexFromPointer(input: {
  readonly itemCount: number
  readonly railTop: number
  readonly railHeight: number
  readonly pointerY: number
}): number | null {
  if (input.itemCount <= 0 || input.railHeight <= 0) return null
  if (input.itemCount === 1) return 0

  const progress = Math.max(
    0,
    Math.min(1, (input.pointerY - input.railTop) / input.railHeight)
  )
  return Math.max(
    0,
    Math.min(input.itemCount - 1, Math.round(progress * (input.itemCount - 1)))
  )
}

export function resolveTimelineMinimapHasPersistentGutter(
  viewportWidth: number
): boolean {
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) return false
  const contentWidth = Math.min(viewportWidth, TIMELINE_CONTENT_MAX_WIDTH)
  const sideGutter = Math.max(0, (viewportWidth - contentWidth) / 2)
  return sideGutter >= TIMELINE_MINIMAP_PERSISTENT_GUTTER
}

export function resolveTimelineMinimapHitStripWidth(
  viewportWidth: number
): number {
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) return 0
  const contentWidth = Math.min(viewportWidth, TIMELINE_CONTENT_MAX_WIDTH)
  const sideGutter = Math.max(0, (viewportWidth - contentWidth) / 2)
  return Math.max(
    0,
    Math.min(
      TIMELINE_MINIMAP_HIT_STRIP_MAX_WIDTH,
      Math.floor(sideGutter) - TIMELINE_MINIMAP_HIT_STRIP_LEFT
    )
  )
}

export function resolveTimelineMinimapInteractiveWidth(
  collapsedWidth: number,
  expanded: boolean
): number | string {
  return expanded
    ? TIMELINE_MINIMAP_EXPANDED_HIT_STRIP_WIDTH
    : collapsedWidth
}
