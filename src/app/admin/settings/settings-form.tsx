'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@iconify/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { CRYPTO_CURRENCIES } from '@/lib/crypto-currencies'

interface SettingsFormProps {
  initialSettings: Record<string, string>
  secretsSet?: Record<string, boolean>
}

export function SettingsForm({ initialSettings, secretsSet = {} }: SettingsFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [settings, setSettings] = useState(initialSettings)

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (!res.ok) {
        throw new Error('Failed to save settings')
      }

      toast.success('Settings saved successfully')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  const handleTestEmail = async () => {
    try {
      setTestingEmail(true)
      // Save first so the latest SMTP config is used for the test.
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const res = await fetch('/api/admin/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send test email')
      toast.success(`Test email sent to ${data.to}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send test email')
    } finally {
      setTestingEmail(false)
    }
  }

  return (
    <Tabs defaultValue="general" className="space-y-6">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="payments">Payments</TabsTrigger>
        <TabsTrigger value="shipping">Shipping</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
        <TabsTrigger value="features">Features</TabsTrigger>
      </TabsList>

      {/* General Settings */}
      <TabsContent value="general">
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>Basic store configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="site_name">Site Name</Label>
              <Input
                id="site_name"
                value={settings.site_name || ''}
                onChange={(e) => updateSetting('site_name', e.target.value)}
                placeholder="ZALORA"
              />
              <p className="text-xs text-muted-foreground">
                This will appear in the browser tab and throughout the site
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo_url">Logo URL</Label>
              <Input
                id="logo_url"
                value={settings.logo_url || ''}
                onChange={(e) => updateSetting('logo_url', e.target.value)}
                placeholder="/images/logo.png"
              />
              <p className="text-xs text-muted-foreground">
                Path to logo image (e.g., /images/logo.png or full URL)
              </p>
              {settings.logo_url && (
                <div className="mt-2 p-4 border border-border rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-2">Logo Preview:</p>
                  <img
                    src={settings.logo_url}
                    alt="Logo"
                    className="h-12 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="site_description">Site Description</Label>
              <Input
                id="site_description"
                value={settings.site_description || ''}
                onChange={(e) => updateSetting('site_description', e.target.value)}
                placeholder="Premium Fashion & Lifestyle Store"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                value={settings.currency || 'USD'}
                onChange={(e) => updateSetting('currency', e.target.value)}
                placeholder="USD"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Maintenance Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Enable to show maintenance page to visitors
                </p>
              </div>
              <Switch
                checked={settings.maintenance_mode === 'true'}
                onCheckedChange={(checked) =>
                  updateSetting('maintenance_mode', checked.toString())
                }
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Payment Settings — crypto-first */}
      <TabsContent value="payments">
        <Card>
          <CardHeader>
            <CardTitle>Cryptocurrency Payments</CardTitle>
            <CardDescription>
              Primary payment method. Enable coins here, then add wallet addresses under{' '}
              <Link href="/admin/crypto-addresses" className="text-primary hover:underline">
                Crypto Addresses
              </Link>
              . Only enabled coins with an active wallet appear at checkout.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Icon icon="cryptocurrency:usdt" className="size-4" />
                  Accept Crypto Payments
                </Label>
                <p className="text-xs text-muted-foreground">
                  Master switch for all cryptocurrency checkout options
                </p>
              </div>
              <Switch
                checked={settings.crypto_enabled !== 'false'}
                onCheckedChange={(checked) =>
                  updateSetting('crypto_enabled', checked.toString())
                }
              />
            </div>

            {settings.crypto_enabled !== 'false' && (
              <>
                <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                  <p className="text-sm font-medium">Accepted cryptocurrencies</p>
                  {CRYPTO_CURRENCIES.map((coin) => (
                    <div key={coin.code} className="flex items-center justify-between">
                      <Label className="font-normal">{coin.label}</Label>
                      <Switch
                        checked={settings[coin.settingKey] !== 'false'}
                        onCheckedChange={(checked) =>
                          updateSetting(coin.settingKey, checked.toString())
                        }
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="crypto_payment_instructions">Payment instructions</Label>
                  <Textarea
                    id="crypto_payment_instructions"
                    value={settings.crypto_payment_instructions || ''}
                    onChange={(e) =>
                      updateSetting('crypto_payment_instructions', e.target.value)
                    }
                    placeholder="e.g. Send the exact order total. Include your order number in the memo. Payments are confirmed within 1 hour."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Shown to customers on the crypto payment step at checkout
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="crypto_payment_timeout_hours">
                    Unpaid order expiry (hours)
                  </Label>
                  <Input
                    id="crypto_payment_timeout_hours"
                    type="number"
                    min="0"
                    value={settings.crypto_payment_timeout_hours ?? '24'}
                    onChange={(e) =>
                      updateSetting('crypto_payment_timeout_hours', e.target.value)
                    }
                    placeholder="24"
                  />
                  <p className="text-xs text-muted-foreground">
                    How long customers have to complete crypto payment before the order expires. Set 0 to disable auto-expiry.
                  </p>
                </div>

                <Link href="/admin/crypto-addresses">
                  <Button variant="outline" type="button" className="w-full sm:w-auto">
                    <Icon icon="solar:wallet-bold" className="mr-2 size-4" />
                    Manage Wallet Addresses
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Other Payment Methods</CardTitle>
            <CardDescription>
              Optional — disable these if you only accept cryptocurrency
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Icon icon="solar:wallet-bold" className="size-4" />
                  Account / Shop Balance
                </Label>
                <p className="text-xs text-muted-foreground">
                  Let users pay with their in-app wallet balance
                </p>
              </div>
              <Switch
                checked={settings.balance_enabled !== 'false'}
                onCheckedChange={(checked) =>
                  updateSetting('balance_enabled', checked.toString())
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Icon icon="solar:money-bag-bold" className="size-4" />
                  Cash on Delivery
                </Label>
                <p className="text-xs text-muted-foreground">Accept payment on delivery</p>
              </div>
              <Switch
                checked={settings.cod_enabled === 'true'}
                onCheckedChange={(checked) =>
                  updateSetting('cod_enabled', checked.toString())
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Icon icon="solar:bank-bold" className="size-4" />
                  Bank Transfer
                </Label>
                <p className="text-xs text-muted-foreground">Accept direct bank transfers</p>
              </div>
              <Switch
                checked={settings.bank_transfer_enabled === 'true'}
                onCheckedChange={(checked) =>
                  updateSetting('bank_transfer_enabled', checked.toString())
                }
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Shipping Settings */}
      <TabsContent value="shipping">
        <Card>
          <CardHeader>
            <CardTitle>Shipping & Tax Settings</CardTitle>
            <CardDescription>Configure shipping fees and tax rates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shipping_fee">Default Shipping Fee ($)</Label>
              <Input
                id="shipping_fee"
                type="number"
                value={settings.shipping_fee || '5'}
                onChange={(e) => updateSetting('shipping_fee', e.target.value)}
                placeholder="5.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="free_shipping">Free Shipping Threshold ($)</Label>
              <Input
                id="free_shipping"
                type="number"
                value={settings.free_shipping_threshold || '50'}
                onChange={(e) => updateSetting('free_shipping_threshold', e.target.value)}
                placeholder="50.00"
              />
              <p className="text-xs text-muted-foreground">
                Orders above this amount get free shipping. Set to 0 to disable.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax_rate">Tax Rate (%)</Label>
              <Input
                id="tax_rate"
                type="number"
                value={settings.tax_rate || '0'}
                onChange={(e) => updateSetting('tax_rate', e.target.value)}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Tax percentage applied to all orders. Set to 0 to disable.
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Notifications / Email Settings */}
      <TabsContent value="notifications">
        <Card>
          <CardHeader>
            <CardTitle>Email & Notifications</CardTitle>
            <CardDescription>
              Configure the SMTP server used for transactional emails (order confirmations,
              password resets, etc.) and choose which emails are sent.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Master toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Icon icon="solar:letter-bold" className="size-4" />
                  Transactional Emails
                </Label>
                <p className="text-xs text-muted-foreground">
                  Master switch. When off, no emails are sent regardless of the toggles below.
                </p>
              </div>
              <Switch
                checked={settings.email_enabled !== 'false'}
                onCheckedChange={(checked) =>
                  updateSetting('email_enabled', checked.toString())
                }
              />
            </div>

            {/* SMTP config */}
            <div className="space-y-4 pt-2 border-t border-border">
              <p className="text-sm font-medium">SMTP Server</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_host">Host</Label>
                  <Input
                    id="smtp_host"
                    value={settings.smtp_host || ''}
                    onChange={(e) => updateSetting('smtp_host', e.target.value)}
                    placeholder="smtp.hostinger.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_port">Port</Label>
                  <Input
                    id="smtp_port"
                    type="number"
                    value={settings.smtp_port || '465'}
                    onChange={(e) => updateSetting('smtp_port', e.target.value)}
                    placeholder="465"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_user">Username (mailbox)</Label>
                  <Input
                    id="smtp_user"
                    value={settings.smtp_user || ''}
                    onChange={(e) => updateSetting('smtp_user', e.target.value)}
                    placeholder="no-reply@zalora.sbs"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_password">Password</Label>
                  <Input
                    id="smtp_password"
                    type="password"
                    value={settings.smtp_password || ''}
                    onChange={(e) => updateSetting('smtp_password', e.target.value)}
                    placeholder={secretsSet.smtp_password ? '•••••••• (leave blank to keep)' : 'Mailbox password'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_from">From Address</Label>
                  <Input
                    id="smtp_from"
                    value={settings.smtp_from || ''}
                    onChange={(e) => updateSetting('smtp_from', e.target.value)}
                    placeholder="ZALORA <no-reply@zalora.sbs>"
                  />
                </div>
                <div className="flex items-center justify-between sm:pt-6">
                  <div className="space-y-0.5">
                    <Label>Use SSL/TLS</Label>
                    <p className="text-xs text-muted-foreground">On for port 465</p>
                  </div>
                  <Switch
                    checked={settings.smtp_secure != null && settings.smtp_secure !== '' ? settings.smtp_secure === 'true' : (settings.smtp_port || '465') === '465'}
                    onCheckedChange={(checked) =>
                      updateSetting('smtp_secure', checked.toString())
                    }
                  />
                </div>
              </div>
              <Button variant="outline" onClick={handleTestEmail} loading={testingEmail}>
                <Icon icon="solar:test-tube-bold" className="mr-2 size-4" />
                Send Test Email
              </Button>
            </div>

            {/* Per-event toggles */}
            <div className="space-y-4 pt-4 border-t border-border">
              <p className="text-sm font-medium">Which emails to send</p>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Order Confirmation</Label>
                  <p className="text-xs text-muted-foreground">
                    Email buyers a receipt when an order is placed
                  </p>
                </div>
                <Switch
                  checked={settings.email_order_confirmation !== 'false'}
                  onCheckedChange={(checked) =>
                    updateSetting('email_order_confirmation', checked.toString())
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Welcome Email</Label>
                  <p className="text-xs text-muted-foreground">
                    Greet new users after they register
                  </p>
                </div>
                <Switch
                  checked={settings.email_welcome === 'true'}
                  onCheckedChange={(checked) =>
                    updateSetting('email_welcome', checked.toString())
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Promotional Emails</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow sending marketing/promo campaigns (respects each user's opt-in)
                  </p>
                </div>
                <Switch
                  checked={settings.email_promotions === 'true'}
                  onCheckedChange={(checked) =>
                    updateSetting('email_promotions', checked.toString())
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Feature Toggles */}
      <TabsContent value="features">
        <Card>
          <CardHeader>
            <CardTitle>Feature Settings</CardTitle>
            <CardDescription>Enable or disable platform features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Icon icon="solar:shop-bold" className="size-4" />
                  User Selling
                </Label>
                <p className="text-xs text-muted-foreground">
                  Allow users to become sellers and create shops
                </p>
              </div>
              <Switch
                checked={settings.user_selling_enabled === 'true'}
                onCheckedChange={(checked) =>
                  updateSetting('user_selling_enabled', checked.toString())
                }
              />
            </div>
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="space-y-1">
                <Label className="flex items-center gap-2">
                  <Icon icon="solar:upload-bold" className="size-4" />
                  Shop levels that can upload own products
                </Label>
                <p className="text-xs text-muted-foreground">
                  Only selected levels can add their own products; others can only add products from the main shop catalog. Uses same levels as Shop Details edit (Bronze, Silver, Gold, Platinum). Leave all unchecked to disable own product upload.
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                {[
                  { value: 'BRONZE', label: 'Bronze' },
                  { value: 'SILVER', label: 'Silver' },
                  { value: 'GOLD', label: 'Gold' },
                  { value: 'PLATINUM', label: 'Platinum' },
                ].map(({ value, label }) => {
                  const current = (settings.levels_can_upload_own_products || '').split(',').map((s: string) => s.trim()).filter(Boolean)
                  const checked = current.includes(value)
                  return (
                    <div key={value} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`level_${value}`}
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...current, value]
                            : current.filter((l) => l !== value)
                          updateSetting('levels_can_upload_own_products', next.join(','))
                        }}
                        className="size-4 rounded border-border accent-primary"
                      />
                      <Label htmlFor={`level_${value}`} className="text-sm font-normal cursor-pointer">
                        {label}
                      </Label>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} loading={loading} size="lg">
          <Icon icon="solar:diskette-bold" className="mr-2 size-4" />
          Save Settings
        </Button>
      </div>
    </Tabs>
  )
}
