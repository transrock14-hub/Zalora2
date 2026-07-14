import { supabaseAdmin } from '@/lib/supabase'
import { CategoriesClient } from './categories-client'

// Avoid prerender-time DB access on deploy/build environments.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Categories - ZALORA',
  description: 'Browse all product categories',
}

// Reads from the same categories table as Admin → Categories. Root categories only (parentId null, isActive true).
async function getCategories() {
  try {
    // Fetch root categories only (no nested relation to avoid Supabase relation-name issues)
    const { data: categories, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .eq('isActive', true)
      .is('parentId', null)
      .order('sortOrder', { ascending: true })

    if (error || !categories?.length) {
      return []
    }

    // Default category colors for visual appeal (used when mapping for client)
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

    const categoriesWithCounts = await Promise.all(
      categories.map(async (category: any, index: number) => {
        const [countRes, childrenRes] = await Promise.all([
          // Count via returned id rows (a plain select) instead of a head/exact
          // count request — the head-count parsing returns 0 on the live runtime
          // even though normal row selects work correctly.
          supabaseAdmin
            .from('products')
            .select('id')
            .eq('categoryId', category.id)
            .eq('status', 'PUBLISHED')
            .limit(1000),
          supabaseAdmin
            .from('categories')
            .select('id, name, slug, isActive')
            .eq('parentId', category.id)
            .eq('isActive', true),
        ])
        const count = countRes.data?.length ?? 0
        const activeChildren = (childrenRes.data || []).filter((c: any) => c.isActive !== false)
        const colors = categoryColors[index % categoryColors.length]

        return {
          id: category.id,
          name: category.name,
          slug: category.slug || category.name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || '',
          description: category.description ?? null,
          icon: category.icon || 'solar:box-linear',
          image: category.image ?? null,
          productCount: count,
          subcategories: activeChildren.map((c: any) => ({
            id: c.id,
            name: c.name,
            slug: c.slug || c.name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || '',
          })),
          color: colors.color,
          iconColor: colors.iconColor,
        }
      })
    )
    return categoriesWithCounts
  } catch {
    return []
  }
}

export default async function CategoriesPage() {
  const categories = await getCategories()
  return <CategoriesClient categories={categories} />
}
