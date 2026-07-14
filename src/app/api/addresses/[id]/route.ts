import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
      .from('addresses')
      .select('*')
      .eq('id', params.id)
      .eq('userId', session.userId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }

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
    console.error('GET /api/addresses/[id]', e)
    return NextResponse.json({ error: 'Failed to fetch address' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      .update({
        name: String(name).trim(),
        phone: String(phone).trim(),
        country: String(country).trim(),
        state: state ? String(state).trim() : '',
        city: String(city).trim(),
        address: String(address).trim(),
        postalCode: postalCode ? String(postalCode).trim() : '',
        isDefault: !!isDefault,
      })
      .eq('id', params.id)
      .eq('userId', session.userId)
      .select()
      .single()

    if (error) throw error
    if (!data) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }

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
    console.error('PUT /api/addresses/[id]', e)
    return NextResponse.json({ error: 'Failed to update address' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabaseAdmin
      .from('addresses')
      .delete()
      .eq('id', params.id)
      .eq('userId', session.userId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/addresses/[id]', e)
    return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 })
  }
}
