'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function clockIn() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('work_sessions').insert({
    user_id: user.id,
    session_status: 'open',
    clock_in_at: new Date().toISOString()
  })

  revalidatePath('/app')
}

export async function clockOut(sessionId: string) {
  const supabase = await createClient()
  await supabase.from('work_sessions').update({
    session_status: 'closed',
    clock_out_at: new Date().toISOString()
  }).eq('id', sessionId)

  revalidatePath('/app')
}

export async function startBreak(sessionId: string, breakType: string) {
  const supabase = await createClient()
  await supabase.from('break_entries').insert({
    session_id: sessionId,
    break_type: breakType,
    start_at: new Date().toISOString()
  })

  revalidatePath('/app')
}

export async function endBreak(breakId: string) {
  const supabase = await createClient()
  await supabase.from('break_entries').update({
    end_at: new Date().toISOString()
  }).eq('id', breakId)

  revalidatePath('/app')
}

export async function logCall(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const sessionId = formData.get('sessionId') as string
  const status = formData.get('status') as string
  const outcome = formData.get('outcome') as string
  const notes = formData.get('notes') as string

  await supabase.from('call_entries').insert({
    user_id: user.id,
    session_id: sessionId,
    call_status: status,
    call_outcome: outcome,
    notes: notes,
    occurred_at: new Date().toISOString()
  })

  revalidatePath('/app')
}

export async function logDeposit(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const sessionId = formData.get('sessionId') as string
  const amount = parseFloat(formData.get('amount') as string)
  const reference = formData.get('reference') as string
  const notes = formData.get('notes') as string

  await supabase.from('deposit_entries').insert({
    user_id: user.id,
    session_id: sessionId,
    amount,
    reference,
    notes,
    occurred_at: new Date().toISOString()
  })

  revalidatePath('/app')
}
