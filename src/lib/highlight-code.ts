import {
  bundledLanguages,
  createHighlighter,
  type BundledLanguage,
  type Highlighter,
} from "shiki"
import { createJavaScriptRegexEngine } from "shiki/engine/javascript"

const HIGHLIGHT_CACHE_LIMIT = 80
const CODE_HIGHLIGHT_THEMES = ["github-light", "min-dark"] as const

const engine = createJavaScriptRegexEngine({ forgiving: true })

export type HighlightedToken = {
  content: string
  color?: string
  bgColor?: string
  htmlStyle?: Record<string, string>
}

export type HighlightedCode = {
  tokens: HighlightedToken[][]
}

const tokenCache = new Map<string, HighlightedCode>()
const languageLoads = new Map<string, Promise<void>>()

let highlighterPromise: Promise<Highlighter> | null = null

function highlighter() {
  highlighterPromise ??= createHighlighter({
    engine,
    langs: [],
    themes: [...CODE_HIGHLIGHT_THEMES],
  })
  return highlighterPromise
}

function resolveBundledLanguage(language: string): BundledLanguage | null {
  const id = language.trim().toLowerCase()
  if (id in bundledLanguages) return id as BundledLanguage
  return null
}

function remember(key: string, result: HighlightedCode) {
  if (tokenCache.size >= HIGHLIGHT_CACHE_LIMIT) {
    const oldest = tokenCache.keys().next().value
    if (oldest !== undefined) tokenCache.delete(oldest)
  }
  tokenCache.set(key, result)
}

export function fallbackHighlightedCode(code: string): HighlightedCode {
  return {
    tokens: code.split("\n").map((line) => [{ content: line }]),
  }
}

async function ensureLanguage(
  instance: Highlighter,
  language: BundledLanguage
) {
  if (instance.getLoadedLanguages().includes(language)) return
  const pending = languageLoads.get(language)
  if (pending) {
    await pending
    return
  }
  const load = instance.loadLanguage(language).then(() => {
    languageLoads.delete(language)
  })
  languageLoads.set(language, load)
  await load
}

export async function highlightCode(
  code: string,
  language: string
): Promise<HighlightedCode> {
  const bundledLanguage = resolveBundledLanguage(language)
  if (!bundledLanguage) return fallbackHighlightedCode(code)

  const cacheKey = `${bundledLanguage}:${code}`
  const cached = tokenCache.get(cacheKey)
  if (cached) return cached

  const instance = await highlighter()
  await ensureLanguage(instance, bundledLanguage)
  const loaded = instance.getLoadedLanguages()
  const lang = loaded.includes(bundledLanguage) ? bundledLanguage : null
  if (!lang) return fallbackHighlightedCode(code)

  const [light, dark] = CODE_HIGHLIGHT_THEMES
  const result = instance.codeToTokens(code, {
    lang,
    themes: { light, dark },
  })
  const highlighted: HighlightedCode = {
    tokens: result.tokens.map((line) =>
      line.map((token) => ({
        content: token.content,
        color: token.color,
        bgColor: token.bgColor,
        htmlStyle: token.htmlStyle,
      }))
    ),
  }
  remember(cacheKey, highlighted)
  return highlighted
}
