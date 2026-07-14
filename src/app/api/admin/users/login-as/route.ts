import { NextResponse } from 'next/server'
import { getSession, loginAsUser, UserRole } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.role !== UserRole.ADMIN && session.role !== UserRole.MANAGER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const result = await loginAsUser(session.userId, userId)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const res = NextResponse.json({ success: true, user: result.user })
    if (result.token) {
      res.cookies.set('auth-token', result.token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 2,
      })
    }
    return res
  } catch (error) {
    console.error('Login as user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
