import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/(auth)/actions'
import { User, Shield, LogOut, Info } from 'lucide-react'

export default async function CSRProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id)
    .single()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Your Profile</h2>
        <p className="text-muted-foreground text-sm">Account information and settings</p>
      </div>

      <div className="p-6 bg-card border rounded-2xl shadow-sm space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <User size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold">{profile?.full_name}</h3>
            <p className="text-sm text-muted-foreground">@{profile?.username}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 pt-4 border-t">
          <div className="flex items-center justify-between p-3 bg-accent/30 rounded-xl">
            <div className="flex items-center gap-3">
              <Shield size={18} className="text-muted-foreground" />
              <span className="text-sm font-medium">Role</span>
            </div>
            <span className="text-sm font-bold uppercase">{profile?.role}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-accent/30 rounded-xl">
            <div className="flex items-center gap-3">
              <Info size={18} className="text-muted-foreground" />
              <span className="text-sm font-medium">Account Status</span>
            </div>
            <span className={`text-sm font-bold ${profile?.is_active ? 'text-emerald-600' : 'text-destructive'}`}>
              {profile?.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <form action={logout} className="pt-4">
          <button 
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 border border-destructive text-destructive font-bold rounded-xl hover:bg-destructive/10 transition-colors"
          >
            <LogOut size={18} />
            Logout
          </button>
        </form>
      </div>

      <div className="p-4 bg-muted/30 rounded-xl text-center">
        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
          Tracker App v1.0.0
        </p>
      </div>
    </div>
  )
}
