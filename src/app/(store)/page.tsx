import { unstable_cache } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase'
import { HomePageClient } from './home-client'

// Avoid prerender-time DB access on deploy/build environments.
export const dynamic = 'force-dynamic'

// Cache the (heavy) home data across requests with tag-based revalidation.
// Admin product/category/hero-slide mutations call revalidateTag(...) to bust it.
const getCachedHomeData = unstable_cache(
  async () => {
    const [featuredProductsResult, newArrivalsResult, categoriesResult, heroSlidesResult] = await Promise.all([
      supabaseAdmin
        .from('products')
        .select(`
          *,
          images:product_images (
            url,
            isPrimary
          )
        `)
        .eq('isFeatured', true)
        .eq('status', 'PUBLISHED')
        .order('createdAt', { ascending: false })
        .limit(8),
      supabaseAdmin
        .from('products')
        .select(`
          *,
          images:product_images (
            url,
            isPrimary
          )
        `)
        .eq('status', 'PUBLISHED')
        .order('createdAt', { ascending: false })
        .limit(8),
      supabaseAdmin
        .from('categories')
        .select('*')
        .eq('isActive', true)
        .eq('showOnHome', true)
        .is('parentId', null)
        .order('sortOrder', { ascending: true })
        .limit(12),
      supabaseAdmin
        .from('hero_slides')
        .select('*')
        .eq('isActive', true)
        .order('sortOrder', { ascending: true })
        .limit(5),
    ])

    // Map products to include a single image URL for display (primary or first)
    const mapProduct = (p: any) => {
      const images = p.images || []
      const primary = images.find((img: any) => img.isPrimary) || images[0]
      const image = primary?.url || '/images/logo.png'
      return {
        ...p,
        images,
        image,
        reviews: p.totalReviews ?? 0,
      }
    }
    const featuredProducts = (featuredProductsResult.data || []).map(mapProduct).slice(0, 4)
    const newArrivals = (newArrivalsResult.data || []).map(mapProduct).slice(0, 4)

    return {
      featuredProducts,
      newArrivals,
      categories: categoriesResult.data || [],
      heroSlides: heroSlidesResult.data || [],
    }
  },
  ['home-data'],
  { revalidate: 300, tags: ['home', 'products', 'categories', 'hero_slides'] }
)

async function getHomeData() {
  // Check if Supabase is available
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      featuredProducts: [],
      newArrivals: [],
      categories: [],
      heroSlides: [],
    }
  }

  try {
    return await getCachedHomeData()
  } catch (error) {
    console.error('Error fetching home data:', error)
    return {
      featuredProducts: [],
      newArrivals: [],
      categories: [],
      heroSlides: [],
    }
  }
}

export default async function HomePage() {
  const { featuredProducts, newArrivals, categories, heroSlides } = await getHomeData()

  // Default data for development
  const defaultCategories = [
    { id: '1', name: 'Lifestyle', slug: 'lifestyle', icon: 'solar:gift-bold', image: null, color: '#E3F2FD', iconColor: '#1976D2' },
    { id: '2', name: 'Men Shoes', slug: 'men-shoes', icon: 'mdi:shoe-formal', image: null, color: '#FFF3E0', iconColor: '#F57C00' },
    { id: '3', name: 'Women Shoes', slug: 'women-shoes', icon: 'mdi:shoe-heel', image: null, color: '#FFF8E1', iconColor: '#FFA000' },
    { id: '4', name: 'Accessories', slug: 'accessories', icon: 'solar:glasses-bold', image: null, color: '#F3E5F5', iconColor: '#7B1FA2' },
    { id: '5', name: 'Men Clothing', slug: 'men-clothing', icon: 'solar:t-shirt-bold', image: null, color: '#E0F2F1', iconColor: '#00796B' },
    { id: '6', name: 'Women Bags', slug: 'women-bags', icon: 'solar:bag-3-bold', image: null, color: '#FCE4EC', iconColor: '#C2185B' },
    { id: '7', name: 'Men Bags', slug: 'men-bags', icon: 'solar:case-minimalistic-bold', image: null, color: '#E8EAF6', iconColor: '#303F9F' },
    { id: '8', name: 'Women Clothing', slug: 'women-clothing', icon: 'mdi:dress', image: null, color: '#FBE9E7', iconColor: '#D84315' },
    { id: '9', name: 'Girls', slug: 'girls', icon: 'solar:user-bold', image: null, color: '#F1F8E9', iconColor: '#689F38' },
    { id: '10', name: 'Boys', slug: 'boys', icon: 'solar:user-bold', image: null, color: '#EFEBE9', iconColor: '#5D4037' },
    { id: '11', name: 'Global', slug: 'global', icon: 'solar:globe-bold', image: null, color: '#E0F7FA', iconColor: '#0097A7' },
  ]

  const defaultProducts = [
    {
      id: '1',
      name: 'Nike Air Zoom Pegasus 39 Running Shoe',
      slug: 'nike-air-zoom',
      price: 120,
      comparePrice: 160,
      rating: 4.8,
      reviews: 124,
      image: '/images/logo.png',
    },
    {
      id: '2',
      name: 'Adidas Ultraboost 22 Running Shoe',
      slug: 'adidas-ultraboost',
      price: 180,
      comparePrice: 220,
      rating: 4.9,
      reviews: 89,
      image: '/images/logo.png',
    },
  ]

  return (
    <HomePageClient
      featuredProducts={featuredProducts.length > 0 ? featuredProducts : defaultProducts}
      newArrivals={newArrivals.length > 0 ? newArrivals : defaultProducts}
      categories={categories.length > 0 ? categories : defaultCategories}
      heroSlides={heroSlides}
    />
  )
}
