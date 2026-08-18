import { useState } from "react"

import {
  CUSTOMIZATION_CHAT_DENSITIES,
  CUSTOMIZATION_CODE_FONTS,
  CUSTOMIZATION_FONTS,
  CUSTOMIZATION_FONTS_PREVIEW,
  CUSTOMIZATION_MAIN_FONTS,
} from "@/components/settings/constants"
import { SettingsSelect } from "@/components/settings/SettingsSelect"

export function CustomizationFonts() {
  const [mainFontId, setMainFontId] = useState<string>(
    CUSTOMIZATION_FONTS.defaultMainFontId
  )
  const [codeFontId, setCodeFontId] = useState<string>(
    CUSTOMIZATION_FONTS.defaultCodeFontId
  )
  const [densityId, setDensityId] = useState<string>(
    CUSTOMIZATION_FONTS.defaultDensityId
  )

  return (
    <section>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <FontControl
            id="main-text-font"
            label={CUSTOMIZATION_FONTS.mainLabel}
            description={CUSTOMIZATION_FONTS.mainDescription}
            value={mainFontId}
            options={CUSTOMIZATION_MAIN_FONTS}
            onValueChange={setMainFontId}
          />
          <FontControl
            id="code-font"
            label={CUSTOMIZATION_FONTS.codeLabel}
            description={CUSTOMIZATION_FONTS.codeDescription}
            value={codeFontId}
            options={CUSTOMIZATION_CODE_FONTS}
            onValueChange={setCodeFontId}
          />
          <FontControl
            id="chat-density"
            label={CUSTOMIZATION_FONTS.densityLabel}
            description={CUSTOMIZATION_FONTS.densityDescription}
            value={densityId}
            options={CUSTOMIZATION_CHAT_DENSITIES}
            onValueChange={setDensityId}
          />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {CUSTOMIZATION_FONTS.title}
          </h3>
          <FontsPreview />
        </div>
      </div>
    </section>
  )
}

function FontControl({
  id,
  label,
  description,
  value,
  options,
  onValueChange,
}: {
  id: string
  label: string
  description: string
  value: string
  options: ReadonlyArray<{ id: string; label: string }>
  onValueChange: (value: string) => void
}) {
  return (
    <div>
      <p id={`${id}-label`} className="text-sm font-semibold text-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-3">
        <SettingsSelect
          value={value}
          options={options}
          onValueChange={onValueChange}
          ariaLabel={label}
        />
      </div>
    </div>
  )
}

function FontsPreview() {
  return (
    <div className="mt-3 rounded-md border border-border bg-card p-4">
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-md bg-[var(--message-surface,var(--accent))] px-3 py-2 text-[15px] leading-6 text-[var(--message-foreground,var(--foreground))]">
          {CUSTOMIZATION_FONTS_PREVIEW.userMessage}
        </div>
      </div>

      <div className="mt-5 text-[15px] leading-7 text-foreground/90">
        <h4 className="text-base font-semibold text-foreground">
          {CUSTOMIZATION_FONTS_PREVIEW.heading}
        </h4>
        <p className="mt-2">{CUSTOMIZATION_FONTS_PREVIEW.body}</p>
        <ul className="mt-2 list-disc space-y-1 ps-5">
          {CUSTOMIZATION_FONTS_PREVIEW.bullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-border bg-[var(--code-background,var(--surface-raised))]">
        <p className="px-3 pt-2 text-xs text-muted-foreground">
          {CUSTOMIZATION_FONTS_PREVIEW.codeLanguage}
        </p>
        <pre className="overflow-x-auto px-3 py-2 font-mono text-[13px] leading-6">
          {CUSTOMIZATION_FONTS_PREVIEW.codeLines.map((line, lineIndex) => (
            <span key={lineIndex} className="block whitespace-nowrap">
              {line.map((token, tokenIndex) => (
                <span
                  key={tokenIndex}
                  className={
                    token.kind === "keyword"
                      ? "text-primary"
                      : "text-foreground"
                  }
                >
                  {token.text}
                </span>
              ))}
            </span>
          ))}
        </pre>
      </div>
    </div>
  )
}
