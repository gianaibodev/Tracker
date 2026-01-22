import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  'use server'

  const username = formData.get('username') as string
  const password = formData.get('password') as string
  const supabase = await createClient()

  // 1. Try to sign in directly using the internal email convention
  const email = `${username}@internal.app`

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  // 2. If Auth fails, it's definitely a wrong username or password
  if (authError) {
    redirect('/login?error=' + encodeURIComponent('Invalid username or password'))
  }

  // 3. Auth succeeded, now fetch the profile to see their role
  // We use the authenticated ID we just got
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .single()

  if (profile?.role === 'admin') {
    redirect('/admin')
  } else {
    redirect('/app')
  }
}

export async function signup(formData: FormData) {
  'use server'

  const username = formData.get('username') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const supabase = await createClient()

  // Use dummy email for Supabase Auth compatibility
  const email = `${username}@internal.app`

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        username: username,
        role: 'csr',
      },
    },
  })

  if (error) {
    redirect('/register?error=' + encodeURIComponent(error.message))
  }

  redirect('/app')
}

export async function logout() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
