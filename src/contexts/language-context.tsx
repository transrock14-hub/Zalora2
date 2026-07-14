'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { translations, Language, TranslationKey } from '@/lib/translations'
import { getLanguageForCountry, getLanguageFromBrowser } from '@/lib/country-language'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

function resolveInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'en'
  const preferred = localStorage.getItem('preferred-language')
  if (preferred && translations[preferred as Language]) return preferred as Language
  const country = localStorage.getItem('selected-country')
  const fromCountry = country ? getLanguageForCountry(country) : undefined
  if (fromCountry) return fromCountry
  return getLanguageFromBrowser()
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')

  useEffect(() => {
    const resolved = resolveInitialLanguage()
    setLanguageState(resolved)
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('preferred-language', lang)
  }

  const t = (key: TranslationKey): string => {
    const current = translations[language] as Partial<Record<TranslationKey, string>>
    const fallback = translations.en as Partial<Record<TranslationKey, string>>
    return current[key] ?? fallback[key] ?? key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
