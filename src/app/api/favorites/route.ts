import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * POST: Add product to user's favorites (collection)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json(
        { message: 'Please login to add to collection' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { productId } = body

    if (!productId) {
      return NextResponse.json(
        { message: 'productId is required' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin.from('favorites').insert({
      userId: session.userId,
      productId,
    })

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ added: true, message: 'Already in collection' })
      }
      throw error
    }

    return NextResponse.json({ added: true })
  } catch (error) {
    console.error('POST /api/favorites', error)
    return NextResponse.json(
      { message: 'Failed to add to collection' },
      { status: 500 }
    )
  }
}

/**
 * DELETE: Remove product from user's favorites. ?productId=xxx
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json(
        { message: 'Please login to update collection' },
        { status: 401 }
      )
    }

    const productId = req.nextUrl.searchParams.get('productId')
    if (!productId) {
      return NextResponse.json(
        { message: 'productId is required' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from('favorites')
      .delete()
      .eq('userId', session.userId)
      .eq('productId', productId)

    if (error) throw error

    return NextResponse.json({ removed: true })
  } catch (error) {
    console.error('DELETE /api/favorites', error)
    return NextResponse.json(
      { message: 'Failed to remove from collection' },
      { status: 500 }
    )
  }
}
