/** Supported checkout cryptocurrency codes (must match crypto_addresses.currency). */
export const CRYPTO_CURRENCIES = [
  { code: 'USDT_TRC20', label: 'USDT (TRC20)', settingKey: 'crypto_usdt_trc20_enabled' },
  { code: 'USDT_ERC20', label: 'USDT (ERC20)', settingKey: 'crypto_usdt_erc20_enabled' },
  { code: 'BTC', label: 'Bitcoin (BTC)', settingKey: 'crypto_btc_enabled' },
  { code: 'ETH', label: 'Ethereum (ETH)', settingKey: 'crypto_eth_enabled' },
] as const

export type CryptoCurrencyCode = (typeof CRYPTO_CURRENCIES)[number]['code']
