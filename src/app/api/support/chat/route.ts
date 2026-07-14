import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { notifyAdmins } from '@/lib/notifications'

// Simple AI FAQ responses for the chat widget
const faqResponses: Record<string, string> = {
  'track my order': 'To track your order, please go to Account > Orders and click on your order to see the tracking details. You can also use the tracking number sent to your email.',
  'track order': 'To track your order, please go to Account > Orders and click on your order to see the tracking details. You can also use the tracking number sent to your email.',
  'payment help': 'We accept crypto payments (USDT, BTC, ETH) and Cash on Delivery. For crypto payments, scan the QR code or copy the wallet address at checkout. Payments are confirmed within 10-30 minutes.',
  'payment': 'We accept crypto payments (USDT, BTC, ETH) and Cash on Delivery. For crypto payments, scan the QR code or copy the wallet address at checkout. Payments are confirmed within 10-30 minutes.',
  'refund policy': 'We offer a 30-day return policy for most items. Items must be unused and in original packaging. Refunds are processed within 5-7 business days after we receive the return.',
  'refund': 'We offer a 30-day return policy for most items. Items must be unused and in original packaging. Refunds are processed within 5-7 business days after we receive the return.',
  'return': 'We offer a 30-day return policy for most items. Items must be unused and in original packaging. Refunds are processed within 5-7 business days after we receive the return.',
  'shipping info': 'Standard shipping takes 3-7 business days. Express shipping (2-3 days) is available for an additional fee. Free shipping on orders over $50.',
  'shipping': 'Standard shipping takes 3-7 business days. Express shipping (2-3 days) is available for an additional fee. Free shipping on orders over $50.',
  'delivery': 'Standard shipping takes 3-7 business days. Express shipping (2-3 days) is available for an additional fee. Free shipping on orders over $50.',
  'crypto': 'We accept USDT (TRC20/ERC20), Bitcoin, and Ethereum. At checkout, select crypto payment and scan the QR code or copy the wallet address. Your payment will be confirmed within 10-30 minutes.',
  'bitcoin': 'We accept Bitcoin payments! At checkout, select Bitcoin as payment method and scan the QR code or copy the wallet address. Your payment will be confirmed within 10-30 minutes.',
  'usdt': 'We accept USDT on both TRC20 and ERC20 networks! At checkout, select USDT and choose your preferred network. Then scan the QR code or copy the wallet address.',
  'account': 'To manage your account, go to the Account section from the menu. There you can update your profile, view orders, manage addresses, and access support.',
  'cancel order': 'To cancel an order, go to Account > Orders and find your order. If it\'s still pending, you can cancel it. If it\'s already shipped, you\'ll need to request a return.',
}

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json()

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const lowerMessage = message.toLowerCase()

    // Find matching FAQ response
    let response = null
    for (const [key, value] of Object.entries(faqResponses)) {
      if (lowerMessage.includes(key)) {
        response = value
        break
      }
    }

    // Default response if no match found - create support ticket so message shows in admin and user
    let ticketNumber: string | null = null
    let ticketId: string | null = null
    if (!response) {
      response = "I'm sorry, I don't have specific information about that. Would you like to speak with a human assistant?"
      try {
        const session = await getSession()
        const userId = session?.userId ?? null
        let userEmail: string | undefined = session?.email
        if (userId && !userEmail) {
          const { data: user } = await supabaseAdmin.from('users').select('email').eq('id', userId).single()
          userEmail = user?.email ?? undefined
        }
        // Create ticket for logged-in users (or we could allow guest with email later)
        if (userId || userEmail) {
          const ticketNum = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
          const { data: ticket, error: ticketError } = await supabaseAdmin
            .from('support_tickets')
            .insert({
              ticketNumber: ticketNum,
              userId: userId ?? null,
              subject: 'Live chat: ' + (message.length > 50 ? message.substring(0, 50) + '...' : message),
              priority: 'MEDIUM',
              status: 'OPEN',
            })
            .select('id')
            .single()

          if (ticketError) {
            console.error('Failed to create support ticket from chat:', ticketError)
          } else if (ticket?.id) {
            const msgPayload: { ticketId: string; message: string; senderEmail: string; isFromAdmin: boolean; senderId?: string } = {
              ticketId: ticket.id,
              message,
              senderEmail: userEmail ?? 'guest',
              isFromAdmin: false,
            }
            if (userId) msgPayload.senderId = userId

            const { error: msgError } = await supabaseAdmin.from('ticket_messages').insert(msgPayload)
            if (msgError) {
              console.error('Failed to insert ticket message from chat:', msgError)
            }
            await notifyAdmins({
              title: 'New chat message for support',
              message: `Customer message: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`,
              type: 'support',
              link: `/admin/support/${ticket.id}`,
            })
            ticketNumber = ticketNum
            ticketId = ticket.id
          }
        }
      } catch (err) {
        console.error('Failed to create ticket from chat:', err)
      }
    }

    return NextResponse.json({
      response,
      needsEscalation: !response || response.includes('human assistant'),
      ticketNumber,
      ticketId,
    })
  } catch (error) {
    console.error('Error processing chat message:', error)
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    )
  }
}
