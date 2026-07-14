'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Icon } from '@iconify/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Deposit {
  id: string
  userId: string
  shopId?: string | null
  currency: string
  network: string | null
  amount: number
  proofUrl: string | null
  status: string
  createdAt: string
  reviewedAt: string | null
  user: { id: string; name: string; email: string }
}

export function DepositsClient() {
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('PENDING')
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchDeposits = async () => {
    setLoading(true)
    try {
      const url = filter ? `/api/admin/deposits?status=${filter}` : '/api/admin/deposits'
      const res = await fetch(url, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setDeposits(data.deposits || [])
      }
    } catch (e) {
      console.error(e)
      toast.error('Failed to load deposits')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDeposits()
  }, [filter])

  const handleApprove = async (id: string) => {
    setUpdating(id)
    try {
      const res = await fetch(`/api/admin/deposits/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed')
      }
      toast.success('Deposit approved')
      fetchDeposits()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setUpdating(null)
    }
  }

  const handleReject = async (id: string) => {
    setUpdating(id)
    try {
      const res = await fetch(`/api/admin/deposits/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED' }),
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed')
      }
      toast.success('Deposit rejected')
      fetchDeposits()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setUpdating(null)
    }
  }

  const statusColor = (status: string) => {
    if (status === 'APPROVED') return 'bg-emerald-100 text-emerald-800'
    if (status === 'REJECTED') return 'bg-red-100 text-red-800'
    return 'bg-amber-100 text-amber-800'
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold font-heading">Deposit Approvals</h1>
        <div className="flex gap-2">
          {['PENDING', 'APPROVED', 'REJECTED'].map((s) => (
            <Button
              key={s}
              variant={filter === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(s)}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-muted-foreground py-8">Loading...</div>
      ) : deposits.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Icon icon="solar:wallet-money-bold" className="size-16 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">No {filter.toLowerCase()} deposits</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {deposits.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{d.currency} {d.network ? `(${d.network})` : ''}</p>
                    <p className="text-2xl font-bold mt-1">{Number(d.amount).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {d.user?.name} · {d.user?.email}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDateTime(d.createdAt)}
                    </p>
                    {d.proofUrl && (
                      <a
                        href={d.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary text-sm mt-2 inline-block"
                      >
                        View proof
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {d.shopId ? (
                      <Badge variant="secondary" className="bg-violet-100 text-violet-800">Shop balance</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-slate-100 text-slate-800">User balance</Badge>
                    )}
                    <Badge className={statusColor(d.status)}>{d.status}</Badge>
                    {d.status === 'PENDING' && (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleApprove(d.id)}
                          disabled={updating === d.id}
                        >
                          {updating === d.id ? '...' : 'Approve'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(d.id)}
                          disabled={updating === d.id}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
