import nodemailer, { type Transporter } from 'nodemailer'
import { getEmailConfig, type EmailConfig } from './settings'

/**
 * Transactional email helper.
 *
 * Configuration comes from the admin settings (/admin/settings → Notifications),
 * with environment variables as a fallback (see getEmailConfig). This module is
 * a no-op until SMTP credentials + the master toggle are provided. It NEVER
 * throws — callers can safely `await sendEmail(...)` without a try/catch.
 */

function buildTransporter(config: EmailConfig): Transporter | null {
  if (!config.enabled || !config.host || !config.user || !config.password) {
    return null
  }
  try {
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.password },
    })
  } catch (err) {
    console.error('[email] Failed to create SMTP transport:', err)
    return null
  }
}

export async function isEmailConfigured(): Promise<boolean> {
  const config = await getEmailConfig()
  return buildTransporter(config) !== null
}

export interface SendEmailParams {
  to: string
  subject: string
  html: string
  text?: string
}

/**
 * Send an email. Returns true if it was sent, false if skipped/failed.
 * Never throws.
 */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  let config: EmailConfig
  try {
    config = await getEmailConfig()
  } catch {
    return false
  }

  const transporter = buildTransporter(config)
  if (!transporter) {
    // Email not configured/disabled — silently skip so the app keeps working.
    return false
  }

  try {
    await transporter.sendMail({
      from: config.from || config.user,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    })
    return true
  } catch (err) {
    console.error('[email] Failed to send email:', err)
    return false
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function emailLayout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
    <div style="max-width:560px;margin:0 auto;padding:24px;">
      <div style="text-align:center;padding:16px 0;">
        <span style="font-size:22px;font-weight:800;letter-spacing:2px;color:#111;">ZALORA</span>
      </div>
      <div style="background:#ffffff;border-radius:12px;padding:28px;border:1px solid #e4e4e7;">
        <h1 style="margin:0 0 16px;font-size:20px;">${escapeHtml(title)}</h1>
        ${bodyHtml}
      </div>
      <p style="text-align:center;color:#a1a1aa;font-size:12px;margin-top:24px;">
        This is an automated message from ZALORA. Please do not reply.
      </p>
    </div>
  </body>
</html>`
}

export interface OrderConfirmationParams {
  to: string
  customerName?: string | null
  orderNumber: string
  orderId: string
  total: number
  currencySymbol?: string
  items: Array<{ name: string; quantity: number; price: number }>
  appUrl?: string
}

export async function sendOrderConfirmationEmail(
  params: OrderConfirmationParams
): Promise<boolean> {
  if (!params.to) return false

  const symbol = params.currencySymbol || '$'
  const appUrl = params.appUrl || process.env.NEXT_PUBLIC_APP_URL || ''
  const money = (n: number) => `${symbol}${Number(n || 0).toFixed(2)}`

  const rows = params.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f4f4f5;">
          ${escapeHtml(item.name)} <span style="color:#71717a;">× ${item.quantity}</span>
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #f4f4f5;text-align:right;white-space:nowrap;">
          ${money(item.price * item.quantity)}
        </td>
      </tr>`
    )
    .join('')

  const orderLink = appUrl ? `${appUrl}/account/orders/${params.orderId}` : ''

  const body = `
    <p style="margin:0 0 16px;">Hi ${escapeHtml(params.customerName || 'there')},</p>
    <p style="margin:0 0 20px;">
      Thanks for your order! We've received order
      <strong>#${escapeHtml(params.orderNumber)}</strong> and it's being processed.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      ${rows}
      <tr>
        <td style="padding:12px 0 0;font-weight:700;">Total</td>
        <td style="padding:12px 0 0;text-align:right;font-weight:700;">${money(params.total)}</td>
      </tr>
    </table>
    ${
      orderLink
        ? `<div style="text-align:center;margin-top:24px;">
             <a href="${orderLink}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">
               View your order
             </a>
           </div>`
        : ''
    }
  `

  return sendEmail({
    to: params.to,
    subject: `Order confirmed — #${params.orderNumber}`,
    html: emailLayout('Order Confirmed', body),
    text: `Thanks for your order #${params.orderNumber}. Total: ${money(params.total)}.`,
  })
}

/**
 * Send a test email to verify SMTP configuration.
 * Returns true if sent, false if email is not configured/failed.
 */
export async function sendTestEmail(to: string): Promise<boolean> {
  if (!to) return false
  const body = `
    <p style="margin:0 0 16px;">This is a test email from your ZALORA admin panel.</p>
    <p style="margin:0;color:#71717a;">If you received this, your SMTP settings are working correctly.</p>
  `
  return sendEmail({
    to,
    subject: 'ZALORA — SMTP test email',
    html: emailLayout('Test Email', body),
    text: 'This is a test email from your ZALORA admin panel. SMTP is working.',
  })
}
