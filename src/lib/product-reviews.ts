import { supabaseAdmin } from './supabase'

/** Recompute a product's average rating and review count from the reviews table. */
export async function recomputeProductRating(productId: string) {
  const { data } = await supabaseAdmin
    .from('reviews')
    .select('rating')
    .eq('productId', productId)

  const ratings = (data || []).map((r) => r.rating as number)
  const total = ratings.length
  const average = total > 0 ? ratings.reduce((s, r) => s + r, 0) / total : 0

  await supabaseAdmin
    .from('products')
    .update({
      rating: Math.round(average * 10) / 10,
      totalReviews: total,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', productId)
}
