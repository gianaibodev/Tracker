import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Index() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch profile to determine role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .single()

  if (profile?.role === 'admin') {
    redirect('/admin')
  } else {
    redirect('/app')
  }
}
