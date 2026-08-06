/**
 * Rewrite known product CDN URLs to smaller card/PDP sizes.
 * Hostinger serves remotes unoptimized, so bandwidth savings must come from the CDN.
 */
export function optimizeProductImageUrl(
  url: string | null | undefined,
  width: number = 400
): string {
  if (!url) return '/images/logo.png'
  if (url.startsWith('/')) return url

  let src = url.replace(/&amp;/g, '&').trim()
  if (!/^https?:\/\//i.test(src)) return src

  try {
    // Noon / Namshi — supports ?format=webp&width=
    if (src.includes('nooncdn.com')) {
      const u = new URL(src)
      u.searchParams.set('format', 'webp')
      u.searchParams.set('width', String(width))
      return u.toString()
    }

    // Zalora dynamic.zacdn already ships resized webp (~20–30KB). Leave as-is;
    // do not rewrite filters (signed). Prefer dynamic over raw static if both exist.
    if (src.includes('dynamic.zacdn.com')) {
      return src
    }

    // Unsplash
    if (src.includes('images.unsplash.com')) {
      const u = new URL(src)
      u.searchParams.set('w', String(width))
      u.searchParams.set('q', '70')
      u.searchParams.set('auto', 'format')
      return u.toString()
    }

    // Cloudinary
    if (src.includes('res.cloudinary.com') && src.includes('/upload/')) {
      return src.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`)
    }
  } catch {
    return src
  }

  return src
}
