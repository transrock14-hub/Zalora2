import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { UserRole, UserStatus } from '@/lib/auth'
import bcrypt from 'bcryptjs'

// Shared seeding logic
async function performSeed() {
  // Check if Supabase is configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const missing = []
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY')
    throw new Error(`Missing Supabase environment variables: ${missing.join(', ')}`)
  }

  console.log('🌱 Starting database seed...')
  console.log('📋 Configuration check:')
  console.log('  - Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing')
  console.log('  - Service Role Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing')
  console.log('  - Admin Email:', process.env.ADMIN_EMAIL || 'admin@zalora.com (default)')
  console.log('  - Seed Secret Key:', process.env.SEED_SECRET_KEY ? '✅ Set' : '⚠️ Using default')

  // Check if admin user already exists
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@zalora.com'
  const { data: existingAdmin } = await supabaseAdmin
    .from('users')
    .select('email')
    .eq('email', adminEmail)
    .single()

  if (existingAdmin) {
    return {
      alreadySeeded: true,
      adminEmail: existingAdmin.email,
    }
  }

  // Create admin user
  const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 12)
  const { data: admin, error: adminError } = await supabaseAdmin
    .from('users')
    .upsert({
      email: adminEmail,
      password: adminPassword,
      name: 'Admin',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      canSell: true,
    }, {
      onConflict: 'email',
    })
    .select()
    .single()

  if (adminError || !admin) {
    throw new Error(`Failed to create admin: ${adminError?.message}`)
  }
  console.log('✅ Admin user created:', admin.email)

  // Create demo user
  const userPassword = await bcrypt.hash('user123', 12)
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .upsert({
      email: 'user@zalora.com',
      password: userPassword,
      name: 'Demo User',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      canSell: false,
      balance: 100,
    }, {
      onConflict: 'email',
    })
    .select()
    .single()

  if (userError) {
    console.warn('Failed to create demo user:', userError.message)
  } else {
    console.log('✅ Demo user created:', user?.email)
  }

  // Create demo seller
  const sellerPassword = await bcrypt.hash('seller123', 12)
  const { data: seller, error: sellerError } = await supabaseAdmin
    .from('users')
    .upsert({
      email: 'seller@zalora.com',
      password: sellerPassword,
      name: 'Demo Seller',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      canSell: true,
      balance: 500,
    }, {
      onConflict: 'email',
    })
    .select()
    .single()

  if (sellerError) {
    console.warn('Failed to create demo seller:', sellerError.message)
  } else {
    console.log('✅ Demo seller created:', seller?.email)
  }

  // Create categories
  const categories = [
    { name: 'Lifestyle', slug: 'lifestyle', icon: 'solar:gift-bold', showOnHome: true },
    { name: 'Men Shoes', slug: 'men-shoes', icon: 'mdi:shoe-formal', showOnHome: true },
    { name: 'Women Shoes', slug: 'women-shoes', icon: 'mdi:shoe-heel', showOnHome: true },
    { name: 'Accessories', slug: 'accessories', icon: 'solar:glasses-bold', showOnHome: true },
    { name: 'Men Clothing', slug: 'men-clothing', icon: 'solar:t-shirt-bold', showOnHome: true },
    { name: 'Women Bags', slug: 'women-bags', icon: 'solar:bag-3-bold', showOnHome: true },
    { name: 'Men Bags', slug: 'men-bags', icon: 'solar:case-minimalistic-bold', showOnHome: true },
    { name: 'Women Clothing', slug: 'women-clothing', icon: 'mdi:dress', showOnHome: true },
    { name: 'Girls', slug: 'girls', icon: 'solar:user-bold', showOnHome: true },
    { name: 'Boys', slug: 'boys', icon: 'solar:user-bold', showOnHome: true },
    { name: 'Electronics', slug: 'electronics', icon: 'solar:laptop-bold', showOnHome: true },
    { name: 'Home & Garden', slug: 'home-garden', icon: 'solar:home-smile-bold', showOnHome: true },
  ]

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i]
    await supabaseAdmin
      .from('categories')
      .upsert({
        ...cat,
        sortOrder: i,
        isActive: true,
      }, {
        onConflict: 'slug',
      })
  }
  console.log('✅ Categories created:', categories.length)

  // Create default settings
  const settings = [
    { key: 'site_name', value: 'ZALORA', type: 'string' },
    { key: 'site_description', value: 'Premium Fashion & Lifestyle Store', type: 'string' },
    { key: 'currency', value: 'USD', type: 'string' },
    { key: 'crypto_enabled', value: 'true', type: 'boolean' },
    { key: 'cod_enabled', value: 'true', type: 'boolean' },
    { key: 'bank_transfer_enabled', value: 'false', type: 'boolean' },
    { key: 'user_selling_enabled', value: 'true', type: 'boolean' },
    { key: 'tax_rate', value: '0', type: 'number' },
    { key: 'shipping_fee', value: '5', type: 'number' },
    { key: 'free_shipping_threshold', value: '50', type: 'number' },
    { key: 'usdt_trc20_address', value: '', type: 'string' },
    { key: 'usdt_erc20_address', value: '', type: 'string' },
    { key: 'btc_address', value: '', type: 'string' },
    { key: 'eth_address', value: '', type: 'string' },
    { key: 'maintenance_mode', value: 'false', type: 'boolean' },
  ]

  for (const setting of settings) {
    await supabaseAdmin
      .from('settings')
      .upsert(setting, {
        onConflict: 'key',
      })
  }
  console.log('✅ Settings created:', settings.length)

  // Create hero slides
  const heroSlides = [
    {
      title: 'The Icon Event',
      subtitle: 'Iconic Style. Curated For You.',
      image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1200&q=80',
      ctaText: 'Shop Now',
      ctaLink: '/products',
      sortOrder: 0,
      isActive: true,
    },
    {
      title: 'New Arrivals',
      subtitle: 'Fresh styles for the new season',
      image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80',
      ctaText: 'Explore',
      ctaLink: '/products?sort=newest',
      sortOrder: 1,
      isActive: true,
    },
  ]

  for (const slide of heroSlides) {
    await supabaseAdmin
      .from('hero_slides')
      .insert(slide)
  }
  console.log('✅ Hero slides created:', heroSlides.length)

  return {
    alreadySeeded: false,
    adminEmail: admin.email,
    usersCreated: 3,
    categoriesCreated: categories.length,
    settingsCreated: settings.length,
    heroSlidesCreated: heroSlides.length,
  }
}

