'use client'

import { Icon } from '@iconify/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/language-context'
import { Language } from '@/lib/translations'

const languages = [
  { code: 'en' as Language, name: 'English', nativeName: 'English' },
  { code: 'zh-CN' as Language, name: '简体中文', nativeName: '简体中文' },
  { code: 'zh-TW' as Language, name: '繁體中文', nativeName: '繁體中文' },
  { code: 'de' as Language, name: 'Deutsch', nativeName: 'Deutsch' },
  { code: 'fr' as Language, name: 'Français', nativeName: 'Français' },
  { code: 'ja' as Language, name: '日本語', nativeName: '日本語' },
  { code: 'es' as Language, name: 'español', nativeName: 'español' },
  { code: 'vi' as Language, name: 'Tiếng Việt', nativeName: 'Tiếng Việt' },
  { code: 'th' as Language, name: 'ภาษาไทย', nativeName: 'ภาษาไทย' },
  { code: 'ko' as Language, name: '한국어', nativeName: '한국어' },
  { code: 'tr' as Language, name: 'Türk', nativeName: 'Türk' },
  { code: 'pt' as Language, name: 'Português', nativeName: 'Português' },
  { code: 'ru' as Language, name: 'Русский', nativeName: 'Русский' },
  { code: 'id' as Language, name: 'bahasa Indonesia', nativeName: 'bahasa Indonesia' },
  { code: 'it' as Language, name: 'Italiano', nativeName: 'Italiano' },
]

interface LanguageSelectorProps {
  variant?: 'default' | 'mobile'
}

export function LanguageSelector({ variant = 'default' }: LanguageSelectorProps) {
  const { language, setLanguage } = useLanguage()

  const handleLanguageChange = (langCode: Language) => {
    setLanguage(langCode)
  }

  const currentLanguage = languages.find(lang => lang.code === language)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          className={`relative ${variant === 'mobile' ? 'text-white hover:bg-white/20 p-2 rounded' : 'text-gray-700 hover:text-gray-900 transition-colors'}`}
        >
          <Icon icon="solar:global-linear" className="size-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px] max-h-[400px] overflow-y-auto">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className="flex items-center justify-between cursor-pointer"
          >
            <span className={language === lang.code ? 'text-primary font-medium' : ''}>
              {lang.nativeName}
            </span>
            {language === lang.code && (
              <Icon icon="solar:check-circle-bold" className="size-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
