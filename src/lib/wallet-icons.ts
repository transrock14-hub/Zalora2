// Shared coin/method icons and colors for top-up and withdrawal (same as withdrawal page)
export const walletMethodIcons: Record<string, string> = {
  USDT: 'simple-icons:tether',
  'USDT-ERC20': 'simple-icons:tether',
  'USDT-TRC20': 'simple-icons:tether',
  ETH: 'cryptocurrency:eth',
  BTC: 'cryptocurrency:btc',
  BANK: 'solar:card-bold',
}

export const walletMethodColors: Record<string, string> = {
  USDT: 'bg-emerald-500',
  'USDT-ERC20': 'bg-emerald-500',
  'USDT-TRC20': 'bg-emerald-500',
  ETH: 'bg-violet-500',
  BTC: 'bg-amber-500',
  BANK: 'bg-blue-500',
}

/** Resolve icon by currency/method key; supports partial match (e.g. "USDT" for "USDT-ERC20") */
export function getWalletIcon(key: string): string {
  const k = (key || '').toUpperCase()
  if (walletMethodIcons[k]) return walletMethodIcons[k]
  if (k.includes('USDT')) return walletMethodIcons.USDT
  if (k.includes('ETH')) return walletMethodIcons.ETH
  if (k.includes('BTC')) return walletMethodIcons.BTC
  if (k.includes('BANK')) return walletMethodIcons.BANK
  return 'solar:wallet-money-bold'
}

/** Resolve color by currency/method key */
export function getWalletColor(key: string): string {
  const k = (key || '').toUpperCase()
  if (walletMethodColors[k]) return walletMethodColors[k]
  if (k.includes('USDT')) return walletMethodColors.USDT
  if (k.includes('ETH')) return walletMethodColors.ETH
  if (k.includes('BTC')) return walletMethodColors.BTC
  if (k.includes('BANK')) return walletMethodColors.BANK
  return 'bg-muted'
}
