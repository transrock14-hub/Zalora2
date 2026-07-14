import { supabaseAdmin } from './supabase'

/**
 * Central access to the platform `settings` key/value table.
 *
 * Settings are edited by admins under /admin/settings and read throughout the
 * app (checkout, email, integrations). Values are always stored as strings.
 */

// Keys whose values must NEVER be sent back to the browser (passwords/secrets).
// The admin UI shows a "leave blank to keep unchanged" placeholder for these.
export const SENSITIVE_SETTING_KEYS = new Set<string>([
  'smtp_password',
  // Reserved for future config-only integrations:
  'stripe_secret_key',
  'paypal_secret',
  'twilio_auth_token',
])

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_SETTING_KEYS.has(key)
}

let cache: { data: Record<string, string>; expires: number } | null = null
const CACHE_TTL_MS = 30_000

export function invalidateSettingsCache() {
  cache = null
}

export async function getAllSettings(): Promise<Record<string, string>> {
  if (cache && cache.expires > Date.now()) return cache.data
  try {
    const { data, error } = await supabaseAdmin.from('settings').select('key, value')
    if (error) throw error
    const map: Record<string, string> = {}
    for (const row of data || []) map[row.key] = row.value
    cache = { data: map, expires: Date.now() + CACHE_TTL_MS }
    return map
  } catch (e) {
    console.error('[settings] Failed to load settings:', e)
    return cache?.data ?? {}
  }
}

function boolVal(v: string | undefined, fallback: boolean): boolean {
  if (v == null || v === '') return fallback
  return v === 'true'
}

export interface EmailConfig {
  enabled: boolean
  host: string
  port: number
  user: string
  password: string
  from: string
  secure: boolean
  events: {
    orderConfirmation: boolean
    welcome: boolean
    promotions: boolean
  }
}

/**
 * Resolve email/SMTP config. Admin settings take precedence; environment
 * variables act as a fallback so existing env-based setups keep working.
 */
export async function getEmailConfig(): Promise<EmailConfig> {
  const s = await getAllSettings()
  const port = Number(s.smtp_port || process.env.SMTP_PORT || 465)
  return {
    enabled: boolVal(s.email_enabled, true),
    host: s.smtp_host || process.env.SMTP_HOST || '',
    port: Number.isFinite(port) ? port : 465,
    user: s.smtp_user || process.env.SMTP_USER || '',
    password: s.smtp_password || process.env.SMTP_PASSWORD || '',
    from: s.smtp_from || process.env.EMAIL_FROM || s.smtp_user || process.env.SMTP_USER || '',
    secure:
      s.smtp_secure != null && s.smtp_secure !== ''
        ? s.smtp_secure === 'true'
        : process.env.SMTP_SECURE != null
          ? process.env.SMTP_SECURE === 'true'
          : port === 465,
    events: {
      orderConfirmation: boolVal(s.email_order_confirmation, true),
      welcome: boolVal(s.email_welcome, false),
      promotions: boolVal(s.email_promotions, false),
    },
  }
}
