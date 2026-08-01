import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

/**
 * DELETE: Admin removes a single message from a support chat.
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

    // Ignore optimistic temp ids from the client
    if (messageId.startsWith('temp-')) {
      return NextResponse.json({ error: 'Message is still sending' }, { status: 400 })
    }

    const { data: message, error: findError } = await supabaseAdmin
      .from('ticket_messages')
      .select('id, ticketId')
      .eq('id', messageId)
      .eq('ticketId', ticketId)
      .maybeSingle()

    if (findError) {
      console.error('Error finding message to delete:', findError)
      return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 })
    }
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    const { error: deleteError } = await supabaseAdmin
      .from('ticket_messages')
      .delete()
      .eq('id', messageId)
      .eq('ticketId', ticketId)

    if (deleteError) {
      console.error('Error deleting message:', deleteError)
      return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 })
    }

    await supabaseAdmin
      .from('support_tickets')
      .update({ updatedAt: new Date().toISOString() })
      .eq('id', ticketId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/admin/support/[id]/messages/[messageId]', error)
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 })
  }
}
