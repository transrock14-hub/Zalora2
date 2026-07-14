'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import toast from 'react-hot-toast'
import { useUserStore } from '@/lib/store'

function AdminLoginForm() {
  const router = useRouter()
  const setUser = useUserStore((state) => state.setUser)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields')
      return
    }

    setLoading(true)

    try {
      console.log('[ADMIN LOGIN] Attempting admin login for:', formData.email)
      
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include', // Important for cookies to be set
      })

      console.log('[ADMIN LOGIN] Response status:', res.status)
      const data = await res.json()
      console.log('[ADMIN LOGIN] Response data:', data)

      if (!res.ok) {
        // If 403, try to check the role for diagnostic purposes
        if (res.status === 403 && data.error) {
          // Show detailed error message
          toast.error(data.error)
          
          // Try to check role for diagnostics
          try {
            const checkRes = await fetch('/api/admin/auth/check-role', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: formData.email }),
            })
            const checkData = await checkRes.json()
            if (checkData.user) {
              console.error('[ADMIN LOGIN] Role diagnostic:', checkData.user)
              console.error(`[ADMIN LOGIN] Current role: "${checkData.user.role}" | Expected: "ADMIN" or "MANAGER"`)
            }
          } catch (e) {
            // Ignore diagnostic errors
          }
        }
        throw new Error(data.error || 'Admin login failed')
      }

      // Fetch user data to verify
      console.log('[ADMIN LOGIN] Fetching user data...')
      const userRes = await fetch('/api/auth/me', {
        credentials: 'include', // Important for cookies to be sent
      })
      const userData = await userRes.json()
      console.log('[ADMIN LOGIN] User data:', userData)
      
      if (userRes.ok && userData.user) {
        // Double-check role (case-insensitive)
        const userRole = String(userData.user.role || '').toUpperCase().trim()
        if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
          console.error('[ADMIN LOGIN] Role check failed:', {
            role: userData.user.role,
            normalizedRole: userRole
          })
          toast.error(`Access denied. Your account role is "${userData.user.role}". Admin access required.`)
          return
        }
        
        setUser(userData.user)
        toast.success('Welcome back, Admin!')

        // Full page redirect to admin dashboard
        window.location.href = '/admin'
        return
      } else {
        throw new Error('Failed to fetch user data')
      }
    } catch (error) {
      console.error('[ADMIN LOGIN] Error:', error)
      toast.error(error instanceof Error ? error.message : 'Admin login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-background flex flex-col">
      {/* Header */}
      <header className="bg-primary px-4 py-3 flex items-center gap-3 shadow-sm">
        <Link href="/" className="text-white hover:opacity-80 transition-opacity">
          <Icon icon="solar:arrow-left-linear" className="size-6" />
        </Link>
        <h1 className="text-lg font-semibold text-white">Admin Login</h1>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-2 border-primary/20">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto mb-4 flex justify-center">
              <Image
                src="/images/logo.png"
                alt="ZALORA"
                width={180}
                height={60}
                className="object-contain"
                priority
              />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold">Admin Portal</CardTitle>
              <CardDescription className="text-base">
                Sign in to access the admin dashboard
              </CardDescription>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2 border-t">
              <Icon icon="solar:shield-check-bold" className="size-5 text-primary" />
              <span className="text-xs text-muted-foreground font-medium">
                Admin & Manager Access Only
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  autoComplete="email"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  autoComplete="current-password"
                  className="h-11"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 font-semibold" 
                disabled={loading}
                onClick={(e) => {
                  // Ensure form validation happens
                  const form = e.currentTarget.closest('form')
                  if (form && !form.checkValidity()) {
                    form.reportValidity()
                    return
                  }
                }}
              >
                {loading ? (
                  <>
                    <Icon icon="solar:loading-circle-bold" className="mr-2 size-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Icon icon="solar:login-3-bold" className="mr-2 size-4" />
                    Sign In to Admin Portal
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    }>
      <AdminLoginForm />
    </Suspense>
  )
}
