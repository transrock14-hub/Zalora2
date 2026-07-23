import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { salesPriceFromWholesale } from '@/lib/wholesale-pricing'

export async function POST(req: NextRequest) {
  try {
    const auth = await getSession()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const productId = body?.productId
    if (!productId || typeof productId !== 'string') {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 })
    }

    // 1) Get catalog product (admin upload: shopId null, wholesalePrice set)
    const { data: catalogProduct, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, name, slug, description, shortDesc, categoryId, price, comparePrice, wholesalePrice, salePrice, stock, sku, status, images:product_images(url, alt, sortOrder, isPrimary)')
      .eq('id', productId)
      .is('shopId', null)
      .not('wholesalePrice', 'is', null)
      .single()

    if (productError || !catalogProduct) {
      return NextResponse.json(
        { error: 'Product not found or not available for wholesale' },
        { status: 404 }
      )
    }

    const wholesalePrice = Number((catalogProduct as any).wholesalePrice)
    if (!Number.isFinite(wholesalePrice) || wholesalePrice <= 0) {
      return NextResponse.json(
        { error: 'Invalid wholesale price' },
        { status: 400 }
      )
    }

    // Sales is always 20% above wholesale (ignore mismatched catalog salePrice)
    const salePrice = salesPriceFromWholesale(wholesalePrice)

    // 2) Get user's approved shop
    const { data: shop, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('id, balance, name')
      .eq('userId', auth.userId)
      .eq('status', 'ACTIVE')
      .single()

    if (shopError || !shop) {
      return NextResponse.json(
        { error: 'No approved shop found' },
        { status: 403 }
      )
    }

    // 2b) Already listed?
    const { data: existingListing } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('shopId', shop.id)
      .eq('sourceProductId', productId)
      .limit(1)
      .maybeSingle()

    if (existingListing) {
      return NextResponse.json(
        { error: 'Already listed', code: 'ALREADY_LISTED' },
        { status: 400 }
      )
    }

    // 3) Unique slug for seller's copy
    const baseSlug = (catalogProduct as any).slug
    const uniqueSlug = `${baseSlug}-${shop.id.slice(0, 8)}-${Date.now().toString(36)}`

    // 4) Insert seller product: price = sales (+20%), costPrice = wholesale
    const { data: newProduct, error: insertError } = await supabaseAdmin
      .from('products')
      .insert({
        shopId: shop.id,
        sourceProductId: productId,
        categoryId: (catalogProduct as any).categoryId,
        name: (catalogProduct as any).name,
        slug: uniqueSlug,
        description: (catalogProduct as any).description ?? null,
        shortDesc: (catalogProduct as any).shortDesc ?? null,
        price: salePrice,
        comparePrice: (catalogProduct as any).comparePrice ?? null,
        costPrice: wholesalePrice,
        stock: (catalogProduct as any).stock ?? 0,
        sku: (catalogProduct as any).sku ?? null,
        status: 'PUBLISHED',
        isFeatured: false,
      })
      .select('id')
      .single()

    if (insertError || !newProduct) {
      console.error('Wholesale list insert product error:', insertError)
      return NextResponse.json(
        { error: 'Failed to add product to your catalog' },
        { status: 500 }
      )
    }

    // 5) Copy product images
    const images = (catalogProduct as any).images as Array<{
      url: string
      alt: string | null
      sortOrder: number
      isPrimary: boolean
    }> | undefined
    if (images && images.length > 0) {
      const imageRows = images.map((img, idx) => ({
        productId: (newProduct as any).id,
        url: img.url,
        alt: img.alt ?? (catalogProduct as any).name,
        sortOrder: img.sortOrder ?? idx,
        isPrimary: idx === 0,
      }))
      await supabaseAdmin.from('product_images').insert(imageRows)
    }

    return NextResponse.json({
      success: true,
      message: 'Product added to products',
      productId: (newProduct as any).id,
      wholesalePrice,
      salePrice,
    })
  } catch (e) {
    console.error('Wholesale list error:', e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
