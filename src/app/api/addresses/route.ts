import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
      .from('addresses')
      .select('*')
      .eq('userId', session.userId)
      .order('isDefault', { ascending: false })
      .order('createdAt', { ascending: false })

    if (error) throw error
    return NextResponse.json({
      addresses: (data || []).map((a: Record<string, unknown>) => ({
        id: a.id,
        name: a.name,
        phone: a.phone,
        country: a.country,
        state: a.state,
        city: a.city,
        address: a.address,
        postalCode: a.postalCode,
        isDefault: a.isDefault ?? false,
        createdAt: a.createdAt,
      })),
    })
  } catch (e) {
    console.error('GET /api/addresses', e)
    return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, phone, country, state, city, address, postalCode, isDefault } = body

    if (!name || !phone || !address || !city || !country) {
      return NextResponse.json(
        { error: 'Name, phone, address, city and country are required' },
        { status: 400 }
      )
    }

    if (isDefault) {
      await supabaseAdmin
        .from('addresses')
        .update({ isDefault: false })
        .eq('userId', session.userId)
    }

    const { data, error } = await supabaseAdmin
      .from('addresses')
      .insert({
        userId: session.userId,
        name: String(name).trim(),
        phone: String(phone).trim(),
        country: String(country).trim(),
        state: state ? String(state).trim() : '',
        city: String(city).trim(),
        address: String(address).trim(),
        postalCode: postalCode ? String(postalCode).trim() : '',
        isDefault: !!isDefault,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({
      address: {
        id: data.id,
        name: data.name,
        phone: data.phone,
        country: data.country,
        state: data.state,
        city: data.city,
        address: data.address,
        postalCode: data.postalCode,
        isDefault: data.isDefault ?? false,
        createdAt: data.createdAt,
      },
    })
  } catch (e) {
    console.error('POST /api/addresses', e)
    return NextResponse.json({ error: 'Failed to create address' }, { status: 500 })
  }
}
