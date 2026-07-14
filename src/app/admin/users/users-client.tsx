'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icon } from '@iconify/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getStatusColor, formatDateTime, formatDisplayUserId } from '@/lib/utils'
import { UserActions } from './user-actions'

interface User {
  id: string
  email: string
  name: string
  avatar: string | null
  role: string
  status: string
  balance: number
  canSell: boolean
  lastLoginAt: string | null
  shop: {
    id: string
    name: string
    status: string
  } | null
}

interface UsersClientProps {
  users: User[]
  total: number
  pages: number
  page: number
  searchParams: {
    search?: string
    role?: string
    status?: string
  }
}

export function UsersClient({
  users,
  total,
  pages,
  page,
  searchParams,
}: UsersClientProps) {
  const router = useRouter()

  // Without Supabase Realtime enabled, keep the list fresh by:
  // - Refreshing when the tab gains focus
  // - Optionally polling every few seconds while on this page
  useEffect(() => {
    const handleFocus = () => {
      router.refresh()
    }
    window.addEventListener('focus', handleFocus)

    const interval = window.setInterval(() => {
      router.refresh()
    }, 5000) // 5s polling for near‑instant visibility after signup

    return () => {
      window.removeEventListener('focus', handleFocus)
      window.clearInterval(interval)
    }
  }, [router])

  const handleRefresh = () => {
    try {
      // Prefer Next.js soft refresh to keep client state where possible
      router.refresh()
    } catch {
      // Fallback: force a full page reload if something goes wrong
      if (typeof window !== 'undefined') {
        window.location.reload()
      }
    }
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">User Management</h1>
          <p className="text-muted-foreground">Manage all users and their permissions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <Icon icon="solar:refresh-bold" className="mr-2 size-4" />
            Refresh
          </Button>
          <Link href="/admin/users/new">
            <Button>
              <Icon icon="solar:add-circle-bold" className="mr-2 size-4" />
              Add User
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <form className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Icon
                  icon="solar:magnifer-linear"
                  className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
                />
                <input
                  type="text"
                  name="search"
                  placeholder="Search by name or email..."
                  defaultValue={searchParams.search}
                  className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <select
              name="role"
              defaultValue={searchParams.role}
              className="px-4 py-2 bg-input border border-border rounded-lg text-sm"
            >
              <option value="">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="USER">User</option>
            </select>
            <select
              name="status"
              defaultValue={searchParams.status}
              className="px-4 py-2 bg-input border border-border rounded-lg text-sm"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="BANNED">Banned</option>
            </select>
            <Button type="submit" variant="secondary">
              <Icon icon="solar:filter-bold" className="mr-2 size-4" />
              Filter
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>Showing {users.length} of {total} users</span>
      </div>

      {/* Users List */}
      <div className="grid gap-4">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* User Info */}
                <div className="flex items-center gap-3 flex-1">
                  <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Icon icon="solar:user-bold" className="size-6 text-primary" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{user.name}</p>
                      <Badge variant="outline" className={getStatusColor(user.status)}>
                        {user.status}
                      </Badge>
                      <Badge variant="secondary">{user.role}</Badge>
                      {user.canSell && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          <Icon icon="solar:shop-bold" className="mr-1 size-3" />
                          Seller
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">ID: {formatDisplayUserId(user.id)}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex flex-wrap items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="text-muted-foreground text-xs">Balance</p>
                    <p className="font-bold text-primary">${user.balance.toFixed(2)}</p>
                  </div>
                  {user.shop && (
                    <div className="text-center">
                      <p className="text-muted-foreground text-xs">Shop</p>
                      <p className="font-medium">{user.shop.name}</p>
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-muted-foreground text-xs">Last Login</p>
                    <p className="text-xs">
                      {user.lastLoginAt ? formatDateTime(new Date(user.lastLoginAt)) : 'Never'}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <UserActions user={user} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Link
            href={`/admin/users?page=${Math.max(1, page - 1)}`}
            className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
          >
            <Button variant="outline" size="icon">
              <Icon icon="solar:arrow-left-linear" className="size-4" />
            </Button>
          </Link>
          
          <span className="text-sm text-muted-foreground px-4">
            Page {page} of {pages}
          </span>
          
          <Link
            href={`/admin/users?page=${Math.min(pages, page + 1)}`}
            className={page >= pages ? 'pointer-events-none opacity-50' : ''}
          >
            <Button variant="outline" size="icon">
              <Icon icon="solar:arrow-right-linear" className="size-4" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
