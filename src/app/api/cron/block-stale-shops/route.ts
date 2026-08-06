import { NextRequest, NextResponse } from 'next/server'
import { blockAllShopsWithStaleOrders } from '@/lib/shop-order-sla'

/**
 * Cron: auto-block shops with orders unprocessed for 24h+.
 *
 * Secure with CRON_SECRET (or CRON_SECRET_KEY) header:
 *   Authorization: Bearer <secret>
 *   or x-cron-secret: <secret>
 *
 * Schedule externally (Hostinger cron / curl every 15–60 min):
 *   curl -X POST https://zalora.sbs/api/cron/block-stale-shops \
 *     -H "Authorization: Bearer $CRON_SECRET"
 */
export async function POST(req: NextRequest) {
  const expected =
    process.env.CRON_SECRET || process.env.CRON_SECRET_KEY || process.env.ADMIN_CRON_SECRET
  if (!expected) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured on the server' },
      { status: 503 }
    )
  }

  const auth = req.headers.get('authorization') || ''
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  const headerSecret = req.headers.get('x-cron-secret') || ''
  const provided = bearer || headerSecret

  if (!provided || provided !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await blockAllShopsWithStaleOrders()
    return NextResponse.json({
      success: true,
      ...result,
      message: `Checked ${result.checked} shop(s), blocked ${result.blocked}.`,
    })
  } catch (e) {
    console.error('POST /api/cron/block-stale-shops', e)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return POST(req)
}
