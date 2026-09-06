import { RotateCcwIcon } from "lucide-react"

import {
  MessageModelActionPicker,
  type MessageModelAction,
} from "@/components/chat/thread/MessageModelActionPicker"
import { MESSAGE_RETRY } from "@/components/chat/thread/constants"

type MessageRetryPickerProps = {
  disabled?: boolean
  onRetry?: (action?: MessageModelAction) => void | Promise<void>
}

export function MessageRetryPicker({
  disabled,
  onRetry,
}: MessageRetryPickerProps) {
  return (
    <MessageModelActionPicker
      disabled={disabled}
      label={MESSAGE_RETRY.label}
      primaryLabel={MESSAGE_RETRY.retrySame}
      modelAriaPrefix="Retry with"
      icon={RotateCcwIcon}
      onAction={onRetry}
    />
  )
}
