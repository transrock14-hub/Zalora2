import type { NextRequest } from 'next/server'

/**
 * Build the base URL for redirects using the request's Host and protocol.
 * On Netlify, request.url can be the internal/branch host (e.g. main--*.netlify.app),
 * which causes redirects to the wrong host and CORS errors. Using Host + x-forwarded-proto
 * keeps redirects on the same origin the user used (e.g. zalora-fashion.netlify.app).
 */
export function getRedirectBase(request: NextRequest): string {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') || request.nextUrl?.protocol?.replace(':', '') || 'https'
  if (host) return `${proto}://${host}`
  return request.url
}
