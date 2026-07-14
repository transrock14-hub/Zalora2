import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

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

    // 2b) Already listed? (seller has a product with this catalog as source and not yet sold/deleted)
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

    // 3) Unique slug for seller's copy (slug is unique globally)
    const baseSlug = (catalogProduct as any).slug
    const uniqueSlug = `${baseSlug}-${shop.id.slice(0, 8)}-${Date.now().toString(36)}`

    const salePrice = Number((catalogProduct as any).salePrice) || Number((catalogProduct as any).price)

    // 4) Insert new product for seller's shop (price = sale price; costPrice = wholesale/bought price)
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
        status: 'DRAFT',
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
    const images = (catalogProduct as any).images as Array<{ url: string; alt: string | null; sortOrder: number; isPrimary: boolean }> | undefined
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

    // Note: Balance will be deducted when seller ships the product (marks order as SHIPPED)
    return NextResponse.json({
      success: true,
      message: 'Product added to products',
      productId: (newProduct as any).id,
    })
  } catch (e) {
    console.error('Wholesale list error:', e)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
