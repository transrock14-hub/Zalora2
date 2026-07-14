import { NextRequest, NextResponse } from 'next/server'
import { getCheckoutSettings } from '@/lib/checkout-settings'

export const dynamic = 'force-dynamic'

/** Public checkout settings (shipping, tax, enabled payment methods). */
export async function GET() {
  try {
    const settings = await getCheckoutSettings()
    return NextResponse.json({ settings })
  } catch (e) {
    console.error('GET /api/settings/checkout', e)
    return NextResponse.json(
      {
        settings: {
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
        },
      },
      { status: 200 }
    )
  }
}
