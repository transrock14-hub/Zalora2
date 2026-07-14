import { supabaseAdmin } from '@/lib/supabase'
import { sanitizeHtml } from '@/lib/sanitize-html'
import { notFound } from 'next/navigation'
import { CmsPageClient } from '@/components/cms-page-client'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

// Slugs that have dedicated routes — don't serve via this catch-all.
const RESERVED_SLUGS = new Set([
  'about',
  'merchant-agreement',
  'account',
  'admin',
  'auth',
  'cart',
  'checkout',
  'contact',
  'categories',
  'products',
  'deals',
  'seller',
  'shops',
  'select-country',
  'maintenance',
  'terms',
  'privacy',
])

async function getPage(slug: string) {
  const { data: page, error } = await supabaseAdmin
    .from('pages')
    .select('slug, title, content, metaTitle, metaDesc, isActive')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !page || !page.isActive) return null
  return page
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const page = await getPage(params.slug)
  if (!page) return { title: 'Page Not Found' }
  return {
    title: page.metaTitle || page.title,
    description: page.metaDesc || undefined,
  }
}

export default async function CmsSlugPage({
  params,
}: {
  params: { slug: string }
}) {
  if (RESERVED_SLUGS.has(params.slug)) {
    notFound()
  }

  const page = await getPage(params.slug)
  if (!page) notFound()

  return (
    <CmsPageClient
      page={{
        title: page.title,
        content: sanitizeHtml(page.content),
      }}
    />
  )
}
