import { supabaseAdmin } from './supabase'
import { CRYPTO_CURRENCIES, type CryptoCurrencyCode } from './crypto-currencies'

export { CRYPTO_CURRENCIES, type CryptoCurrencyCode } from './crypto-currencies'

export interface CheckoutSettings {
  shippingFee: number
  freeShippingThreshold: number
  taxRate: number
  cryptoEnabled: boolean
  /** Per-coin toggles — only coins both enabled here AND with an active wallet appear at checkout. */
  enabledCryptos: CryptoCurrencyCode[]
  balanceEnabled: boolean
  codEnabled: boolean
  bankTransferEnabled: boolean
  currency: string
  cryptoPaymentInstructions: string
  /** Hours before unpaid crypto orders are marked expired (0 = never auto-expire). */
  cryptoPaymentTimeoutHours: number
}

const DEFAULTS: CheckoutSettings = {
  shippingFee: 0,
  freeShippingThreshold: 0,
  taxRate: 10,
  cryptoEnabled: true,
  enabledCryptos: ['USDT_TRC20', 'USDT_ERC20', 'BTC', 'ETH'],
  balanceEnabled: true,
  codEnabled: false,
  bankTransferEnabled: false,
  currency: 'USD',
  cryptoPaymentInstructions: '',
  cryptoPaymentTimeoutHours: 24,
}

const SETTING_KEYS = [
  'shipping_fee',
  'free_shipping_threshold',
  'tax_rate',
  'crypto_enabled',
  'crypto_usdt_trc20_enabled',
  'crypto_usdt_erc20_enabled',
  'crypto_btc_enabled',
  'crypto_eth_enabled',
  'balance_enabled',
  'cod_enabled',
  'bank_transfer_enabled',
  'currency',
  'crypto_payment_instructions',
  'crypto_payment_timeout_hours',
] as const

function parseNum(value: string | undefined, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function boolVal(v: string | undefined, fallback: boolean): boolean {
  if (v == null || v === '') return fallback
  return v === 'true'
}

function mapEnabledCryptos(map: Map<string, string>): CryptoCurrencyCode[] {
  const enabled: CryptoCurrencyCode[] = []
  for (const coin of CRYPTO_CURRENCIES) {
    // Default each coin to enabled when the setting key is absent (crypto-first store).
    if (boolVal(map.get(coin.settingKey), true)) {
      enabled.push(coin.code)
    }
  }
  return enabled
}

export function mapSettingsRows(rows: Array<{ key: string; value: string }> | null | undefined): CheckoutSettings {
  const map = new Map((rows || []).map((r) => [r.key, r.value]))
  const threshold = parseNum(map.get('free_shipping_threshold'), DEFAULTS.freeShippingThreshold)
  return {
    shippingFee: parseNum(map.get('shipping_fee'), DEFAULTS.shippingFee),
    freeShippingThreshold: threshold,
    taxRate: parseNum(map.get('tax_rate'), DEFAULTS.taxRate),
    cryptoEnabled: boolVal(map.get('crypto_enabled'), true),
    enabledCryptos: mapEnabledCryptos(map),
    balanceEnabled: boolVal(map.get('balance_enabled'), true),
    codEnabled: map.get('cod_enabled') === 'true',
    bankTransferEnabled: map.get('bank_transfer_enabled') === 'true',
    currency: map.get('currency') || DEFAULTS.currency,
    cryptoPaymentInstructions: map.get('crypto_payment_instructions') || '',
    cryptoPaymentTimeoutHours: parseNum(
      map.get('crypto_payment_timeout_hours'),
      DEFAULTS.cryptoPaymentTimeoutHours
    ),
  }
}

export function isCryptoCurrencyEnabled(
  currency: string,
  settings: CheckoutSettings
): boolean {
  if (!settings.cryptoEnabled) return false
  return settings.enabledCryptos.includes(currency as CryptoCurrencyCode)
}

export async function getCheckoutSettings(): Promise<CheckoutSettings> {
  try {
    const { data, error } = await supabaseAdmin
      .from('settings')
      .select('key, value')
      .in('key', [...SETTING_KEYS])

    if (error) throw error
    return mapSettingsRows(data)
  } catch {
    return { ...DEFAULTS }
  }
}

export interface OrderTotals {
  subtotal: number
  discount: number
  shipping: number
  tax: number
  total: number
}

/** Compute shipping, tax, and total from admin settings (server is source of truth). */
export function computeOrderTotals(
  subtotal: number,
  discount: number,
  settings: CheckoutSettings
): OrderTotals {
  const safeDiscount = Math.min(Math.max(0, discount), subtotal)
  const afterDiscount = subtotal - safeDiscount

  const freeShipping =
    settings.freeShippingThreshold > 0 && subtotal >= settings.freeShippingThreshold
  const shipping = freeShipping ? 0 : Math.max(0, settings.shippingFee)

  const tax = afterDiscount * (Math.max(0, settings.taxRate) / 100)
  const total = afterDiscount + shipping + tax

  return {
    subtotal,
    discount: safeDiscount,
    shipping,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100,
  }
}
