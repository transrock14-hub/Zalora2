import { supabaseAdmin } from '@/lib/supabase'
import { HomepageClient } from './homepage-client'

export const dynamic = 'force-dynamic'

async function getHomepageData() {
  const { data: heroSlides, error } = await supabaseAdmin
    .from('hero_slides')
    .select('*')
    .order('sortOrder', { ascending: true })

  if (error) {
    throw error
  }

  return { heroSlides: heroSlides || [] }
}

export default async function AdminHomepage() {
  const { heroSlides } = await getHomepageData()

  return <HomepageClient heroSlides={heroSlides} />
}
