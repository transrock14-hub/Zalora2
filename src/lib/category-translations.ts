import { TranslationKey } from './translations'

// Map category slugs to translation keys
export const categorySlugToKey: Record<string, TranslationKey> = {
  'men-clothing': 'menClothing',
  'women-clothing': 'womenClothing',
  'men-shoes': 'menShoes',
  'women-shoes': 'womenShoes',
  'men-bags': 'menBags',
  'women-bags': 'womenBags',
  'lifestyle': 'lifestyle',
  'home-garden': 'homeGarden',
  'electronics': 'electronics',
  'sports-outdoors': 'sportsOutdoors',
  'beauty-health': 'beautyHealth',
  'kids-maternity': 'kidsMaternity',
  'accessories': 'accessories',
  'girls': 'girls',
  'boys': 'boys',
}

export function getCategoryTranslationKey(slug: string): TranslationKey | null {
  return categorySlugToKey[slug] || null
}
