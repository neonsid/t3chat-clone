export const TIMELINE_MINIMAP_ITEM_SPACING = 8
export const TIMELINE_MINIMAP_MIN_ITEMS = 2
export const TIMELINE_MINIMAP_MAX_HEIGHT_CSS = "calc(100vh - 18rem)"
export const TIMELINE_CONTENT_MAX_WIDTH = 768
export const TIMELINE_MINIMAP_PERSISTENT_GUTTER = 48
export const TIMELINE_MINIMAP_HIT_STRIP_LEFT = 12
export const TIMELINE_MINIMAP_HIT_STRIP_MAX_WIDTH = 40
export const TIMELINE_MINIMAP_EXPANDED_HIT_STRIP_WIDTH = "22rem"

const MARKDOWN_FENCE = /^\s{0,3}(?:```|~~~)/
const MARKDOWN_THEMATIC_BREAK = /^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/
const MARKDOWN_BLOCK_PREFIX = /^\s{0,3}(?:#{1,6}\s+|>\s?|[-*+]\s+|\d+[.)]\s+)/

/**
 * Previews render as plain text, so markdown syntax has to be flattened rather
 * than parsed. Emphasis runs require a non-word character in front of the
 * delimiter so `snake_case` identifiers survive intact.
 */
export function resolveTimelineMinimapPreviewText(
  text: string | null | undefined
): string | null {
  const preview = (text ?? "")
    .split("\n")
    .filter(
      (line) =>
        !MARKDOWN_FENCE.test(line) && !MARKDOWN_THEMATIC_BREAK.test(line)
    )
    .map((line) => line.replace(MARKDOWN_BLOCK_PREFIX, ""))
    .join(" ")
    .replace(/\\([\\`*_{}[\]()#+\-.!>~])/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/`+([^`]*)`+/g, "$1")
    .replace(/(^|[^\w*])\*{1,3}([^*\s](?:[^*\n]*[^*\s])?)\*{1,3}/g, "$1$2")
    .replace(/(^|[^\w_])_{1,3}([^_\s](?:[^_\n]*[^_\s])?)_{1,3}/g, "$1$2")
    .replace(/~~([^~\s](?:[^~\n]*[^~\s])?)~~/g, "$1")
    .replace(/\s+/g, " ")
    .trim()

  return preview.length > 0 ? preview : null
}

export function resolveTimelineMinimapHeightStyle(itemCount: number): string {
  const naturalHeight = Math.max(
    1,
    (itemCount - 1) * TIMELINE_MINIMAP_ITEM_SPACING
  )
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
  return expanded ? TIMELINE_MINIMAP_EXPANDED_HIT_STRIP_WIDTH : collapsedWidth
}