// POST endpoint (requires Authorization header)
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const secretKey = process.env.SEED_SECRET_KEY || 'change-this-in-production'
    
    if (authHeader !== `Bearer ${secretKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized. Provide Authorization header: Bearer <SEED_SECRET_KEY>' },
        { status: 401 }
      )
    }

    const result = await performSeed()
    
    if (result.alreadySeeded) {
      return NextResponse.json({
        success: true,
        message: 'Database already seeded. Admin user exists.',
        adminEmail: result.adminEmail,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully!',
      adminEmail: result.adminEmail,
      adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
      usersCreated: result.usersCreated,
      categoriesCreated: result.categoriesCreated,
      settingsCreated: result.settingsCreated,
      heroSlidesCreated: result.heroSlidesCreated,
    })
  } catch (error) {
    console.error('❌ Seed failed:', error)
    return NextResponse.json(
      {
        error: 'Seed failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// GET endpoint (easier to use - requires ?key= query parameter)
export async function GET(request: Request) {
  try {
    // Check Supabase configuration first
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      const missingVars = []
      if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL')
      if (!supabaseServiceKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY')
      if (!supabaseAnonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
      
      console.error('❌ Missing Supabase environment variables:', missingVars.join(', '))
      return NextResponse.json(
        {
          error: 'Service Unavailable - Database not configured',
          message: 'Missing required Supabase environment variables',
          missingVariables: missingVars,
          hint: 'Please set the following environment variables in your Hostinger Node.js app settings: ' + missingVars.join(', '),
        },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(request.url)
    const secretKey = searchParams.get('key')
    const expectedKey = process.env.SEED_SECRET_KEY || 'change-this-in-production'
    
    if (!secretKey) {
      return NextResponse.json(
        { 
          error: 'Unauthorized. Provide ?key=<SEED_SECRET_KEY> query parameter',
          hint: `If SEED_SECRET_KEY is not set, use: ?key=change-this-in-production`
        },
        { status: 401 }
      )
    }
    
    if (secretKey !== expectedKey) {
      return NextResponse.json(
        { 
          error: 'Unauthorized. Invalid key.',
          hint: `Expected key: ${expectedKey === 'change-this-in-production' ? 'change-this-in-production (default)' : 'your custom SEED_SECRET_KEY'}`
        },
        { status: 401 }
      )
    }

    const result = await performSeed()
    
    if (result.alreadySeeded) {
      return NextResponse.json({
        success: true,
        message: 'Database already seeded. Admin user exists.',
        adminEmail: result.adminEmail,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully!',
      adminEmail: result.adminEmail,
      adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
      usersCreated: result.usersCreated,
      categoriesCreated: result.categoriesCreated,
      settingsCreated: result.settingsCreated,
      heroSlidesCreated: result.heroSlidesCreated,
    })
  } catch (error) {
    console.error('❌ Seed failed:', error)
    
    // Check if it's a Supabase configuration error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const isConfigError = errorMessage.includes('Missing Supabase') || 
                          errorMessage.includes('environment variable') ||
                          errorMessage.includes('not configured')
    
    return NextResponse.json(
      {
        error: isConfigError ? 'Service Unavailable - Database not configured' : 'Seed failed',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
      },
      { status: isConfigError ? 503 : 500 }
    )
  }
}
