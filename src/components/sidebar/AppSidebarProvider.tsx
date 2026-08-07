import type { ReactNode } from "react"
import { useShallow } from "zustand/react/shallow"

import { SidebarProvider } from "@/components/shared/ui/sidebar"
import { useSidebarUiStore } from "@/stores/AppStateProvider"

export function AppSidebarProvider({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const sidebar = useSidebarUiStore(
    useShallow((state) => ({
      desktopOpen: state.desktopOpen,
      mobileOpen: state.mobileOpen,
      setDesktopOpen: state.setDesktopOpen,
      setMobileOpen: state.setMobileOpen,
    }))
  )

  return (
    <SidebarProvider
      open={sidebar.desktopOpen}
      onOpenChange={sidebar.setDesktopOpen}
      openMobile={sidebar.mobileOpen}
      onOpenMobileChange={sidebar.setMobileOpen}
      className={className}
    >
      {children}
    </SidebarProvider>
  )
}
