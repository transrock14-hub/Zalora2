import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { Header } from '@/components/layout/header'
import { StoreSidebar } from '@/components/layout/store-sidebar'
import { BottomNav } from '@/components/layout/bottom-nav'
import { ChatWidget } from '@/components/layout/chat-widget'
import { SearchModal } from '@/components/search-modal'
import { AuthSync } from '@/components/auth-sync'
import { StorePageTitleProvider } from '@/contexts/store-page-title-context'

// Cache maintenance check - only check every 5 minutes
let maintenanceCache: { value: boolean; timestamp: number } | null = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

async function checkMaintenance() {
  const now = Date.now()
  
  // Return cached value if still valid
  if (maintenanceCache && (now - maintenanceCache.timestamp) < CACHE_DURATION) {
    return maintenanceCache.value
  }
  
  // Skip DB check if Supabase env vars are not available (build time)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return false
  }
  
  try {
    const { data: setting } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .single()

    const isMaintenanceMode = setting?.value === 'true'
    
    // Update cache
    maintenanceCache = { value: isMaintenanceMode, timestamp: now }
    
    return isMaintenanceMode
  } catch {
    return false
  }
}

async function getCategories() {
  // Skip DB check if Supabase env vars are not available (build time)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return []
  }
  
  try {
    const { data: categories } = await supabaseAdmin
      .from('categories')
      .select('id, name, slug, icon, image')
      .eq('isActive', true)
      .is('parentId', null)
      .order('sortOrder', { ascending: true })
      .limit(15)

    return categories || []
  } catch {
    return []
  }
}

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    // Check maintenance mode (cached for 60 seconds)
    const isMaintenanceMode = await checkMaintenance()
    
    if (isMaintenanceMode) {
      redirect('/maintenance')
    }

    // Fetch categories for sidebar
    const categories = await getCategories()

    return (
      <StorePageTitleProvider>
        <div className="h-screen bg-gray-50/30 flex flex-col overflow-hidden">
          <AuthSync />
          <Header />
          <div className="flex flex-1 overflow-hidden">
            <StoreSidebar categories={categories} />
            <main className="flex-1 lg:ml-64 pb-20 lg:pb-0 bg-white overflow-y-auto">
              {children}
            </main>
          </div>
          <BottomNav />
          <ChatWidget />
          <SearchModal />
        </div>
      </StorePageTitleProvider>
    )
  } catch (error) {
    console.error('Layout error:', error)
    // Return basic layout without categories on error
    return (
      <StorePageTitleProvider>
        <div className="h-screen bg-gray-50/30 flex flex-col overflow-hidden">
          <AuthSync />
          <Header />
          <div className="flex flex-1 overflow-hidden">
            <StoreSidebar categories={[]} />
            <main className="flex-1 lg:ml-64 pb-20 lg:pb-0 bg-white overflow-y-auto">
              {children}
            </main>
          </div>
          <BottomNav />
          <ChatWidget />
          <SearchModal />
        </div>
      </StorePageTitleProvider>
    )
  }
}

export const dynamic = 'force-dynamic'
