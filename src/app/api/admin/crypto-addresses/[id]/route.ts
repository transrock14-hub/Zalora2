import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// PUT - Update crypto address
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const updateData: any = {}
    if (currency !== undefined) updateData.currency = currency
    if (address !== undefined) updateData.address = address
    if (network !== undefined) updateData.network = network
    if (label !== undefined) updateData.label = label
    if (qrCode !== undefined) updateData.qrCode = qrCode
    if (isActive !== undefined) updateData.isActive = isActive

    const { data: cryptoAddress, error } = await supabaseAdmin
      .from('crypto_addresses')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      message: 'Crypto address updated successfully',
      cryptoAddress,
    })
  } catch (error) {
    console.error('Update crypto address error:', error)
    return NextResponse.json(
      { message: 'Failed to update crypto address' },
      { status: 500 }
    )
  }
}

// DELETE - Delete crypto address
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { error } = await supabaseAdmin
      .from('crypto_addresses')
      .delete()
      .eq('id', params.id)

    if (error) {
      throw error
    }

    return NextResponse.json({
      message: 'Crypto address deleted successfully',
    })
  } catch (error) {
    console.error('Delete crypto address error:', error)
    return NextResponse.json(
      { message: 'Failed to delete crypto address' },
      { status: 500 }
    )
  }
}
