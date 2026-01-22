import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Clock, History, User, LogOut } from 'lucide-react'
import { logout } from '@/app/(auth)/actions'

export default async function CSRLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is admin and redirect to admin dashboard
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'admin') {
    redirect('/admin')
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Main Content */}
      <main className="flex-1 pb-16 md:pb-0 overflow-y-auto">
        <header className="h-16 border-b flex items-center px-4 justify-between bg-card sticky top-0 z-10">
           <h1 className="text-lg font-bold">CSR Tracker</h1>
           <form action={logout}>
             <button className="p-2 text-muted-foreground hover:text-destructive transition-colors">
               <LogOut size={20} />
             </button>
           </form>
        </header>
        <div className="p-4 md:p-8 max-w-2xl mx-auto">
          {children}
        </div>
      </main>

      {/* Bottom Nav for Mobile */}
      <nav className="h-16 border-t bg-card fixed bottom-0 left-0 right-0 flex items-center justify-around md:hidden">
        <Link href="/app" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
          <Clock size={20} />
          <span className="text-[10px] font-medium">Today</span>
        </Link>
        <Link href="/app/logs" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
          <History size={20} />
          <span className="text-[10px] font-medium">History</span>
        </Link>
        <Link href="/app/profile" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
          <User size={20} />
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
      </nav>
    </div>
  )
}
