'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function startBreakWithNotes(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const sessionId = formData.get('sessionId') as string
  const breakType = formData.get('breakType') as string
  const notes = formData.get('notes') as string

  await supabase.from('break_entries').insert({
    session_id: sessionId,
    break_type: breakType,
    notes: notes || null,
    start_at: new Date().toISOString()
  })

  revalidatePath('/app')
}
