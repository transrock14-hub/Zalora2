import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { supabaseAdmin } from './supabase'
import { createSupabaseServerClient } from './supabase-server'
import bcrypt from 'bcryptjs'

// Enums (replacing Prisma enums)
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  USER = 'USER',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BANNED = 'BANNED',
  SUSPENDED = 'SUSPENDED',
}

export enum ShopStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CLOSED = 'CLOSED',
}

export enum ShopLevel {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'zalora-secret-key'
)

export interface JWTPayload {
  userId: string
  email: string
  role: UserRole
  impersonatedBy?: string // For admin login-as-user feature
  exp?: number
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export async function createToken(payload: Omit<JWTPayload, 'exp'>): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  // 1) Prefer Supabase Auth session (works on Netlify and local dev)
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const supabase = await createSupabaseServerClient()
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (!error && user) {
        const appUser = await getAppUserById(user.id)
        if (appUser) {
          return {
            userId: appUser.id,
            email: appUser.email,
            role: appUser.role,
          }
        }
      }
    }
  } catch (e) {
    console.warn('[getSession] Supabase Auth lookup failed, falling back to JWT cookie:', e)
  }

  // 2) Fallback: legacy JWT cookie
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')?.value
  if (!token) return null
  return verifyToken(token)
}

/** Fetch app user (public.users + shop + settings) by id. Used by both Supabase Auth and legacy JWT. */
async function getAppUserById(
  userId: string,
  sessionOverrides?: { isImpersonating?: boolean; impersonatedBy?: string }
) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null
  const [userResult, settingResult] = await Promise.all([
    supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        name,
        avatar,
        role,
        status,
        balance,
        canSell,
        shops (
          id,
          name,
          slug,
          status,
          level,
          balance
        )
      `)
      .eq('id', userId)
      .single(),
    supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'user_selling_enabled')
      .single(),
  ])
  if (userResult.error || !userResult.data) return null
  const user = userResult.data
  if (user.status !== UserStatus.ACTIVE) return null
  const userSellingEnabled = settingResult.data?.value === 'true'
  type ShopRow = { id: string; name: string; slug: string; status: string; level?: string; balance?: number }
  const rawShops = user.shops
  const shopRow: ShopRow | null =
    Array.isArray(rawShops) && rawShops.length > 0
      ? (rawShops[0] as ShopRow)
      : rawShops && typeof rawShops === 'object' && rawShops !== null && !Array.isArray(rawShops) && 'id' in rawShops
        ? (rawShops as ShopRow)
        : null
  const shop = shopRow
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    role: user.role as UserRole,
    status: user.status as UserStatus,
    balance: Number(user.balance || 0),
    canSell: user.canSell && userSellingEnabled,
    shop: shop
      ? {
          id: shop.id,
          name: shop.name,
          slug: shop.slug,
          status: shop.status,
          level: shop.level ?? 'BRONZE',
          balance: Number(shop.balance ?? 0),
        }
      : null,
    isImpersonating: sessionOverrides?.isImpersonating ?? false,
    impersonatedBy: sessionOverrides?.impersonatedBy,
  }
}

/**
 * Get current user: tries Supabase Auth (email provider) first so sessions work on Netlify,
 * then falls back to legacy JWT cookie for existing users.
 */
export async function getCurrentUser() {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return null
    }

    // 1) Supabase Auth (email provider) – cookies managed by @supabase/ssr, reliable on serverless
    if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const supabase = await createSupabaseServerClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser?.id) {
          const appUser = await getAppUserById(authUser.id)
          if (appUser) return appUser
        }
      } catch (e) {
        // Supabase client or cookie read failed; fall back to legacy
      }
    }

    // 2) Legacy JWT cookie (existing users, or when Supabase Auth not configured)
    const session = await getSession()
    if (!session) return null
    if (session.exp && session.exp < Date.now() / 1000) return null
    return getAppUserById(session.userId, {
      isImpersonating: !!session.impersonatedBy,
      impersonatedBy: session.impersonatedBy,
    })
  } catch (error) {
    console.error('getCurrentUser error:', error)
    return null
  }
}

/**
 * Get seller's shop and KYC verification. Use to gate access to shop dashboard/products/orders.
 * Redirect to /seller/verification-status if canAccessShop is false.
 */
export async function getSellerShopAccess(userId: string): Promise<{
  shop: { id: string; name: string; slug: string; status: string; [key: string]: any } | null
  verification: { status: string; [key: string]: any } | null
  canAccessShop: boolean
}> {
  const [shopResult, verificationResult] = await Promise.all([
    supabaseAdmin
      .from('shops')
      .select('*')
      .eq('userId', userId)
      .maybeSingle(),
    supabaseAdmin
      .from('shop_verifications')
      .select('id, shopId, status')
      .eq('userId', userId)
      .maybeSingle(),
  ])

  const shop = shopResult.data
  const verification = verificationResult.data
  const canAccessShop =
    !!shop &&
    shop.status === ShopStatus.ACTIVE &&
    !!verification &&
    verification.status === 'APPROVED'

  return {
    shop: shop || null,
    verification: verification || null,
    canAccessShop,
  }
}

export async function login(email: string, password: string) {
  try {
    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[LOGIN] Supabase not configured')
      return { success: false, error: 'Database connection error. Please contact support.' }
    }

    // Fetch user by email
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, password, name, role, status')
      .eq('email', email)
      .single()

    if (userError || !user) {
      // Check if any users exist
      const { count } = await supabaseAdmin
        .from('users')
        .select('*', { count: 'exact', head: true })
      
      if (count === 0) {
        console.warn('[LOGIN] No users found in database. Database may need to be seeded.')
        return { 
          success: false, 
          error: 'No users found. Please seed the database.' 
        }
      }
      return { success: false, error: 'Invalid email or password' }
    }

    if (user.status === UserStatus.BANNED) {
      return { success: false, error: 'Your account has been banned' }
    }

    if (user.status === UserStatus.SUSPENDED) {
      return { success: false, error: 'Your account has been suspended' }
    }

    const isValidPassword = await verifyPassword(password, user.password)
    if (!isValidPassword) {
      return { success: false, error: 'Invalid email or password' }
    }

    // Update last login
    await supabaseAdmin
      .from('users')
      .update({ lastLoginAt: new Date().toISOString() })
      .eq('id', user.id)

    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
    })

    // Create session record (cookie is set by the API route on the response)
    await supabaseAdmin
      .from('sessions')
      .insert({
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
      },
      token,
    }
  } catch (error) {
    console.error('Login function error:', error)
    return { success: false, error: 'Database connection error. Please try again.' }
  }
}

export async function loginAsUser(adminId: string, targetUserId: string) {
  // Verify admin
  const { data: admin } = await supabaseAdmin
    .from('users')
    .select('role, status')
    .eq('id', adminId)
    .single()

  if (!admin || (admin.role !== UserRole.ADMIN && admin.role !== UserRole.MANAGER)) {
    return { success: false, error: 'Unauthorized' }
  }

  // Get target user
  const { data: targetUser } = await supabaseAdmin
    .from('users')
    .select('id, email, name, role, status')
    .eq('id', targetUserId)
    .single()

  if (!targetUser) {
    return { success: false, error: 'User not found' }
  }

  // Create token with impersonation flag
  const token = await createToken({
    userId: targetUser.id,
    email: targetUser.email,
    role: targetUser.role as UserRole,
    impersonatedBy: adminId,
  })

  return {
    success: true,
    user: targetUser,
    token,
  }
}

export async function logout() {
  const session = await getSession()

  if (session) {
    // If impersonating, return to admin (API route will set cookie on response)
    if (session.impersonatedBy) {
      const { data: admin } = await supabaseAdmin
        .from('users')
        .select('id, email, role')
        .eq('id', session.impersonatedBy)
        .single()

      if (admin) {
        const token = await createToken({
          userId: admin.id,
          email: admin.email,
          role: admin.role as UserRole,
        })
        return { success: true, returnedToAdmin: true, token }
      }
    }

    // Delete session from database
    await supabaseAdmin
      .from('sessions')
      .delete()
      .eq('userId', session.userId)
  }

  return { success: true }
}

export async function register(data: {
  email: string
  password: string
  name: string
}) {
  try {
    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[REGISTER] Supabase not configured')
      return { success: false, error: 'Database connection error. Please contact support.' }
    }

    // Check if user exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', data.email)
      .single()

    if (existingUser) {
      return { success: false, error: 'Email already registered' }
    }

    const hashedPassword = await hashPassword(data.password)

    // Create user
    const { data: user, error: createError } = await supabaseAdmin
      .from('users')
      .insert({
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      })
      .select('id, email, name, role')
      .single()

    if (createError || !user) {
      console.error('[REGISTER] Database create error:', createError)
      return { 
        success: false, 
        error: `Registration failed: ${createError?.message || 'Unknown error'}` 
      }
    }

    // Auto login after registration (API route will set cookie on response)
    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
    })

    return { success: true, user, token }
  } catch (error) {
    console.error('[REGISTER] Unexpected error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Registration failed. Please try again.' 
    }
  }
}

export function requireAuth(allowedRoles?: UserRole[]) {
  return async function () {
    const session = await getSession()
    
    if (!session) {
      return { authorized: false, error: 'Not authenticated' }
    }

    if (allowedRoles && !allowedRoles.includes(session.role)) {
      return { authorized: false, error: 'Insufficient permissions' }
    }

    return { authorized: true, session }
  }
}

export const requireAdmin = requireAuth([UserRole.ADMIN])
export const requireManager = requireAuth([UserRole.ADMIN, UserRole.MANAGER])
