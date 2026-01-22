import { createClient } from '@/lib/supabase/server'
import { Phone, DollarSign, Users, Coffee } from 'lucide-react'
import Link from 'next/link'

export default async function AdminOverviewPage() {
  const supabase = await createClient()

  const { data: kpis } = await supabase.rpc('get_admin_kpis').single()
  
  const { data: activeSessions } = await supabase
    .from('work_sessions')
    .select(`
      *,
      profiles(full_name),
      break_entries(*)
    `)
    .eq('session_status', 'open')
    .order('clock_in_at', { ascending: false })

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Today's Overview</h2>
        <p className="text-muted-foreground">Real-time performance metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 bg-card border rounded-xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500">
              <Phone size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Calls Made</p>
              <h3 className="text-2xl font-bold">{kpis?.total_calls || 0}</h3>
            </div>
          </div>
        </div>

        <div className="p-6 bg-card border rounded-xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-500">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Deposits</p>
              <h3 className="text-2xl font-bold">${kpis?.total_deposits_amount || 0}</h3>
              <p className="text-xs text-muted-foreground">{kpis?.total_deposits_count || 0} entries</p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-card border rounded-xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg text-primary">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Staff</p>
              <h3 className="text-2xl font-bold">{kpis?.active_sessions || 0}</h3>
            </div>
          </div>
        </div>

        <div className="p-6 bg-card border rounded-xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-lg text-amber-500">
              <Coffee size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">On Break</p>
              <h3 className="text-2xl font-bold">{kpis?.on_break_count || 0}</h3>
            </div>
          </div>
        </div>
      </div>

      <section>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Users size={20} className="text-muted-foreground" />
          Active Sessions
        </h3>
        <div className="border rounded-xl bg-card overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-muted/50 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Representative</th>
                <th className="px-6 py-3">Clocked In</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {activeSessions?.map(session => {
                const activeBreak = session.break_entries?.find(b => !b.end_at)
                return (
                  <tr key={session.id} className="hover:bg-accent/50 transition-colors">
                    <td className="px-6 py-4 font-medium">{session.profiles?.full_name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{new Date(session.clock_in_at).toLocaleTimeString()}</td>
                    <td className="px-6 py-4">
                      {activeBreak ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-bold uppercase">
                          On Break: {activeBreak.break_type}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold uppercase">
                          Working
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/admin/users/${session.user_id}`}
                        className="text-primary hover:underline font-medium"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {(!activeSessions || activeSessions.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground italic">
                    No active sessions right now
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
