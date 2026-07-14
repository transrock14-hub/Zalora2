import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { ShopStatus, ShopLevel } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.role !== 'ADMIN' && session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const {
      name,
      slug,
      description,
      status,
      level,
      balance,
      rating,
      commissionRate,
      followers,
      totalSales,
      memberSince,
    } = body

    const updateData: any = {}

    if (name !== undefined) {
      updateData.name = name
    }

    if (slug !== undefined) {
      updateData.slug = slug
    }

    if (description !== undefined) {
      updateData.description = description || null
    }

    if (status && Object.values(ShopStatus).includes(status)) {
      updateData.status = status
    }

    if (level && Object.values(ShopLevel).includes(level)) {
      updateData.level = level
    }

    if (balance !== undefined) {
      const balanceValue = parseFloat(balance)
      if (balanceValue >= 0) {
        updateData.balance = balanceValue
      } else {
        return NextResponse.json(
          { error: 'Balance must be greater than or equal to 0' },
          { status: 400 }
        )
      }
    }

    if (rating !== undefined) {
      const ratingValue = parseFloat(rating)
      if (ratingValue >= 0 && ratingValue <= 5) {
        updateData.rating = ratingValue
      } else {
        return NextResponse.json(
          { error: 'Rating must be between 0 and 5' },
          { status: 400 }
        )
      }
    }

    if (commissionRate !== undefined) {
      const rate = parseFloat(commissionRate)
      if (rate >= 0 && rate <= 100) {
        updateData.commissionRate = rate
      } else {
        return NextResponse.json(
          { error: 'Commission rate must be between 0 and 100' },
          { status: 400 }
        )
      }
    }

    if (followers !== undefined) {
      const followersValue = parseInt(followers)
      if (followersValue >= 0) {
        updateData.followers = followersValue
      } else {
        return NextResponse.json(
          { error: 'Followers count must be greater than or equal to 0' },
          { status: 400 }
        )
      }
    }

    if (totalSales !== undefined) {
      const totalSalesValue = parseInt(totalSales)
      if (totalSalesValue >= 0) {
        updateData.totalSales = totalSalesValue
      } else {
        return NextResponse.json(
          { error: 'Total sales must be greater than or equal to 0' },
          { status: 400 }
        )
      }
    }

    if (memberSince !== undefined) {
      if (memberSince === null || memberSince === '') {
        updateData.member_since = null
      } else {
        const d = new Date(memberSince)
        if (!Number.isNaN(d.getTime())) {
          updateData.member_since = d.toISOString()
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    let { data: shop, error } = await supabaseAdmin
      .from('shops')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    // The `member_since` column may not exist yet (migration not run). Don't let
    // that block editing balance/other fields — retry without it.
    if (error && error.code === '42703' && 'member_since' in updateData) {
      delete updateData.member_since
      if (Object.keys(updateData).length > 0) {
        ;({ data: shop, error } = await supabaseAdmin
          .from('shops')
          .update(updateData)
          .eq('id', params.id)
          .select()
          .single())
      } else {
        error = null
      }
    }

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'Shop slug already exists' },
          { status: 400 }
        )
      }
      throw error
    }

    // If the only field was member_since (dropped above), fetch the current row.
    if (!shop) {
      const { data: current } = await supabaseAdmin
        .from('shops')
        .select()
        .eq('id', params.id)
        .single()
      shop = current
    }

    // Keep owner's personal balance identical when admin edits shop balance.
    if (balance !== undefined && shop?.userId && updateData.balance !== undefined) {
      await supabaseAdmin
        .from('users')
        .update({ balance: Number(updateData.balance) })
        .eq('id', shop.userId)
    }

    // When admin approves shop (status -> ACTIVE), approve KYC and grant seller access
    if (status === ShopStatus.ACTIVE && shop?.userId) {
      await supabaseAdmin
        .from('shop_verifications')
        .update({
          status: 'APPROVED',
          reviewedAt: new Date().toISOString(),
          reviewedBy: session.userId,
        })
        .eq('shopId', params.id)
      await supabaseAdmin.from('users').update({ canSell: true }).eq('id', shop.userId)
    }

    return NextResponse.json({ shop })
  } catch (error: any) {
    console.error('Error updating shop:', error)
    return NextResponse.json({ error: 'Failed to update shop' }, { status: 500 })
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.role !== 'ADMIN' && session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get shop with user
    const { data: shop, error: shopError } = await supabaseAdmin
      .from('shops')
      .select(`
        *,
        user:users!shops_userId_fkey (
          id,
          name,
          email
        )
      `)
      .eq('id', params.id)
      .single()

    if (shopError || !shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    // Get products
    const { data: products } = await supabaseAdmin
      .from('products')
      .select(`
        *,
        images:product_images!inner (
          url
        )
      `)
      .eq('shopId', params.id)
      .eq('images.isPrimary', true)
      .order('createdAt', { ascending: false })
      .limit(10)

    // Get counts
    const [productsCount, ordersCount] = await Promise.all([
      supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('shopId', params.id),
      supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }).eq('shopId', params.id),
    ])

    const formattedProducts = (products || []).map((p: any) => ({
      ...p,
      price: Number(p.price),
      image: p.images && p.images.length > 0 ? p.images[0].url : null,
    }))

    return NextResponse.json({
      shop: {
        ...shop,
        balance: Number(shop.balance || 0),
        rating: Number(shop.rating || 0),
        products: formattedProducts,
        _count: {
          products: productsCount.count || 0,
          orders: ordersCount.count || 0,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching shop:', error)
    return NextResponse.json({ error: 'Failed to fetch shop' }, { status: 500 })
  }
}
