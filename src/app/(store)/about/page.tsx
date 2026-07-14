import { supabaseAdmin } from '@/lib/supabase'
import { sanitizeHtml } from '@/lib/sanitize-html'
import { DEFAULT_ABOUT_PAGE } from '@/lib/default-cms-pages'
import { AboutPageClient } from './about-client'

// Avoid prerender-time DB access on deploy/build environments.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'About Us - ZALORA',
  description: 'Learn more about ZALORA Fashion and our mission',
}

async function getAboutPage() {
  try {
    const { data: page, error } = await supabaseAdmin
      .from('pages')
      .select('title, content, isActive')
      .eq('slug', 'about')
      .maybeSingle()

    if (!error && page?.isActive && page.content) {
      return { title: page.title, content: page.content }
    }
  } catch {
    // Fall through to default content
  }

  return {
    title: DEFAULT_ABOUT_PAGE.title,
    content: DEFAULT_ABOUT_PAGE.content,
  }
}

export default async function AboutPage() {
  const page = await getAboutPage()

  return (
    <AboutPageClient
      page={{ title: page.title, content: sanitizeHtml(page.content) }}
    />
  )
}
