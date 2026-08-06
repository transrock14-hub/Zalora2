import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { optimizeProductImageUrl } from '@/lib/cdn-image'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ products: [] })
    }

    const q = query.trim().replace(/[%_,]/g, ' ')

    // Name/shortDesc only — description ILIKE is slow on large catalogs
    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select(`
        id,
        name,
        slug,
        price,
        comparePrice,
        category:categories!products_categoryId_fkey (
          name
        )
      `)
      .eq('status', 'PUBLISHED')
      .or(`name.ilike.%${q}%,shortDesc.ilike.%${q}%`)
      .order('totalSales', { ascending: false })
      .limit(10)

    if (error) {
      throw error
    }

    const productIds = (products || []).map((p: any) => p.id)
    let imageMap: Record<string, string> = {}
    if (productIds.length > 0) {
      const { data: images } = await supabaseAdmin
        .from('product_images')
        .select('productId, url, isPrimary')
        .in('productId', productIds)
        .order('isPrimary', { ascending: false })
      const byProduct = (images || []).reduce((acc: Record<string, string>, img: any) => {
        if (!acc[img.productId]) acc[img.productId] = img.url
        return acc
      }, {})
      imageMap = byProduct
    }

    const formattedProducts = (products || []).map((product: any) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: Number(product.price),
      comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
      image: optimizeProductImageUrl(imageMap[product.id] || '/images/logo.png', 200),
      categoryName: product.category?.name || 'Uncategorized',
    }))

    return NextResponse.json({ products: formattedProducts })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Failed to search products' },
      { status: 500 }
    )
  }
}
