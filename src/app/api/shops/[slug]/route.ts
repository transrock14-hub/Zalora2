import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * Public API: get shop by slug (ACTIVE shops only). Returns shop details and published products.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    if (!slug) {
      return NextResponse.json({ error: 'Slug required' }, { status: 400 })
    }

    const { data: shopRow, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'ACTIVE')
      .maybeSingle()

    if (shopError || !shopRow) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    const memberSince = (shopRow as any).member_since ?? (shopRow as any).memberSince ?? null
    const shop = { ...shopRow, memberSince }

    const { data: productRows, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, name, slug, price, comparePrice, rating, totalReviews, isFeatured')
      .eq('shopId', shop.id)
      .eq('status', 'PUBLISHED')
      .order('createdAt', { ascending: false })
      .limit(24)

    if (productsError) {
      return NextResponse.json(
        { error: 'Failed to load products' },
        { status: 500 }
      )
    }

    const productIds = (productRows || []).map((p: any) => p.id)
    let imageMap: Record<string, string> = {}
    if (productIds.length > 0) {
      const { data: images } = await supabaseAdmin
        .from('product_images')
        .select('productId, url, isPrimary')
        .in('productId', productIds)
        .order('isPrimary', { ascending: false })
      const byProduct = (images || []).reduce(
        (acc: Record<string, string>, img: any) => {
          if (!acc[img.productId]) acc[img.productId] = img.url
          return acc
        },
        {}
      )
      imageMap = byProduct
    }

    const productList = (productRows || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: Number(p.price),
      comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
      rating: Number(p.rating || 0),
      reviews: Number(p.totalReviews || 0),
      image: imageMap[p.id] || '/images/logo.png',
      isFeatured: p.isFeatured,
    }))

    return NextResponse.json({
      shop: {
        id: shop.id,
        name: shop.name,
        slug: shop.slug,
        description: shop.description,
        logo: shop.logo,
        banner: shop.banner,
        rating: shop.rating ?? 0,
        createdAt: shop.createdAt ?? null,
        memberSince: shop.memberSince,
        followers: shop.followers ?? 0,
        totalSales: shop.totalSales ?? 0,
      },
      products: productList,
    })
  } catch (e) {
    console.error('GET /api/shops/[slug]', e)
    return NextResponse.json(
      { error: 'Failed to fetch shop' },
      { status: 500 }
    )
  }
}
