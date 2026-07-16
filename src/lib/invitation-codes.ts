import { supabaseAdmin } from '@/lib/supabase'

export type InvitationCodeType = 'DIRECT' | 'REFERRAL'

export interface InvitationCodeRow {
  id: string
  code: string
  type: InvitationCodeType
  createdById: string | null
  referrerUserId: string | null
  usedByUserId: string | null
  usedAt: string | null
  note: string | null
  createdAt: string
}

function randomDigits(length: number): string {
  let out = ''
  for (let i = 0; i < length; i++) {
    out += Math.floor(Math.random() * 10).toString()
  }
  // Avoid leading zero looking like a short code for DIRECT
  if (length === 6 && out[0] === '0') {
    out = String(1 + Math.floor(Math.random() * 9)) + out.slice(1)
  }
  return out
}

/** DIRECT = 6 digits (e.g. 483920). REFERRAL = R + 5 digits (6 chars, e.g. R48392). */
export function generateInvitationCodeValue(type: InvitationCodeType): string {
  if (type === 'REFERRAL') {
    return `R${randomDigits(5)}`
  }
  return randomDigits(6)
}

export function normalizeInvitationCode(input: string): string {
  return String(input || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
}

export function isValidInvitationCodeFormat(code: string): boolean {
  const c = normalizeInvitationCode(code)
  if (/^\d{6}$/.test(c)) return true
  if (/^R\d{5}$/.test(c)) return true
  return false
}

export async function createInvitationCode(opts: {
  type: InvitationCodeType
  createdById: string
  referrerUserId?: string | null
  note?: string | null
}): Promise<InvitationCodeRow> {
  if (opts.type === 'REFERRAL' && !opts.referrerUserId) {
    throw new Error('Referrer user is required for referral codes')
  }

  // Retry a few times on unique collision
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateInvitationCodeValue(opts.type)
    const { data, error } = await supabaseAdmin
      .from('invitation_codes')
      .insert({
        code,
        type: opts.type,
        createdById: opts.createdById,
        referrerUserId: opts.type === 'REFERRAL' ? opts.referrerUserId : null,
        note: opts.note?.trim() || null,
      })
      .select('*')
      .single()

    if (!error && data) return data as InvitationCodeRow
    if (error && error.code !== '23505') throw error
  }
  throw new Error('Failed to generate a unique invitation code')
}

/**
 * Atomically consume a valid unused code for the newly registered user.
 * Returns referrerUserId when the code was a REFERRAL.
 */
export async function consumeInvitationCode(
  rawCode: string,
  newUserId: string
): Promise<{ type: InvitationCodeType; referrerUserId: string | null; code: string }> {
  const code = normalizeInvitationCode(rawCode)
  if (!isValidInvitationCodeFormat(code)) {
    throw new Error('Invalid invitation code format')
  }

  // Load first to give clear errors
  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('invitation_codes')
    .select('*')
    .eq('code', code)
    .maybeSingle()

  if (fetchErr) throw fetchErr
  if (!existing) {
    throw new Error('Invalid invitation code')
  }
  if (existing.usedByUserId) {
    throw new Error('This invitation code has already been used')
  }

  const expectedType: InvitationCodeType = code.startsWith('R') ? 'REFERRAL' : 'DIRECT'
  if (existing.type !== expectedType) {
    throw new Error('Invalid invitation code')
  }

  const now = new Date().toISOString()
  const { data: updated, error: updErr } = await supabaseAdmin
    .from('invitation_codes')
    .update({ usedByUserId: newUserId, usedAt: now })
    .eq('id', existing.id)
    .is('usedByUserId', null)
    .select('*')
    .maybeSingle()

  if (updErr) throw updErr
  if (!updated) {
    throw new Error('This invitation code has already been used')
  }

  return {
    type: updated.type as InvitationCodeType,
    referrerUserId: (updated.referrerUserId as string) || null,
    code: updated.code as string,
  }
}

export async function applyInvitationCodeToUser(
  userId: string,
  rawCode: string
): Promise<{ referrerUserId: string | null; code: string }> {
  const consumed = await consumeInvitationCode(rawCode, userId)
  const patch: Record<string, string | null> = {
    invitationCodeUsed: consumed.code,
    referredByUserId: consumed.referrerUserId,
  }
  const { error } = await supabaseAdmin.from('users').update(patch).eq('id', userId)
  if (error) {
    console.warn('[invitation-codes] Could not store referral fields on user:', error.message)
  }
  return { referrerUserId: consumed.referrerUserId, code: consumed.code }
}

export async function assertInvitationCodeAvailable(rawCode: string): Promise<void> {
  const code = normalizeInvitationCode(rawCode)
  if (!isValidInvitationCodeFormat(code)) {
    throw new Error('Invitation code must be 6 digits, or R followed by 5 digits (referral)')
  }
  const { data, error } = await supabaseAdmin
    .from('invitation_codes')
    .select('id, usedByUserId, type')
    .eq('code', code)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Invalid invitation code')
  if (data.usedByUserId) throw new Error('This invitation code has already been used')
}
