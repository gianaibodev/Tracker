import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Users, Settings, LogOut } from 'lucide-react'
import { logout } from '@/app/(auth)/actions'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .single()

  if (profile?.role !== 'admin') {
    redirect('/app')
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card hidden md:flex flex-col">
        <div className="p-6">
          <h2 className="text-xl font-bold">Admin Panel</h2>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <Link
            href="/admin"
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent text-sm font-medium transition-colors"
          >
            <LayoutDashboard size={18} />
            Overview
          </Link>
          <Link
            href="/admin/users"
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent text-sm font-medium transition-colors"
          >
            <Users size={18} />
            Representatives
          </Link>
          <Link
            href="/admin/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent text-sm font-medium transition-colors"
          >
            <Settings size={18} />
            Settings
          </Link>
        </nav>
        <div className="p-4 border-t">
          <form action={logout}>
            <button className="flex items-center gap-3 px-3 py-2 w-full text-sm font-medium text-destructive hover:bg-destructive/10 rounded-md transition-colors">
              <LogOut size={18} />
              Logout
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 border-b flex items-center px-6 md:px-8 justify-between bg-card">
           <h1 className="text-lg font-semibold md:hidden">Admin Panel</h1>
           <nav className="md:hidden flex gap-2">
              <Link href="/admin" className="px-3 py-1 text-sm font-medium rounded-md hover:bg-accent">Overview</Link>
              <Link href="/admin/users" className="px-3 py-1 text-sm font-medium rounded-md hover:bg-accent">Users</Link>
              <Link href="/admin/settings" className="px-3 py-1 text-sm font-medium rounded-md hover:bg-accent">Settings</Link>
           </nav>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
