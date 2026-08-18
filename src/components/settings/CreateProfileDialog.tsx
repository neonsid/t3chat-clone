import { useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { MessageSquareIcon, XIcon } from "lucide-react"

import {
  COPY_FROM_SCRATCH_ID,
  CUSTOMIZATION_CREATE_PROFILE,
} from "@/components/settings/constants"
import { getCopyFromOptions } from "@/components/settings/logic"
import { SettingsSelect } from "@/components/settings/SettingsSelect"
import { Button } from "@/components/shared/ui/button"
import { Input } from "@/components/shared/ui/input"

export function CreateProfileDialog({
  open,
  onOpenChange,
  profiles,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  profiles: ReadonlyArray<{ id: string; name: string }>
  onCreate: (input: { name: string; copyFromId: string }) => void
}) {
  const [formKey, setFormKey] = useState(0)

  function handleOpenChange(next: boolean) {
    if (next) setFormKey((key) => key + 1)
    onOpenChange(next)
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={handleOpenChange}
      disablePointerDismissal
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[200] bg-black/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-sm" />
        <CreateProfileDialogForm
          key={formKey}
          profiles={profiles}
          onOpenChange={onOpenChange}
          onCreate={onCreate}
        />
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function CreateProfileDialogForm({
  profiles,
  onOpenChange,
  onCreate,
}: {
  profiles: ReadonlyArray<{ id: string; name: string }>
  onOpenChange: (open: boolean) => void
  onCreate: (input: { name: string; copyFromId: string }) => void
}) {
  const [name, setName] = useState("")
  const [copyFromId, setCopyFromId] = useState<string>(COPY_FROM_SCRATCH_ID)
  const trimmedName = name.trim()
  const copyFromOptions = getCopyFromOptions(profiles)

  function handleSubmit() {
    if (trimmedName.length === 0) return
    onCreate({ name: trimmedName, copyFromId })
    onOpenChange(false)
  }

  return (
    <Dialog.Popup className="fixed top-1/2 left-1/2 z-[200] w-[min(calc(100vw-2rem),26rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-lg outline-none transition duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
      <div className="flex items-start justify-between gap-4">
        <Dialog.Title className="text-lg font-semibold">
          {CUSTOMIZATION_CREATE_PROFILE.title}
        </Dialog.Title>
        <Dialog.Close
          render={
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={CUSTOMIZATION_CREATE_PROFILE.closeLabel}
              className="rounded-md text-muted-foreground hover:text-foreground"
            />
          }
        >
          <XIcon />
        </Dialog.Close>
      </div>
      <Dialog.Description className="mt-1 text-sm text-muted-foreground">
        {CUSTOMIZATION_CREATE_PROFILE.description}
      </Dialog.Description>

      <form
        className="mt-6 flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault()
          handleSubmit()
        }}
      >
        <div>
          <label
            htmlFor="create-profile-name"
            className="text-sm font-medium text-foreground"
          >
            {CUSTOMIZATION_CREATE_PROFILE.nameLabel}
          </label>
          <div className="relative mt-2">
            <MessageSquareIcon
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground"
              aria-hidden="true"
            />
            <Input
              id="create-profile-name"
              value={name}
              maxLength={CUSTOMIZATION_CREATE_PROFILE.nameMax}
              placeholder={CUSTOMIZATION_CREATE_PROFILE.namePlaceholder}
              onChange={(event) => setName(event.target.value)}
              className="h-11 rounded-md border-border bg-transparent pl-10"
            />
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-foreground">
            {CUSTOMIZATION_CREATE_PROFILE.copyFromLabel}
          </p>
          <SettingsSelect
            value={copyFromId}
            options={copyFromOptions}
            onValueChange={setCopyFromId}
            ariaLabel={CUSTOMIZATION_CREATE_PROFILE.copyFromAriaLabel}
            className="mt-2 h-11 rounded-md bg-transparent"
          />
        </div>

        <div className="mt-1 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            className="rounded-md"
            onClick={() => onOpenChange(false)}
          >
            {CUSTOMIZATION_CREATE_PROFILE.cancel}
          </Button>
          <Button
            type="submit"
            className="rounded-md"
            disabled={trimmedName.length === 0}
          >
            {CUSTOMIZATION_CREATE_PROFILE.submit}
          </Button>
        </div>
      </form>
    </Dialog.Popup>
  )
}
