import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Supabase client for server-side operations
// Uses service role key for admin operations, anon key for public operations
export function createSupabaseClient(useServiceRole = false): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = useServiceRole 
    ? process.env.SUPABASE_SERVICE_ROLE_KEY 
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    const missingVar = !supabaseUrl 
      ? 'NEXT_PUBLIC_SUPABASE_URL' 
      : useServiceRole 
        ? 'SUPABASE_SERVICE_ROLE_KEY' 
        : 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    throw new Error(`Missing Supabase environment variable: ${missingVar}`)
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false, // Server-side doesn't need session persistence
    },
  })
}

// Lazy initialization to prevent errors at module load time
let _supabase: SupabaseClient | null = null
let _supabaseAdmin: SupabaseClient | null = null

// Default client (uses anon key) - lazy loaded
function getSupabaseClient(): SupabaseClient {
  if (!_supabase) {
    _supabase = createSupabaseClient(false)
  }
  return _supabase
}

// Admin client (uses service role key for admin operations) - lazy loaded
function getSupabaseAdminClient(): SupabaseClient {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createSupabaseClient(true)
  }
  return _supabaseAdmin
}

// Export clients with lazy initialization using Proxy
// This allows the clients to be used as objects but only initializes when accessed
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient()
    const value = client[prop as keyof SupabaseClient]
    return typeof value === 'function' ? value.bind(client) : value
  }
})

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseAdminClient()
    const value = client[prop as keyof SupabaseClient]
    return typeof value === 'function' ? value.bind(client) : value
  }
})
