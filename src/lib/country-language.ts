import type { Language } from '@/lib/translations'

/** Supported language codes in the app */
const SUPPORTED_LANGUAGES: readonly Language[] = [
  'en', 'zh-CN', 'de', 'fr', 'ja', 'es', 'vi', 'th', 'ko', 'tr', 'pt', 'ru', 'id', 'it',
] as const

/** Map country code (e.g. US, DE) to app language code */
export const countryToLanguage: Record<string, Language> = {
  AT: 'de',   // Austria
  FR: 'fr',   // France
  DE: 'de',   // Germany
  IT: 'it',   // Italy
  ES: 'es',   // Spain
  CH: 'de',   // Switzerland (default German)
  GB: 'en',   // United Kingdom
  JP: 'ja',   // Japan
  CN: 'zh-CN',// China
  US: 'en',   // USA
  CA: 'en',   // Canada (default English)
  MX: 'es',   // Mexico
  BR: 'pt',   // Brazil
  CO: 'es',   // Colombia
  CL: 'es',   // Chile
  PE: 'es',   // Peru
  VE: 'es',   // Venezuela
  HN: 'es',   // Honduras
  MA: 'fr',   // Morocco
}

/**
 * Get app language for a selected country code.
 * Returns undefined if country is not mapped (caller can fallback to en or browser).
 */
export function getLanguageForCountry(countryCode: string): Language | undefined {
  const normalized = countryCode?.toUpperCase().trim()
  return normalized ? countryToLanguage[normalized] : undefined
}

/**
 * Map browser navigator.language to a supported app language.
 * e.g. 'en-US' -> 'en', 'zh-CN' -> 'zh-CN', 'pt-BR' -> 'pt'
 */
export function getLanguageFromBrowser(): Language {
  if (typeof navigator === 'undefined') return 'en'
  const raw = navigator.language || (navigator as { userLanguage?: string }).userLanguage || 'en'
  // Exact match
  if (SUPPORTED_LANGUAGES.includes(raw as Language)) return raw as Language
  // Primary tag (e.g. en-US -> en, zh-CN already matched)
  const primary = raw.split('-')[0]
  const byPrimary: Partial<Record<string, Language>> = {
    en: 'en', zh: 'zh-CN', de: 'de', fr: 'fr', ja: 'ja', es: 'es',
    vi: 'vi', th: 'th', ko: 'ko', tr: 'tr', pt: 'pt', ru: 'ru', id: 'id', it: 'it',
  }
  return byPrimary[primary] ?? 'en'
}
