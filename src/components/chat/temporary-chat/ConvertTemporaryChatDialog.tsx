import { Dialog } from "@base-ui/react/dialog"

import { TEMPORARY_CHAT } from "@/components/chat/temporary-chat/constants"
import { Button } from "@/components/shared/ui/button"

export function ConvertTemporaryChatDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isPending: boolean
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[200] bg-black/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-sm" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-[200] w-[min(calc(100vw-2rem),28rem)] -translate-x-1/2 -translate-y-1/2 rounded-md border border-border bg-card p-6 text-card-foreground shadow-lg outline-none transition duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <Dialog.Title className="text-lg font-semibold">
            {TEMPORARY_CHAT.convertTitle}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">
            {TEMPORARY_CHAT.convertDescription}
          </Dialog.Description>
          <div className="mt-8 flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              className="rounded-md"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              {TEMPORARY_CHAT.cancel}
            </Button>
            <Button
              type="button"
              className="rounded-md"
              disabled={isPending}
              onClick={onConfirm}
            >
              {TEMPORARY_CHAT.convert}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
