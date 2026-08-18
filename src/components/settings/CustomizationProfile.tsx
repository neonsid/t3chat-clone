import { useState } from "react"
import type { KeyboardEvent, ReactNode } from "react"
import { InfoIcon, MessageSquareIcon, PlusIcon, XIcon } from "lucide-react"

import { CUSTOMIZATION_PROFILE } from "@/components/settings/constants"
import { canAddTrait, traitCharacterCount } from "@/components/settings/logic"
import { SettingsSelect } from "@/components/settings/SettingsSelect"
import { Tooltip } from "@/components/shared/motion/tooltip"
import { Button } from "@/components/shared/ui/button"
import { Input } from "@/components/shared/ui/input"
import { cn } from "@/lib/utils"

const PROFILE_OPTIONS = [
  { id: "default", label: CUSTOMIZATION_PROFILE.defaultName },
] as const

const fieldClassName =
  "h-auto min-h-11 rounded-md border-border bg-transparent px-3 py-2.5 pr-14"

export function CustomizationProfile() {
  const [preferredName, setPreferredName] = useState("")
  const [occupation, setOccupation] = useState("")
  const [traits, setTraits] = useState<Array<string>>([])
  const [traitDraft, setTraitDraft] = useState("")
  const [extra, setExtra] = useState("")

  const traitUsed = traitCharacterCount(traits, traitDraft)

  function tryAddTrait(value: string) {
    if (!canAddTrait(traits, value, CUSTOMIZATION_PROFILE.traitsMax)) return
    setTraits([...traits, value.trim()])
    setTraitDraft("")
  }

  function handleTraitKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" && event.key !== "Tab") return
    if (traitDraft.trim().length === 0) return
    event.preventDefault()
    tryAddTrait(traitDraft)
  }

  return (
    <section>
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold tracking-tight">
          {CUSTOMIZATION_PROFILE.title}
        </h2>
        <Tooltip content={CUSTOMIZATION_PROFILE.info} side="top">
          <button
            type="button"
            aria-label="About profiles"
            className="inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
          >
            <InfoIcon className="size-3.5" />
          </button>
        </Tooltip>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <SettingsSelect
          value="default"
          options={PROFILE_OPTIONS}
          onValueChange={() => undefined}
          ariaLabel="Customization profile"
          leadingIcon={
            <MessageSquareIcon
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
          }
        />
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={CUSTOMIZATION_PROFILE.addLabel}
          className="rounded-md"
        >
          <PlusIcon />
        </Button>
      </div>

      <div className="mt-8 flex flex-col gap-6">
        <CustomizationField
          id="customization-preferred-name"
          label={CUSTOMIZATION_PROFILE.preferredNameLabel}
          value={preferredName}
          max={CUSTOMIZATION_PROFILE.preferredNameMax}
        >
          <Input
            id="customization-preferred-name"
            value={preferredName}
            maxLength={CUSTOMIZATION_PROFILE.preferredNameMax}
            placeholder={CUSTOMIZATION_PROFILE.preferredNamePlaceholder}
            onChange={(event) => setPreferredName(event.target.value)}
            className={fieldClassName}
          />
        </CustomizationField>

        <CustomizationField
          id="customization-occupation"
          label={CUSTOMIZATION_PROFILE.occupationLabel}
          value={occupation}
          max={CUSTOMIZATION_PROFILE.occupationMax}
        >
          <Input
            id="customization-occupation"
            value={occupation}
            maxLength={CUSTOMIZATION_PROFILE.occupationMax}
            placeholder={CUSTOMIZATION_PROFILE.occupationPlaceholder}
            onChange={(event) => setOccupation(event.target.value)}
            className={fieldClassName}
          />
        </CustomizationField>

        <div>
          <label
            htmlFor="customization-traits"
            className="text-sm font-medium text-foreground"
          >
            {CUSTOMIZATION_PROFILE.traitsLabel}
          </label>
          <div className="relative mt-2 rounded-md border border-border px-3 py-2">
            <div className="flex flex-wrap items-center gap-1.5 pr-14">
              {traits.map((trait) => (
                <span
                  key={trait}
                  className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-sm text-foreground"
                >
                  {trait}
                  <button
                    type="button"
                    aria-label={`Remove ${trait}`}
                    onClick={() =>
                      setTraits(traits.filter((item) => item !== trait))
                    }
                    className="cursor-pointer rounded-md text-muted-foreground hover:text-foreground"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              ))}
              <input
                id="customization-traits"
                value={traitDraft}
                placeholder={
                  traits.length === 0
                    ? CUSTOMIZATION_PROFILE.traitsPlaceholder
                    : undefined
                }
                onChange={(event) => setTraitDraft(event.target.value)}
                onKeyDown={handleTraitKeyDown}
                className="min-w-32 flex-1 bg-transparent py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <CharacterCount
              used={traitUsed}
              max={CUSTOMIZATION_PROFILE.traitsMax}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {CUSTOMIZATION_PROFILE.suggestedTraits.map((trait) => {
              const added = traits.some(
                (item) => item.toLowerCase() === trait.toLowerCase()
              )
              return (
                <button
                  key={trait}
                  type="button"
                  disabled={
                    added ||
                    !canAddTrait(traits, trait, CUSTOMIZATION_PROFILE.traitsMax)
                  }
                  onClick={() => tryAddTrait(trait)}
                  className={cn(
                    "cursor-pointer rounded-md bg-accent px-2.5 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent/80 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  )}
                >
                  {trait} +
                </button>
              )
            })}
          </div>
        </div>

        <CustomizationField
          id="customization-extra"
          label={CUSTOMIZATION_PROFILE.extraLabel}
          value={extra}
          max={CUSTOMIZATION_PROFILE.extraMax}
        >
          <textarea
            id="customization-extra"
            value={extra}
            maxLength={CUSTOMIZATION_PROFILE.extraMax}
            placeholder={CUSTOMIZATION_PROFILE.extraPlaceholder}
            rows={5}
            onChange={(event) => setExtra(event.target.value)}
            className="min-h-28 w-full resize-none rounded-md border border-border bg-transparent px-3 py-2.5 pr-16 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
          />
        </CustomizationField>
      </div>
    </section>
  )
}

function CustomizationField({
  id,
  label,
  value,
  max,
  children,
}: {
  id: string
  label: string
  value: string
  max: number
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative mt-2">
        {children}
        <CharacterCount used={value.length} max={max} />
      </div>
    </div>
  )
}

function CharacterCount({ used, max }: { used: number; max: number }) {
  return (
    <span className="pointer-events-none absolute right-3 bottom-2 text-xs text-muted-foreground tabular-nums">
      {used}/{max}
    </span>
  )
}
