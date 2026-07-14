import { supabaseAdmin } from '@/lib/supabase'
import { isSensitiveKey } from '@/lib/settings'
import { SettingsForm } from './settings-form'

export const dynamic = 'force-dynamic'

async function getSettings(): Promise<{
  settings: Record<string, string>
  secretsSet: Record<string, boolean>
}> {
  const { data: settings, error } = await supabaseAdmin.from('settings').select('*')

  if (error) {
    throw error
  }

  const settingsMap: Record<string, string> = {}
  const secretsSet: Record<string, boolean> = {}
  ;(settings || []).forEach((s: any) => {
    if (isSensitiveKey(s.key)) {
      // Never send secret values to the browser; just note whether one exists.
      secretsSet[s.key] = Boolean(s.value)
      settingsMap[s.key] = ''
    } else {
      settingsMap[s.key] = s.value
    }
  })

  return { settings: settingsMap, secretsSet }
}

export default async function SettingsPage() {
  const { settings, secretsSet } = await getSettings()

  return (
    <div className="space-y-6 pb-20 lg:pb-0 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold font-heading">Settings</h1>
        <p className="text-muted-foreground">Configure your store settings</p>
      </div>

      <SettingsForm initialSettings={settings} secretsSet={secretsSet} />
    </div>
  )
}
