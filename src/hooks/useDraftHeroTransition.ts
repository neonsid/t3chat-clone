import {
  useLayoutEffect,
  useRef,
  type RefCallback,
} from "react"

export const DRAFT_HERO_TRANSITION_ANIMATION_ID = "t3-draft-hero-transition"
export const DRAFT_HERO_TRANSITION_DURATION_MS = 180
export const DRAFT_HERO_TRANSITION_EASING = "cubic-bezier(0.4, 0, 0.2, 1)"

export function useDraftHeroTransition(isDraftHeroState: boolean) {
  const transitionGroupRef = useRef<HTMLDivElement | null>(null)
  const composerAnchorRef = useRef<HTMLDivElement | null>(null)
  const previousStateRef = useRef(isDraftHeroState)
  const previousComposerRectRef = useRef<DOMRect | null>(null)
  const animationRef = useRef<Animation | null>(null)

  const attachTransitionGroupRef: RefCallback<HTMLDivElement> = (element) => {
    transitionGroupRef.current = element
  }

  const attachComposerAnchorRef: RefCallback<HTMLDivElement> = (element) => {
    composerAnchorRef.current = element
  }

  const captureComposerRect = () => {
    previousComposerRectRef.current =
      composerAnchorRef.current?.getBoundingClientRect() ?? null
  }

  useLayoutEffect(() => {
    const transitionGroup = transitionGroupRef.current
    const nextComposerRect =
      composerAnchorRef.current?.getBoundingClientRect() ?? null
    const stateChanged = previousStateRef.current !== isDraftHeroState
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

    animationRef.current?.cancel()
    animationRef.current = null

    const previousComposerRect = previousComposerRectRef.current
    if (
      stateChanged &&
      !prefersReducedMotion &&
      transitionGroup &&
      previousComposerRect &&
      nextComposerRect &&
      typeof transitionGroup.animate === "function"
    ) {
      const translateX = previousComposerRect.left - nextComposerRect.left
      const translateY = previousComposerRect.top - nextComposerRect.top
      if (Math.abs(translateX) >= 0.5 || Math.abs(translateY) >= 0.5) {
        const animation = transitionGroup.animate(
          [
            { transform: `translate3d(${translateX}px, ${translateY}px, 0)` },
            { transform: "translate3d(0, 0, 0)" },
          ],
          {
            duration: DRAFT_HERO_TRANSITION_DURATION_MS,
            easing: DRAFT_HERO_TRANSITION_EASING,
          }
        )
        animation.id = DRAFT_HERO_TRANSITION_ANIMATION_ID
        animationRef.current = animation
        void animation.finished
          .catch(() => undefined)
          .then(() => {
            if (animationRef.current !== animation) return
            animationRef.current = null
          })
      }
    }

    previousStateRef.current = isDraftHeroState
    previousComposerRectRef.current = nextComposerRect
  }, [isDraftHeroState])

  return [
    attachTransitionGroupRef,
    attachComposerAnchorRef,
    captureComposerRect,
  ] as const
}
