import { CryptoAddressesClient } from './crypto-addresses-client'

export const metadata = {
  title: 'Crypto Payment Addresses - Admin',
  description: 'Manage cryptocurrency payment addresses',
}

export default function CryptoAddressesPage() {
  return <CryptoAddressesClient />
}
