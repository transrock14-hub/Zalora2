import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

/**
 * DELETE: Hide a message from the admin view only.
 * The customer still sees the message on their side.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; messageId: string } }
) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ticketId = params.id
    const messageId = params.messageId
    if (!ticketId || !messageId) {
      return NextResponse.json({ error: 'Ticket and message id are required' }, { status: 400 })
    }

    if (messageId.startsWith('temp-')) {
      return NextResponse.json({ error: 'Message is still sending' }, { status: 400 })
    }

    const { data: message, error: findError } = await supabaseAdmin
      .from('ticket_messages')
      .select('id, ticketId, hiddenFromAdmin')
      .eq('id', messageId)
      .eq('ticketId', ticketId)
      .maybeSingle()

    if (findError) {
      if (
        (findError as { code?: string }).code === 'PGRST204' ||
        findError.message?.includes('hiddenFromAdmin')
      ) {
        return NextResponse.json(
          {
            error:
              'hiddenFromAdmin column is missing. Run supabase-support-message-admin-hide-migration.sql in Supabase SQL Editor.',
          },
          { status: 503 }
        )
      }
      console.error('Error finding message to hide:', findError)
      return NextResponse.json({ error: 'Failed to hide message' }, { status: 500 })
    }
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    if ((message as { hiddenFromAdmin?: boolean }).hiddenFromAdmin) {
      return NextResponse.json({ success: true, hiddenFromAdmin: true })
    }

    const { error: updateError } = await supabaseAdmin
      .from('ticket_messages')
      .update({ hiddenFromAdmin: true })
      .eq('id', messageId)
      .eq('ticketId', ticketId)

    if (updateError) {
      if (
        (updateError as { code?: string }).code === 'PGRST204' ||
        updateError.message?.includes('hiddenFromAdmin')
      ) {
        return NextResponse.json(
          {
            error:
              'hiddenFromAdmin column is missing. Run supabase-support-message-admin-hide-migration.sql in Supabase SQL Editor.',
          },
          { status: 503 }
        )
      }
      console.error('Error hiding message from admin:', updateError)
      return NextResponse.json({ error: 'Failed to hide message' }, { status: 500 })
    }

    await supabaseAdmin
      .from('support_tickets')
      .update({ updatedAt: new Date().toISOString() })
      .eq('id', ticketId)

    return NextResponse.json({
      success: true,
      hiddenFromAdmin: true,
      message: 'Message hidden from admin view; customer can still see it',
    })
  } catch (error) {
    console.error('DELETE /api/admin/support/[id]/messages/[messageId]', error)
    return NextResponse.json({ error: 'Failed to hide message' }, { status: 500 })
  }
}
