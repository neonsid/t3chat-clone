import { useEffect, useState } from "react"

export function useStreamingDisclosure(
  isActive: boolean,
  behavior: "follow" | "expand-only"
) {
  const [expanded, setExpanded] = useState(isActive)
  const [userToggled, setUserToggled] = useState(false)

  useEffect(() => {
    if (userToggled) return
    if (behavior === "follow") {
      setExpanded(isActive)
      return
    }
    if (isActive) setExpanded(true)
  }, [behavior, isActive, userToggled])

  function toggle() {
    setUserToggled(true)
    setExpanded((value) => !value)
  }

  return { expanded, toggle }
}
