import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware: no auth cookie read or redirect.
 * Auth is enforced client-side via SessionGate / AdminAuthGate (Netlify + RSC + cookies is unreliable).
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === '/maintenance') {
    return NextResponse.next({ request })
  }

  if (pathname.startsWith('/account') || pathname.startsWith('/seller')) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-pathname', pathname)
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  return NextResponse.next({ request })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|images|icons).*)',
  ],
}
