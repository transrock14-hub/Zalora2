'use client'

import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import Link from 'next/link'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'

type DateRange = '7d' | '30d' | '90d' | 'all'

interface DashboardStats {
  range: DateRange
  totalUsers: number
  totalOrders: number
  totalProducts: number
  totalRevenue: number
  pendingOrders: number
  activeShops: number
  openTickets: number
  chartData: Array<{ date: string; orders: number; revenue: number }>
  recentOrders: Array<{
    id: string
    orderNumber: string
    userName: string
    total: number
    status: string
  }>
}

const RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
]

export function AdminDashboardClient() {
  const [range, setRange] = useState<DateRange>('30d')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    fetch(`/api/admin/dashboard/stats?range=${range}`)
      .then((res) => res.json())
      .then((data) => {
        if (active && data.totalUsers !== undefined) setStats(data)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [range])

  const statCards = stats
    ? [
        {
          title: 'Users',
          value: stats.totalUsers,
          icon: 'solar:users-group-rounded-bold',
          color: 'text-blue-500',
          bgColor: 'bg-blue-100',
          href: '/admin/users',
        },
        {
          title: 'Orders',
          value: stats.totalOrders,
          icon: 'solar:bill-list-bold',
          color: 'text-green-500',
          bgColor: 'bg-green-100',
          href: '/admin/orders',
        },
        {
          title: 'Products',
          value: stats.totalProducts,
          icon: 'solar:box-bold',
          color: 'text-purple-500',
          bgColor: 'bg-purple-100',
          href: '/admin/products',
        },
        {
          title: 'Revenue',
          value: formatPrice(stats.totalRevenue),
          icon: 'solar:wallet-bold',
          color: 'text-amber-500',
          bgColor: 'bg-amber-100',
          href: '/admin/orders',
        },
        {
          title: 'Pending',
          value: stats.pendingOrders,
          icon: 'solar:clock-circle-bold',
          color: 'text-orange-500',
          bgColor: 'bg-orange-100',
          href: '/admin/orders?status=pending',
        },
        {
          title: 'Shops',
          value: stats.activeShops,
          icon: 'solar:shop-bold',
          color: 'text-pink-500',
          bgColor: 'bg-pink-100',
          href: '/admin/shops',
        },
        {
          title: 'Tickets',
          value: stats.openTickets,
          icon: 'solar:chat-round-dots-bold',
          color: 'text-red-500',
          bgColor: 'bg-red-100',
          href: '/admin/support',
        },
      ]
    : []

  const chartData = (stats?.chartData || []).map((d) => ({
    ...d,
    label: d.date.slice(5),
  }))

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to ZALORA Admin Panel</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {RANGE_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              size="sm"
              variant={range === opt.value ? 'default' : 'outline'}
              onClick={() => setRange(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {loading && !stats ? (
        <div className="flex justify-center py-16">
          <Icon icon="solar:refresh-circle-linear" className="size-10 animate-spin text-primary" />
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat) => (
              <Link key={stat.title} href={stat.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`size-12 rounded-full ${stat.bgColor} flex items-center justify-center`}>
                        <Icon icon={stat.icon} className={`size-6 ${stat.color}`} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{stat.title}</p>
                        <p className="text-xl font-bold">{stat.value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Orders & Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="orders" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis yAxisId="revenue" orientation="right" tick={{ fontSize: 11 }} hide />
                      <Tooltip
                        formatter={(value: number, name: string) =>
                          name === 'revenue' ? formatPrice(value) : value
                        }
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Bar yAxisId="orders" dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="orders" />
                      <Bar yAxisId="revenue" dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} name="revenue" opacity={0.85} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Link
                  href="/admin/products/new"
                  className="flex flex-col items-center gap-2 p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  <Icon icon="solar:add-circle-bold" className="size-8 text-primary" />
                  <span className="text-sm font-medium">Add Product</span>
                </Link>
                <Link
                  href="/admin/categories"
                  className="flex flex-col items-center gap-2 p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  <Icon icon="solar:widget-add-bold" className="size-8 text-green-500" />
                  <span className="text-sm font-medium">Add Category</span>
                </Link>
                <Link
                  href="/admin/coupons"
                  className="flex flex-col items-center gap-2 p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  <Icon icon="solar:ticket-bold" className="size-8 text-purple-500" />
                  <span className="text-sm font-medium">Create Coupon</span>
                </Link>
                <Link
                  href="/admin/reviews"
                  className="flex flex-col items-center gap-2 p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  <Icon icon="solar:star-bold" className="size-8 text-amber-500" />
                  <span className="text-sm font-medium">Moderate Reviews</span>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Orders</CardTitle>
              <Link href="/admin/orders" className="text-sm text-primary hover:underline">
                View all
              </Link>
            </CardHeader>
            <CardContent>
              {stats.recentOrders.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No orders yet</p>
              ) : (
                <div className="space-y-4">
                  {stats.recentOrders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/admin/orders`}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Icon icon="solar:bag-3-bold" className="size-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{order.orderNumber}</p>
                          <p className="text-xs text-muted-foreground">{order.userName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{formatPrice(order.total)}</p>
                        <p className="text-xs text-muted-foreground">{order.status}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="text-center text-muted-foreground py-8">Failed to load dashboard</p>
      )}
    </div>
  )
}
