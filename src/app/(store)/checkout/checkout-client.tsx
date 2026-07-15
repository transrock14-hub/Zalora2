'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { useCartStore, useUserStore, useCheckoutStore } from '@/lib/store'
import { formatPrice } from '@/lib/utils'
import { computeOrderTotals, type CheckoutSettings } from '@/lib/checkout-settings'
import { useLanguage } from '@/contexts/language-context'
import toast from 'react-hot-toast'

interface CryptoAddress {
  id: string
  currency: string
  address: string
  network: string | null
  label: string | null
  qrCode: string | null
}

export function CheckoutClient() {
  const router = useRouter()
  const { t } = useLanguage()
  const { getSelectedItems, removeItem } = useCartStore()
  // Only the items the user selected in the cart are checked out.
  const items = getSelectedItems()
  const user = useUserStore((state) => state.user)
  const setUser = useUserStore((state) => state.setUser)
  const checkoutData = useCheckoutStore((s) => s.data)
  const setCoupon = useCheckoutStore((s) => s.setCoupon)
  const clearCoupon = useCheckoutStore((s) => s.clearCoupon)
  const resetCheckout = useCheckoutStore((s) => s.reset)

  const [authChecked, setAuthChecked] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<'address' | 'payment'>('address')
  const [checkoutSettings, setCheckoutSettings] = useState<CheckoutSettings | null>(null)
  const [couponInput, setCouponInput] = useState(checkoutData.couponCode || '')
  const [couponLoading, setCouponLoading] = useState(false)

  // Saved addresses for selection
  const [savedAddresses, setSavedAddresses] = useState<Array<{
    id: string
    name: string
    phone: string
    country: string
    state: string
    city: string
    address: string
    postalCode: string
    isDefault: boolean
  }>>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [loadingAddresses, setLoadingAddresses] = useState(false)

  // Address form
  const [addressData, setAddressData] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    notes: '',
  })

  // Auth check: redirect to login if not authenticated (checkout is protected client-side)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' })
        const data = await res.json()
        if (res.ok && data.user) {
          setUser(data.user)
          setAuthChecked(true)
          return
        }
        router.replace('/auth/login?redirect=' + encodeURIComponent('/checkout'))
      } catch {
        router.replace('/auth/login?redirect=' + encodeURIComponent('/checkout'))
      }
    }
    checkAuth()
  }, [setUser, router])

  // Load checkout settings (shipping, tax, payment toggles) from admin
  useEffect(() => {
    fetch('/api/settings/checkout')
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) setCheckoutSettings(data.settings)
      })
      .catch(() => {})
  }, [])

  // Fetch saved addresses when on address step and apply default once
  useEffect(() => {
    if (step !== 'address') return
    setLoadingAddresses(true)
    fetch('/api/addresses', { credentials: 'include' })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok || !data.addresses?.length) return
        setSavedAddresses(data.addresses)
        const defaultAddr = data.addresses.find((a: { isDefault: boolean }) => a.isDefault) || data.addresses[0]
        setSelectedAddressId(defaultAddr.id)
        setAddressData((prev) => ({
          ...prev,
          fullName: defaultAddr.name,
          phone: defaultAddr.phone,
          address: defaultAddr.address,
          city: defaultAddr.city,
          state: defaultAddr.state || '',
          zipCode: defaultAddr.postalCode || '',
          country: defaultAddr.country,
        }))
      })
      .catch(() => {})
      .finally(() => setLoadingAddresses(false))
  }, [step])

  // When user selects a saved address, fill form
  const applySavedAddress = (addr: (typeof savedAddresses)[0]) => {
    setSelectedAddressId(addr.id)
    setAddressData((prev) => ({
      ...prev,
      fullName: addr.name,
      phone: addr.phone,
      address: addr.address,
      city: addr.city,
      state: addr.state || '',
      zipCode: addr.postalCode || '',
      country: addr.country,
    }))
  }

  // Payment method: crypto-first (balance, bank transfer, or COD as optional)
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'crypto' | 'balance' | 'cod'>('crypto')
  const [payWithShopBalance, setPayWithShopBalance] = useState(false)
  const [addToStore, setAddToStore] = useState(false)
  const userBalance = user?.balance ?? 0
  const shopBalance = (user?.shop as { balance?: number } | undefined)?.balance ?? 0
  const hasShop = !!(user?.shop && (user.shop as { status?: string }).status === 'ACTIVE')
  const hasMainShopItems = items.some((i) => !(i as { shopId?: string }).shopId)
  const showAddToStore = hasShop && hasMainShopItems

  const settings: CheckoutSettings = checkoutSettings ?? {
    shippingFee: 0,
    freeShippingThreshold: 0,
    taxRate: 10,
    cryptoEnabled: true,
    enabledCryptos: ['USDT_TRC20', 'USDT_ERC20', 'BTC', 'ETH'],
    balanceEnabled: true,
    codEnabled: false,
    bankTransferEnabled: false,
    currency: 'USD',
    cryptoPaymentInstructions: '',
    cryptoPaymentTimeoutHours: 24,
  }

  // Pick the first available payment method once admin settings load
  useEffect(() => {
    if (!checkoutSettings) return
    if (checkoutSettings.cryptoEnabled) {
      setPaymentMethod('crypto')
    } else if (checkoutSettings.balanceEnabled) {
      setPaymentMethod('balance')
    } else if (checkoutSettings.bankTransferEnabled) {
      setPaymentMethod('card')
    } else if (checkoutSettings.codEnabled) {
      setPaymentMethod('cod')
    }
  }, [checkoutSettings])

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const discount = checkoutData.couponDiscount
  const { shipping, tax, total } = computeOrderTotals(subtotal, discount, settings)
  const freeShipping =
    settings.freeShippingThreshold > 0 && subtotal >= settings.freeShippingThreshold
  const balanceToUse = payWithShopBalance ? shopBalance : userBalance
  const canPayWithBalance = paymentMethod === 'balance' && balanceToUse >= total

  // Card details
  const [cardData, setCardData] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
  })

  // Crypto wallet
  const [cryptoType, setCryptoType] = useState<string>('')
  const [cryptoAddresses, setCryptoAddresses] = useState<CryptoAddress[]>([])
  const [selectedCryptoAddress, setSelectedCryptoAddress] = useState<CryptoAddress | null>(null)
  const [cryptoInstructions, setCryptoInstructions] = useState('')
  const [loadingCryptoAddresses, setLoadingCryptoAddresses] = useState(false)
  const [generatedCryptoQr, setGeneratedCryptoQr] = useState<string | null>(null)

  // Buyers always pay admin (platform). Sellers receive order credit separately; no seller-specific payment addresses.
  useEffect(() => {
    if (paymentMethod === 'crypto') {
      fetchCryptoAddresses(null)
    }
  }, [paymentMethod])

  // Update selected address when crypto type changes
  useEffect(() => {
    if (cryptoType && cryptoAddresses.length > 0) {
      const address = cryptoAddresses.find(addr => 
        addr.currency === cryptoType || 
        addr.currency.startsWith(cryptoType)
      )
      setSelectedCryptoAddress(address || null)
    }
  }, [cryptoType, cryptoAddresses])

  // Always generate QR from wallet address (admin QR URL field was removed)
  useEffect(() => {
    if (!selectedCryptoAddress?.address) {
      setGeneratedCryptoQr(null)
      return
    }
    let cancelled = false
    import('qrcode')
      .then((QRCode) =>
        QRCode.toDataURL(selectedCryptoAddress.address, { width: 192, margin: 1 })
      )
      .then((url) => {
        if (!cancelled) setGeneratedCryptoQr(url)
      })
      .catch(() => {
        if (!cancelled) setGeneratedCryptoQr(null)
      })
    return () => {
      cancelled = true
    }
  }, [selectedCryptoAddress?.id, selectedCryptoAddress?.address])

  const fetchCryptoAddresses = async (_shopId: string | null) => {
    setLoadingCryptoAddresses(true)
    try {
      const response = await fetch('/api/crypto-addresses')
      const data = await response.json()
      const list = data.addresses || []
      setCryptoAddresses(list)
      setCryptoInstructions(data.instructions || settings.cryptoPaymentInstructions || '')
      const usdtAddress = list.find((addr: CryptoAddress) => addr.currency.includes('USDT'))
      if (usdtAddress) {
        setCryptoType(usdtAddress.currency)
        setSelectedCryptoAddress(usdtAddress)
      } else if (list.length > 0) {
        setCryptoType(list[0].currency)
        setSelectedCryptoAddress(list[0])
      }
    } catch (error) {
      console.error('Failed to fetch crypto addresses:', error)
      toast.error('Failed to load payment addresses')
    } finally {
      setLoadingCryptoAddresses(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Address copied to clipboard!')
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Checking session...</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <Icon icon="solar:cart-large-linear" className="size-24 text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-bold mb-2">{t('emptyCart')}</h2>
          <p className="text-muted-foreground text-center mb-6">
            Please add items to cart before checkout
          </p>
          <Button asChild>
            <Link href="/products">
              <Icon icon="solar:bag-3-bold" className="mr-2 size-4" />
              {t('continueShopping')}
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const handlePlaceOrder = async () => {
    // Validate address
    if (!addressData.fullName || !addressData.email || !addressData.phone || !addressData.address || !addressData.city) {
      toast.error('Please fill in all required fields')
      return
    }

    if (paymentMethod === 'balance') {
      if (!settings.balanceEnabled) {
        toast.error('Balance payments are not available')
        return
      }
      if (!canPayWithBalance) {
        toast.error('Insufficient balance for this order')
        return
      }
    }
    if (paymentMethod === 'crypto') {
      if (!settings.cryptoEnabled) {
        toast.error('Cryptocurrency payments are not available')
        return
      }
      if (!selectedCryptoAddress) {
        toast.error('Please select a cryptocurrency')
        return
      }
    }
    if (paymentMethod === 'card' && !settings.bankTransferEnabled) {
      toast.error('Bank transfer is not available. Please choose another payment method.')
      return
    }
    if (paymentMethod === 'cod' && !settings.codEnabled) {
      toast.error('Cash on delivery is not available')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: items.map(item => ({
            productId: item.productId || item.id,
            quantity: item.quantity,
          })),
          address: addressData,
          paymentMethod,
          payWithShopBalance: paymentMethod === 'balance' ? payWithShopBalance : undefined,
          addToStore: showAddToStore ? addToStore : undefined,
          cryptoType: paymentMethod === 'crypto' ? cryptoType : undefined,
          cryptoAddressId: paymentMethod === 'crypto' ? selectedCryptoAddress?.id : undefined,
          couponCode: checkoutData.couponCode || undefined,
          shopId: undefined,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success('Order placed successfully!')
        resetCheckout()
        // Remove only the ordered (selected) items; keep the rest of the cart.
        const orderedIds = items.map((i) => i.id)
        orderedIds.forEach((id) => removeItem(id))
        router.push(`/account/orders/${data.orderId}`)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to place order')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      toast.error('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const applyCoupon = async () => {
    const code = couponInput.trim()
    if (!code) {
      toast.error('Enter a coupon code')
      return
    }
    setCouponLoading(true)
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Invalid coupon')
      setCoupon(data.code, data.discount)
      toast.success(`Coupon ${data.code} applied!`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Invalid coupon')
    } finally {
      setCouponLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 lg:pb-0">
      {/* Mobile Header */}
      <div className="bg-primary px-4 pt-4 pb-6 lg:hidden">
        <div className="flex items-center justify-between">
          <Link href="/cart" className="text-white">
            <Icon icon="solar:arrow-left-linear" className="size-6" />
          </Link>
          <h1 className="text-white text-lg font-bold font-heading">{t('checkout')}</h1>
          <div className="size-6" />
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block container mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/cart" className="text-muted-foreground hover:text-foreground">
            <Icon icon="solar:arrow-left-linear" className="size-6" />
          </Link>
          <h1 className="text-2xl font-bold font-heading">{t('checkout')}</h1>
        </div>
      </div>

      <div className="flex-1 px-4 lg:container lg:mx-auto">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Steps */}
            <div className="flex items-center gap-4 mb-6">
              <div className={`flex items-center gap-2 ${step === 'address' ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`size-8 rounded-full flex items-center justify-center font-bold ${step === 'address' ? 'bg-primary text-white' : 'bg-muted'}`}>
                  1
                </div>
                <span className="text-sm font-medium">{t('addresses')}</span>
              </div>
              <div className="flex-1 h-0.5 bg-border" />
              <div className={`flex items-center gap-2 ${step === 'payment' ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`size-8 rounded-full flex items-center justify-center font-bold ${step === 'payment' ? 'bg-primary text-white' : 'bg-muted'}`}>
                  2
                </div>
                <span className="text-sm font-medium">Payment</span>
              </div>
            </div>

            {/* Address Form */}
            {step === 'address' && (
              <div className="bg-card rounded-xl p-6 border border-border/50">
                <h3 className="text-lg font-bold mb-4">Delivery {t('addresses')}</h3>

                {loadingAddresses ? (
                  <div className="flex items-center justify-center py-6">
                    <Icon icon="solar:refresh-circle-linear" className="size-8 animate-spin text-primary" />
                  </div>
                ) : savedAddresses.length > 0 ? (
                  <div className="mb-6">
                    <Label className="text-sm font-medium mb-2 block">Use a saved address</Label>
                    <div className="space-y-2">
                      {savedAddresses.map((addr) => (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() => applySavedAddress(addr)}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                            selectedAddressId === addr.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium">{addr.name}</p>
                              <p className="text-sm text-muted-foreground">{addr.phone}</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {[addr.address, addr.city, addr.state, addr.postalCode].filter(Boolean).join(', ')} {addr.country}
                              </p>
                            </div>
                            {selectedAddressId === addr.id && (
                              <Icon icon="solar:check-circle-bold" className="size-5 text-primary shrink-0" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">Or edit details below</p>
                  </div>
                ) : null}

                {!loadingAddresses && savedAddresses.length === 0 && (
                  <p className="text-sm text-muted-foreground mb-4">
                    <Link href="/account/addresses" className="text-primary hover:underline">
                      Add a saved address
                    </Link>{' '}
                    to speed up future checkouts.
                  </p>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={addressData.fullName}
                      onChange={(e) => setAddressData({ ...addressData, fullName: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={addressData.email}
                      onChange={(e) => setAddressData({ ...addressData, email: e.target.value })}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={addressData.phone}
                      onChange={(e) => setAddressData({ ...addressData, phone: e.target.value })}
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="address">Address *</Label>
                    <Input
                      id="address"
                      value={addressData.address}
                      onChange={(e) => setAddressData({ ...addressData, address: e.target.value })}
                      placeholder="Street address, P.O. box"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={addressData.city}
                      onChange={(e) => setAddressData({ ...addressData, city: e.target.value })}
                      placeholder="New York"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State / Province</Label>
                    <Input
                      id="state"
                      value={addressData.state}
                      onChange={(e) => setAddressData({ ...addressData, state: e.target.value })}
                      placeholder="NY"
                    />
                  </div>
                  <div>
                    <Label htmlFor="zipCode">ZIP / Postal Code</Label>
                    <Input
                      id="zipCode"
                      value={addressData.zipCode}
                      onChange={(e) => setAddressData({ ...addressData, zipCode: e.target.value })}
                      placeholder="10001"
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={addressData.country}
                      onChange={(e) => setAddressData({ ...addressData, country: e.target.value })}
                      placeholder="United States"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="notes">Delivery Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={addressData.notes}
                      onChange={(e) => setAddressData({ ...addressData, notes: e.target.value })}
                      placeholder="Any special instructions for delivery"
                      rows={3}
                    />
                  </div>
                </div>
                <Button onClick={() => setStep('payment')} className="w-full mt-6" size="lg">
                  Continue to Payment
                </Button>
              </div>
            )}

            {/* Payment Form */}
            {step === 'payment' && (
              <div className="bg-card rounded-xl p-6 border border-border/50">
                <h3 className="text-lg font-bold mb-4">Payment Method</h3>
                
                <RadioGroup value={paymentMethod} onValueChange={(value: 'card' | 'crypto' | 'balance' | 'cod') => setPaymentMethod(value)}>
                  <div className="space-y-3">
                    {/* Crypto — primary */}
                    {settings.cryptoEnabled && (
                      <div className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 ${paymentMethod === 'crypto' ? 'border-primary/50 bg-primary/5' : 'border-border'}`}>
                        <RadioGroupItem value="crypto" id="crypto" />
                        <Label htmlFor="crypto" className="flex-1 cursor-pointer flex items-center gap-2">
                          <Icon icon="solar:bitcoin-linear" className="size-5" />
                          <span>Cryptocurrency</span>
                          <span className="text-xs text-muted-foreground">
                            {(settings.enabledCryptos || []).join(', ').replace(/_/g, ' ') || 'USDT, BTC, ETH'}
                          </span>
                        </Label>
                      </div>
                    )}

                    {/* Account balance */}
                    {settings.balanceEnabled && (
                      <div className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 ${paymentMethod === 'balance' ? 'border-primary/50 bg-primary/5' : 'border-border'}`}>
                        <RadioGroupItem value="balance" id="balance" />
                        <Label htmlFor="balance" className="flex-1 cursor-pointer flex items-center gap-2">
                          <Icon icon="solar:wallet-money-bold" className="size-5" />
                          <span>Account balance</span>
                          <span className="text-sm font-semibold text-primary">{formatPrice(userBalance)}</span>
                        </Label>
                      </div>
                    )}
                    {settings.balanceEnabled && hasShop && (
                      <div className="flex items-center space-x-3 pl-4">
                        <input
                          type="checkbox"
                          id="payWithShopBalance"
                          checked={payWithShopBalance}
                          onChange={(e) => setPayWithShopBalance(e.target.checked)}
                          disabled={paymentMethod !== 'balance'}
                          className="size-4 rounded border-border accent-primary"
                        />
                        <Label htmlFor="payWithShopBalance" className="text-sm cursor-pointer">
                          Use shop balance instead — <span className="font-semibold text-primary">{formatPrice(shopBalance)}</span> available
                        </Label>
                      </div>
                    )}

                    {/* Bank transfer */}
                    {settings.bankTransferEnabled && (
                      <div className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 ${paymentMethod === 'card' ? 'border-primary/50 bg-primary/5' : 'border-border'}`}>
                        <RadioGroupItem value="card" id="card" />
                        <Label htmlFor="card" className="flex-1 cursor-pointer flex items-center gap-2">
                          <Icon icon="solar:card-bold" className="size-5" />
                          <span>Bank transfer / Card</span>
                        </Label>
                      </div>
                    )}

                    {/* Cash on delivery */}
                    {settings.codEnabled && (
                      <div className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 ${paymentMethod === 'cod' ? 'border-primary/50 bg-primary/5' : 'border-border'}`}>
                        <RadioGroupItem value="cod" id="cod" />
                        <Label htmlFor="cod" className="flex-1 cursor-pointer flex items-center gap-2">
                          <Icon icon="solar:delivery-bold" className="size-5" />
                          <span>Cash on Delivery</span>
                        </Label>
                      </div>
                    )}
                  </div>
                </RadioGroup>

                {paymentMethod === 'balance' && (
                  <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <p className="text-sm font-medium">
                      {canPayWithBalance
                        ? `Your ${payWithShopBalance ? 'shop' : 'account'} balance (${formatPrice(balanceToUse)}) will be charged ${formatPrice(total)}.`
                        : `Insufficient balance. You have ${formatPrice(balanceToUse)}; order total is ${formatPrice(total)}. Top up to continue.`}
                    </p>
                  </div>
                )}

                {paymentMethod === 'cod' && (
                  <div className="mt-6 p-4 bg-muted/50 border border-border rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Pay with cash when your order is delivered. Your order will be confirmed after placement.
                    </p>
                  </div>
                )}

                {showAddToStore && (
                  <div className="mt-4 flex items-center space-x-3 p-4 border rounded-lg border-border">
                    <input
                      type="checkbox"
                      id="addToStore"
                      checked={addToStore}
                      onChange={(e) => setAddToStore(e.target.checked)}
                      className="size-4 rounded border-border accent-primary"
                    />
                    <Label htmlFor="addToStore" className="text-sm cursor-pointer flex-1">
                      Add purchased main-shop items to my store (they will be added to your shop after payment)
                    </Label>
                  </div>
                )}

                {/* Crypto Payment Details */}
                {paymentMethod === 'crypto' && (
                  <div className="mt-6 space-y-6">
                    {loadingCryptoAddresses ? (
                      <div className="flex items-center justify-center py-8">
                        <Icon icon="solar:refresh-circle-linear" className="size-8 animate-spin text-primary" />
                      </div>
                    ) : cryptoAddresses.length === 0 ? (
                      <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
                        <Icon icon="solar:info-circle-bold" className="size-12 mx-auto text-destructive mb-3" />
                        <p className="text-sm text-destructive font-medium">
                          Cryptocurrency payment is currently unavailable. Please select another payment method.
                        </p>
                      </div>
                    ) : (
                      <>
                        {(cryptoInstructions || settings.cryptoPaymentInstructions) && (
                          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
                            <p className="font-medium flex items-center gap-2 mb-1">
                              <Icon icon="solar:info-circle-bold" className="size-4 text-amber-600" />
                              Payment instructions
                            </p>
                            <p className="text-muted-foreground whitespace-pre-wrap">
                              {cryptoInstructions || settings.cryptoPaymentInstructions}
                            </p>
                          </div>
                        )}

                        {/* Select Cryptocurrency */}
                        <div>
                          <Label className="text-base font-semibold mb-3 block">Select Cryptocurrency</Label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {cryptoAddresses.map((addr) => (
                              <button
                                key={addr.id}
                                type="button"
                                onClick={() => {
                                  setCryptoType(addr.currency)
                                  setSelectedCryptoAddress(addr)
                                }}
                                className={`
                                  p-4 rounded-lg border-2 transition-all text-center
                                  ${cryptoType === addr.currency 
                                    ? 'border-primary bg-primary/5 shadow-md' 
                                    : 'border-border hover:border-primary/50'}
                                `}
                              >
                                <Icon 
                                  icon={
                                    addr.currency.includes('USDT') ? 'cryptocurrency:usdt' :
                                    addr.currency === 'BTC' ? 'cryptocurrency:btc' :
                                    addr.currency === 'ETH' ? 'cryptocurrency:eth' :
                                    'solar:wallet-bold'
                                  } 
                                  className="size-8 mx-auto mb-2"
                                />
                                <p className="font-bold text-sm">{addr.currency.replace('_', ' ')}</p>
                                {addr.network && (
                                  <p className="text-xs text-muted-foreground mt-1">{addr.network}</p>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Payment Address Display */}
                        {selectedCryptoAddress && (
                          <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-6 border border-primary/20">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h4 className="font-bold text-lg flex items-center gap-2">
                                  <Icon icon="solar:shield-check-bold" className="size-5 text-primary" />
                                  Send Payment To
                                </h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {selectedCryptoAddress.label || `${selectedCryptoAddress.currency} Wallet`}
                                </p>
                              </div>
                              {selectedCryptoAddress.network && (
                                <span className="px-3 py-1 bg-primary/20 text-primary text-xs font-bold rounded-full">
                                  {selectedCryptoAddress.network}
                                </span>
                              )}
                            </div>

                            {/* QR Code generated from wallet address */}
                            {generatedCryptoQr && (
                              <div className="flex justify-center mb-6">
                                <div className="bg-white p-4 rounded-lg shadow-md">
                                  <img
                                    src={generatedCryptoQr}
                                    alt="Payment QR Code"
                                    className="w-48 h-48 object-contain"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Wallet Address */}
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Wallet Address</Label>
                              <div className="flex gap-2">
                                <div className="flex-1 bg-white rounded-lg p-3 border border-border">
                                  <p className="text-xs md:text-sm font-mono break-all text-foreground">
                                    {selectedCryptoAddress.address}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  variant="default"
                                  size="lg"
                                  onClick={() => copyToClipboard(selectedCryptoAddress.address)}
                                  className="flex-shrink-0"
                                >
                                  <Icon icon="solar:copy-bold" className="size-5" />
                                </Button>
                              </div>
                            </div>

                            {/* Amount to Send */}
                            <div className="mt-6 p-4 bg-white rounded-lg border-2 border-primary/30">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-muted-foreground">Amount to Send</span>
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-primary">${total.toFixed(2)}</p>
                                  <p className="text-xs text-muted-foreground">USD Equivalent</p>
                                </div>
                              </div>
                            </div>

                            {/* Instructions */}
                            <div className="mt-6 space-y-3">
                              <div className="flex items-start gap-3 text-sm">
                                <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <span className="text-xs font-bold text-primary">1</span>
                                </div>
                                <p className="text-muted-foreground">
                                  Copy the wallet address above or scan the QR code
                                </p>
                              </div>
                              <div className="flex items-start gap-3 text-sm">
                                <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <span className="text-xs font-bold text-primary">2</span>
                                </div>
                                <p className="text-muted-foreground">
                                  Send <strong className="text-foreground">${total.toFixed(2)} USD</strong> worth of {selectedCryptoAddress.currency} to the address
                                </p>
                              </div>
                              <div className="flex items-start gap-3 text-sm">
                                <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <span className="text-xs font-bold text-primary">3</span>
                                </div>
                                <p className="text-muted-foreground">
                                  Click "Place Order" below after sending the payment
                                </p>
                              </div>
                              <div className="flex items-start gap-3 text-sm">
                                <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <span className="text-xs font-bold text-primary">4</span>
                                </div>
                                <p className="text-muted-foreground">
                                  Your order will be confirmed by admin once payment is verified (usually within 10-30 minutes)
                                </p>
                              </div>
                            </div>

                            {/* Warning */}
                            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <div className="flex gap-3">
                                <Icon icon="solar:danger-triangle-bold" className="size-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-yellow-800">
                                  <p className="font-semibold mb-1">Important:</p>
                                  <ul className="space-y-1 list-disc list-inside">
                                    <li>Make sure to send the exact amount to avoid delays</li>
                                    <li>Double-check the wallet address before sending</li>
                                    <li>Network fees may apply from your wallet</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {!selectedCryptoAddress && (
                          <div className="p-4 bg-muted rounded-lg text-center">
                            <p className="text-sm text-muted-foreground">
                              <Icon icon="solar:arrow-up-bold" className="inline size-4 mr-1" />
                              Please select a cryptocurrency above to view payment details
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <Button onClick={() => setStep('address')} variant="outline" className="flex-1" size="lg">
                    {t('back')}
                  </Button>
                  <Button onClick={handlePlaceOrder} className="flex-1" size="lg" disabled={isLoading || (paymentMethod === 'balance' && !canPayWithBalance)}>
                    {isLoading ? (
                      <>
                        <Icon icon="solar:refresh-circle-linear" className="mr-2 size-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Icon icon="solar:check-circle-bold" className="mr-2 size-4" />
                        Place Order
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="mt-6 lg:mt-0">
            <div className="bg-card rounded-xl p-6 border border-border/50 sticky top-24">
              <p className="text-sm text-muted-foreground mb-2">
                Payment: <span className="font-medium text-foreground">Store (Admin)</span>
              </p>
              <h3 className="text-lg font-bold mb-4">Order Summary</h3>
              
              {/* Items */}
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="size-16 rounded bg-muted overflow-hidden flex-shrink-0">
                      <Image
                        src={item.image}
                        alt={item.name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      <p className="text-sm font-bold text-primary">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                {/* Coupon */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Coupon code"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    disabled={!!checkoutData.couponCode}
                    className="flex-1"
                  />
                  {checkoutData.couponCode ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        clearCoupon()
                        setCouponInput('')
                      }}
                    >
                      Remove
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" size="sm" onClick={applyCoupon} disabled={couponLoading}>
                      {couponLoading ? '...' : 'Apply'}
                    </Button>
                  )}
                </div>
                {checkoutData.couponCode && (
                  <p className="text-xs text-green-600">
                    Coupon <strong>{checkoutData.couponCode}</strong> applied
                  </p>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('subtotal')}</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('shipping')}</span>
                  <span className={freeShipping ? 'text-green-600' : ''}>
                    {freeShipping ? 'Free' : formatPrice(shipping)}
                  </span>
                </div>
                {settings.taxRate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('tax')} ({settings.taxRate}%)</span>
                    <span>{formatPrice(tax)}</span>
                  </div>
                )}
                <div className="border-t border-border pt-3 flex justify-between font-bold text-lg">
                  <span>{t('total')}</span>
                  <span className="text-primary">{formatPrice(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
