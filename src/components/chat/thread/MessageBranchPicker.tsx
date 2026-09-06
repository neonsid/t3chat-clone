import { GitForkIcon } from "lucide-react"

import { MessageModelActionPicker } from "@/components/chat/thread/MessageModelActionPicker"
import { MESSAGE_BRANCH } from "@/components/chat/thread/constants"

type MessageBranchPickerProps = {
  disabled?: boolean
  onBranch?: () => void | Promise<void>
}

export function MessageBranchPicker({
  disabled,
  onBranch,
}: MessageBranchPickerProps) {
  return (
    <MessageModelActionPicker
      disabled={disabled}
      label={MESSAGE_BRANCH.label}
      primaryLabel={MESSAGE_BRANCH.branchOff}
      modelAriaPrefix="Branch with"
      icon={GitForkIcon}
      onAction={onBranch ? () => onBranch() : undefined}
    />
  )
}
