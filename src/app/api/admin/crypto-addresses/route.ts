import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// GET all crypto addresses
export async function GET() {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: addresses, error } = await supabaseAdmin
      .from('crypto_addresses')
      .select('*')
      .order('createdAt', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ addresses: addresses || [] })
  } catch (error) {
    console.error('Fetch crypto addresses error:', error)
    return NextResponse.json(
      { message: 'Failed to fetch crypto addresses' },
      { status: 500 }
    )
  }
}

// POST - Create new crypto address
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { currency, address, network, label, qrCode, isActive } = body

    if (!currency || !address) {
      return NextResponse.json(
        { message: 'Currency and address are required' },
        { status: 400 }
      )
    }

    const { data: cryptoAddress, error } = await supabaseAdmin
      .from('crypto_addresses')
      .insert({
        currency,
        address,
        network,
        label,
        qrCode,
        isActive: isActive !== undefined ? isActive : true,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      message: 'Crypto address created successfully',
      cryptoAddress,
    })
  } catch (error) {
    console.error('Create crypto address error:', error)
    return NextResponse.json(
      { message: 'Failed to create crypto address' },
      { status: 500 }
    )
  }
}
