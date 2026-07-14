import { revalidateTag } from 'next/cache'

/**
 * Bust the cached storefront data (home page etc.) after an admin mutation.
 * Safe to call from any Route Handler; never throws.
 */
export function revalidateStorefront(
  tags: Array<'home' | 'products' | 'categories' | 'hero_slides'> = [
    'home',
    'products',
    'categories',
    'hero_slides',
  ]
) {
  try {
    for (const tag of tags) revalidateTag(tag)
  } catch (err) {
    console.error('[revalidate] Failed to revalidate storefront cache:', err)
  }
}
