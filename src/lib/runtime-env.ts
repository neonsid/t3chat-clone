export function hasWindow(): boolean {
  return "window" in globalThis
}

export function hasDocument(): boolean {
  return "document" in globalThis
}

export function hasResizeObserver(): boolean {
  return "ResizeObserver" in globalThis
}
