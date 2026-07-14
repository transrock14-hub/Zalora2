import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number | string, currency: string = 'USD'): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(numPrice)
}

export function formatCryptoPrice(price: number | string, crypto: string): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price
  const symbols: Record<string, string> = {
    BTC: '₿',
    ETH: 'Ξ',
    USDT: '₮',
  }
  return `${symbols[crypto] || ''} ${numPrice.toFixed(crypto === 'USDT' ? 2 : 8)}`
}

export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `ZN-${timestamp}-${random}`
}

export function generatePaymentMemo(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.substring(0, length) + '...'
}

/**
 * Public-facing user ID: 6 digits only (stable for a given UUID).
 * Does not change the real database id — display only.
 */
export function formatDisplayUserId(id: string): string {
  const hex = id.replace(/[^0-9a-f]/gi, '').slice(-8)
  if (!hex) return '000000'
  // Avoid BigInt literals (Hostinger/TS target may be < ES2020)
  const n = parseInt(hex, 16)
  if (!Number.isFinite(n)) return '000000'
  return String(n % 1000000).padStart(6, '0')
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  })
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function timeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const seconds = Math.floor((new Date().getTime() - d.getTime()) / 1000)

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  }

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit)
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`
    }
  }

  return 'Just now'
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/
  return phoneRegex.test(phone.replace(/[\s-]/g, ''))
}

export function calculateDiscount(price: number, comparePrice: number): number {
  if (!comparePrice || comparePrice <= price) return 0
  return Math.round(((comparePrice - price) / comparePrice) * 100)
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // Order statuses
    PENDING_PAYMENT: 'text-yellow-600 bg-yellow-100',
    PAYMENT_CONFIRMING: 'text-blue-600 bg-blue-100',
    PAID: 'text-green-600 bg-green-100',
    PROCESSING: 'text-purple-600 bg-purple-100',
    SHIPPED: 'text-indigo-600 bg-indigo-100',
    DELIVERED: 'text-teal-600 bg-teal-100',
    COMPLETED: 'text-green-700 bg-green-100',
    CANCELLED: 'text-red-600 bg-red-100',
    REFUNDED: 'text-orange-600 bg-orange-100',
    // User statuses
    ACTIVE: 'text-green-600 bg-green-100',
    SUSPENDED: 'text-yellow-600 bg-yellow-100',
    BANNED: 'text-red-600 bg-red-100',
    // Shop statuses
    PENDING: 'text-yellow-600 bg-yellow-100',
    CLOSED: 'text-gray-600 bg-gray-100',
    // Ticket statuses
    OPEN: 'text-blue-600 bg-blue-100',
    IN_PROGRESS: 'text-purple-600 bg-purple-100',
    WAITING_CUSTOMER: 'text-yellow-600 bg-yellow-100',
    RESOLVED: 'text-green-600 bg-green-100',
  }
  return colors[status] || 'text-gray-600 bg-gray-100'
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      void func(...args)
    }, wait)
  }
}
