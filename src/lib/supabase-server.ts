import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

/**
 * Create a Supabase client for server-side use (Server Components, Server Actions).
 * Uses cookies from next/headers. In Server Components, setAll may throw (read-only);
 * that's expected and ignored so middleware can refresh the session.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            )
          } catch {
            // Expected in Server Components (read-only). Middleware will refresh session.
          }
        },
      },
    }
  )
}

/** Cookie entry for Route Handler response */
export type CookieToSet = { name: string; value: string; options?: Record<string, unknown> }

/**
 * Create a Supabase client for Route Handlers. Reads cookies from the request;
 * setAll is buffered so you can add them to the response.
 * Usage: const { supabase, cookiesToSet } = await createSupabaseRouteHandlerClient(request);
 * Then return NextResponse.json(..., { headers: { 'Set-Cookie': cookiesToSet.map(...) } });
 */
export async function createSupabaseRouteHandlerClient(request: NextRequest) {
  const cookiesToSet: CookieToSet[] = []
  const requestCookies = request.cookies

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return requestCookies.getAll()
        },
        setAll(cookiesToSetList: CookieToSet[]) {
          cookiesToSet.push(...cookiesToSetList)
        },
      },
    }
  )

  return { supabase, cookiesToSet }
}

/** Apply buffered cookies to a NextResponse (use response.cookies.set) */
export function applyCookiesToResponse(
  response: { cookies: { set: (name: string, value: string, options?: Record<string, unknown>) => void } },
  cookiesToSet: CookieToSet[]
): void {
  cookiesToSet.forEach(({ name, value, options }) => {
    const opts = (options ?? {}) as { maxAge?: number; path?: string; httpOnly?: boolean; secure?: boolean; sameSite?: string }
    response.cookies.set(name, value, {
      path: opts.path ?? '/',
      maxAge: opts.maxAge ?? 60 * 60 * 24 * 7,
      httpOnly: opts.httpOnly ?? true,
      secure: opts.secure ?? process.env.NODE_ENV === 'production',
      sameSite: (opts.sameSite as 'lax' | 'strict' | 'none') ?? 'lax',
    })
  })
}
