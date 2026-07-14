'use client'

import Link from 'next/link'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'
import { NotificationsDropdown } from '@/components/notifications-dropdown'

interface User {
  id: string
  name: string
  email: string
  role: string
  avatar?: string | null
  isImpersonating?: boolean
}

export function AdminHeader({ user }: { user: User }) {
  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      const data = await res.json()

      if (data.returnedToAdmin) {
        toast.success('Returned to admin account')
        window.location.href = '/admin'
        return
      }

      try {
        const { createSupabaseBrowserClient } = await import('@/lib/supabase-client')
        await createSupabaseBrowserClient().auth.signOut({ scope: 'global' })
      } catch {
        // ignore
      }

      window.location.href = '/auth/login'
    } catch {
      toast.error('Logout failed')
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-card border-b border-border">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Mobile Logo */}
        <Link href="/admin" className="lg:hidden flex items-center gap-2">
          <Icon icon="solar:home-2-bold" className="size-6 text-primary" />
          <span className="font-bold text-primary">Admin</span>
        </Link>

        {/* Impersonation Banner */}
        {user.isImpersonating && (
          <div className="hidden lg:flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
            <Icon icon="solar:eye-bold" className="size-4" />
            <span>Viewing as {user.name}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-yellow-800 hover:bg-yellow-200"
              onClick={handleLogout}
            >
              Exit
            </Button>
          </div>
        )}

        {/* Search (Desktop) */}
        <div className="hidden lg:flex flex-1 max-w-md mx-8">
          <div className="w-full flex items-center gap-2 px-4 py-2 bg-input rounded-lg text-sm text-muted-foreground">
            <Icon icon="solar:magnifer-linear" className="size-5" />
            <input
              type="text"
              placeholder="Search..."
              className="flex-1 bg-transparent border-none outline-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <NotificationsDropdown variant="admin" />

          {/* View Store */}
          <Button variant="ghost" size="icon" asChild className="hidden lg:flex">
            <Link href="/" target="_blank">
              <Icon icon="solar:eye-linear" className="size-5" />
            </Link>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar || undefined} alt={user.name} />
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                  <p className="text-xs leading-none text-primary font-medium">
                    {user.role}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/admin/settings">
                  <Icon icon="solar:settings-linear" className="mr-2 size-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/" target="_blank">
                  <Icon icon="solar:shop-linear" className="mr-2 size-4" />
                  View Store
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <Icon icon="solar:logout-2-linear" className="mr-2 size-4" />
                {user.isImpersonating ? 'Return to Admin' : 'Log out'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
