import type { ReactNode } from "react"

import { ContextMenuItem } from "@/components/motion/context-menu"
import type { ContextMenuItemProps } from "@/components/motion/context-menu"

export type ContextMenuItemData = Omit<
  ContextMenuItemProps,
  "children" | "textValue"
> & {
  id: string
  label: string
  icon?: ReactNode
  textValue?: string
}

type ContextMenuItemListProps = {
  items: readonly ContextMenuItemData[]
}

export function ContextMenuItemList({ items }: ContextMenuItemListProps) {
  return items.map(({ id, label, icon, textValue, ...itemProps }) => (
    <ContextMenuItem key={id} textValue={textValue ?? label} {...itemProps}>
      {icon}
      {label}
    </ContextMenuItem>
  ))
}
