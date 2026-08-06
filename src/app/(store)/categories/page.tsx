import { unstable_cache } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase'
import { countPublishedInCategory } from '@/lib/product-list'
import { CategoriesClient } from './categories-client'

export const revalidate = 60

export const metadata = {
  title: 'Categories - ZALORA',
  description: 'Browse all product categories',
}

const categoryColors = [
  { color: '#E3F2FD', iconColor: '#1976D2' },
  { color: '#FFF3E0', iconColor: '#F57C00' },
  { color: '#FFF8E1', iconColor: '#FFA000' },
  { color: '#F3E5F5', iconColor: '#7B1FA2' },
  { color: '#E0F2F1', iconColor: '#00796B' },
  { color: '#FCE4EC', iconColor: '#C2185B' },
  { color: '#E8EAF6', iconColor: '#303F9F' },
  { color: '#FBE9E7', iconColor: '#D84315' },
  { color: '#F1F8E9', iconColor: '#689F38' },
  { color: '#EFEBE9', iconColor: '#5D4037' },
  { color: '#E0F7FA', iconColor: '#0097A7' },
]

const getCachedCategories = unstable_cache(
  async () => {
    const { data: categories, error } = await supabaseAdmin
      .from('categories')
      .select('id, name, slug, description, icon, image, sortOrder')
      .eq('isActive', true)
      .is('parentId', null)
      .order('sortOrder', { ascending: true })

    if (error || !categories?.length) return []

    const categoriesWithCounts = await Promise.all(
      categories.map(async (category: any, index: number) => {
        const [productCount, childrenRes] = await Promise.all([
          countPublishedInCategory(category.id),
          supabaseAdmin
            .from('categories')
            .select('id, name, slug, isActive')
            .eq('parentId', category.id)
            .eq('isActive', true),
        ])
        const activeChildren = (childrenRes.data || []).filter(
          (c: any) => c.isActive !== false
        )
        const colors = categoryColors[index % categoryColors.length]
        const slugify = (name: string) =>
          name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || ''

        return {
          id: category.id,
          name: category.name,
          slug: category.slug || slugify(category.name),
          description: category.description ?? null,
          icon: category.icon || 'solar:box-linear',
          image: category.image ?? null,
          productCount,
          subcategories: activeChildren.map((c: any) => ({
            id: c.id,
            name: c.name,
            slug: c.slug || slugify(c.name),
          })),
          color: colors.color,
          iconColor: colors.iconColor,
        }
      })
    )
    return categoriesWithCounts
  },
  ['categories-index-v1'],
  { revalidate: 60, tags: ['categories', 'products'] }
)

async function getCategories() {
  try {
    return await getCachedCategories()
  } catch {
    return []
  }
}

export default async function CategoriesPage() {
  const categories = await getCategories()
  return <CategoriesClient categories={categories} />
}
