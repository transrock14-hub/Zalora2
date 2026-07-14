'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/language-context'
import toast from 'react-hot-toast'

interface Preferences {
  orderUpdates: boolean
  promotions: boolean
  newsletter: boolean
  profileVisibility: boolean
  activityStatus: boolean
}

const DEFAULTS: Preferences = {
  orderUpdates: true,
  promotions: true,
  newsletter: false,
  profileVisibility: false,
  activityStatus: true,
}

export default function AccountSettingsPage() {
  const { t } = useLanguage()
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/account/preferences')
      .then((res) => res.json())
      .then((data) => {
        if (active && data.preferences) setPrefs({ ...DEFAULTS, ...data.preferences })
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const update = async (key: keyof Preferences, value: boolean) => {
    const previous = prefs
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    setSaving(true)
    try {
      const res = await fetch('/api/account/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to save')
    } catch (e: any) {
      setPrefs(previous)
      toast.error(e.message || 'Failed to save setting')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 lg:pb-0">
      <header className="sticky top-0 z-10 flex items-center justify-center h-14 bg-primary px-4 shadow-sm lg:hidden">
        <Link href="/account" className="absolute left-4 text-white">
          <Icon icon="solar:arrow-left-linear" className="size-6" />
        </Link>
        <h1 className="text-lg font-semibold text-primary-foreground font-heading">
          {t('settings')}
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          <div className="hidden lg:block mb-6">
            <h1 className="text-2xl font-bold font-heading">{t('accountSettings')}</h1>
            <p className="text-muted-foreground mt-2">{t('manageYourPreferences')}</p>
          </div>

          <div className={`space-y-4 ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
            <Card>
              <CardHeader>
                <CardTitle>{t('notifications')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('orderUpdates')}</Label>
                    <p className="text-xs text-muted-foreground">{t('getNotifiedAboutOrderStatus')}</p>
                  </div>
                  <Switch
                    checked={prefs.orderUpdates}
                    disabled={saving}
                    onCheckedChange={(v) => update('orderUpdates', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('promotions')}</Label>
                    <p className="text-xs text-muted-foreground">{t('receiveDealsAndOffers')}</p>
                  </div>
                  <Switch
                    checked={prefs.promotions}
                    disabled={saving}
                    onCheckedChange={(v) => update('promotions', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('newsletter')}</Label>
                    <p className="text-xs text-muted-foreground">{t('weeklyUpdatesAndNews')}</p>
                  </div>
                  <Switch
                    checked={prefs.newsletter}
                    disabled={saving}
                    onCheckedChange={(v) => update('newsletter', v)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('privacy')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('profileVisibility')}</Label>
                    <p className="text-xs text-muted-foreground">{t('showProfileToOtherUsers')}</p>
                  </div>
                  <Switch
                    checked={prefs.profileVisibility}
                    disabled={saving}
                    onCheckedChange={(v) => update('profileVisibility', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('activityStatus')}</Label>
                    <p className="text-xs text-muted-foreground">{t('showWhenActive')}</p>
                  </div>
                  <Switch
                    checked={prefs.activityStatus}
                    disabled={saving}
                    onCheckedChange={(v) => update('activityStatus', v)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
