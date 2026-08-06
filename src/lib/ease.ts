export const EASE_OUT = [0.16, 1, 0.3, 1] as const

/** Overlay panel entrances — modals and menus summoned by pointer. */
export const SPRING_PANEL = {
  type: "spring",
  stiffness: 420,
  damping: 40,
  mass: 0.5,
} as const

/** Shared-layout glides — active rows and indicators moving between positions. */
export const SPRING_LAYOUT = {
  type: "spring",
  stiffness: 360,
  damping: 32,
  mass: 0.6,
} as const
