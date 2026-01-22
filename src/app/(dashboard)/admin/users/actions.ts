'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleUserStatus(userId: string, isActive: boolean) {
  const supabase = await createClient()
  
  await supabase.from('profiles').update({
    is_active: isActive
  }).eq('id', userId)

  revalidatePath('/admin/users')
}

export async function updateUserRole(userId: string, role: 'admin' | 'csr') {
  const supabase = await createClient()
  
  await supabase.from('profiles').update({
    role: role
  }).eq('id', userId)

  revalidatePath('/admin/users')
  revalidatePath(`/admin/users/${userId}`)
}
