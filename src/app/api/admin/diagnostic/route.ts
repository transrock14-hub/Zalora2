import { NextResponse } from 'next/server'

/**
 * Diagnostic endpoint to check server configuration
 * Helps identify missing environment variables and configuration issues
 * 
 * Usage: GET /api/admin/diagnostic
 */
export async function GET() {
  try {
    const diagnostics: {
      status: 'ok' | 'error' | 'warning'
      message: string
      details?: any
    }[] = []

    // Check Supabase environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl) {
      diagnostics.push({
        status: 'error',
        message: 'Missing NEXT_PUBLIC_SUPABASE_URL',
        details: 'This environment variable is required for database connection'
      })
    } else {
      diagnostics.push({
        status: 'ok',
        message: 'NEXT_PUBLIC_SUPABASE_URL is set',
        details: supabaseUrl.substring(0, 30) + '...'
      })
    }

    if (!supabaseAnonKey) {
      diagnostics.push({
        status: 'error',
        message: 'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY',
        details: 'This environment variable is required for public database operations'
      })
    } else {
      diagnostics.push({
        status: 'ok',
        message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is set',
        details: supabaseAnonKey.substring(0, 20) + '...'
      })
    }

    if (!supabaseServiceKey) {
      diagnostics.push({
        status: 'error',
        message: 'Missing SUPABASE_SERVICE_ROLE_KEY',
        details: 'This environment variable is required for admin operations and seeding'
      })
    } else {
      diagnostics.push({
        status: 'ok',
        message: 'SUPABASE_SERVICE_ROLE_KEY is set',
        details: supabaseServiceKey.substring(0, 20) + '...'
      })
    }

    // Check other important environment variables
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      diagnostics.push({
        status: 'warning',
        message: 'Missing JWT_SECRET',
        details: 'Using default secret - not recommended for production'
      })
    } else {
      diagnostics.push({
        status: 'ok',
        message: 'JWT_SECRET is set'
      })
    }

    const seedSecretKey = process.env.SEED_SECRET_KEY
    if (!seedSecretKey) {
      diagnostics.push({
        status: 'warning',
        message: 'Missing SEED_SECRET_KEY',
        details: 'Using default key - not secure for production'
      })
    } else {
      diagnostics.push({
        status: 'ok',
        message: 'SEED_SECRET_KEY is set'
      })
    }

    const adminEmail = process.env.ADMIN_EMAIL
    const adminPassword = process.env.ADMIN_PASSWORD
    
    if (!adminEmail) {
      diagnostics.push({
        status: 'warning',
        message: 'Missing ADMIN_EMAIL',
        details: 'Will use default: admin@zalora.com'
      })
    } else {
      diagnostics.push({
        status: 'ok',
        message: 'ADMIN_EMAIL is set',
        details: adminEmail
      })
    }

    if (!adminPassword) {
      diagnostics.push({
        status: 'warning',
        message: 'Missing ADMIN_PASSWORD',
        details: 'Will use default: admin123 - CHANGE THIS IN PRODUCTION!'
      })
    } else {
      diagnostics.push({
        status: 'ok',
        message: 'ADMIN_PASSWORD is set'
      })
    }

    // Test Supabase connection if variables are set
    if (supabaseUrl && supabaseServiceKey) {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const testClient = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { persistSession: false }
        })
        
        // Try a simple query to test connection
        const { error } = await testClient.from('users').select('id').limit(1)
        
        if (error) {
          diagnostics.push({
            status: 'error',
            message: 'Supabase connection test failed',
            details: error.message
          })
        } else {
          diagnostics.push({
            status: 'ok',
            message: 'Supabase connection successful'
          })
        }
      } catch (error) {
        diagnostics.push({
          status: 'error',
          message: 'Failed to test Supabase connection',
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Check Node environment
    const nodeEnv = process.env.NODE_ENV
    diagnostics.push({
      status: nodeEnv === 'production' ? 'ok' : 'warning',
      message: `NODE_ENV is set to: ${nodeEnv || 'undefined'}`,
      details: nodeEnv === 'production' ? 'Production mode' : 'Not in production mode'
    })

    // Summary
    const errors = diagnostics.filter(d => d.status === 'error').length
    const warnings = diagnostics.filter(d => d.status === 'warning').length
    const overallStatus = errors > 0 ? 'error' : warnings > 0 ? 'warning' : 'ok'

    return NextResponse.json({
      status: overallStatus,
      summary: {
        total: diagnostics.length,
        ok: diagnostics.filter(d => d.status === 'ok').length,
        warnings,
        errors
      },
      diagnostics,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: 'Failed to run diagnostics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
