import { supabaseAdmin } from '@/lib/supabase'
import { CategoriesClient } from './categories-client'

export const dynamic = 'force-dynamic'

async function getCategories() {
  const { data: categories, error } = await supabaseAdmin
    .from('categories')
    .select('*')
    .order('sortOrder', { ascending: true })

  if (error) {
    throw error
  }

  // Get product counts for each category
  const categoriesWithCounts = await Promise.all(
    (categories || []).map(async (category: any) => {
      const { count } = await supabaseAdmin
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('categoryId', category.id)

      return {
        ...category,
        _count: {
          products: count || 0,
        },
      }
    })
  )

  return categoriesWithCounts
}

export default async function AdminCategoriesPage() {
  const categories = await getCategories()

  return <CategoriesClient categories={categories} />
}
