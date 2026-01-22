import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Phone, DollarSign, Coffee, Clock, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default async function AdminUserDrilldownPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { id } = await params

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!profile) notFound()

  const { data: stats } = await supabase.rpc('get_user_stats', { p_user_id: id }).single() as { data: {
    total_calls: number,
    total_deposits_count: number,
    total_deposits_amount: number,
    total_break_minutes: number,
    total_sessions: number
  } | null }
  
  const { data: recentSessions } = await supabase
    .from('work_sessions')
    .select(`
      *,
      call_entries(*),
      deposit_entries(*),
      break_entries(*)
    `)
    .eq('user_id', id)
    .order('work_date', { ascending: false })
    .limit(10)

  // Fetch summaries for these sessions
  const sessionSummaries = recentSessions ? await Promise.all(
    recentSessions.map(async (s) => {
      const { data } = await supabase.rpc('get_session_summary', { p_session_id: s.id }).single() as { data: {
        total_duration_minutes: number,
        total_break_minutes: number,
        clean_work_minutes: number,
        break_counts: Record<string, number>,
        username: string
      } | null }
      return { id: s.id, ...data }
    })
  ) : []

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/admin/users" className="p-2 hover:bg-accent rounded-full transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold">{profile.full_name}</h2>
          <p className="text-muted-foreground">User Performance & History</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 bg-card border rounded-xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500">
              <Phone size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Today's Calls</p>
              <h3 className="text-2xl font-bold">{stats?.total_calls || 0}</h3>
            </div>
          </div>
        </div>

        <div className="p-6 bg-card border rounded-xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-500">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Today's Deposits</p>
              <h3 className="text-2xl font-bold">${stats?.total_deposits_amount || 0}</h3>
              <p className="text-xs text-muted-foreground">{stats?.total_deposits_count || 0} entries</p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-card border rounded-xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-lg text-amber-500">
              <Coffee size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Break Time</p>
              <h3 className="text-2xl font-bold">{Math.round(stats?.total_break_minutes || 0)}m</h3>
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Clock size={20} className="text-muted-foreground" />
          Recent Sessions
        </h3>
        <div className="space-y-4">
          {recentSessions?.map(session => {
            const summary = sessionSummaries.find(s => s.id === session.id)
            return (
              <div key={session.id} className="p-6 bg-card border rounded-xl shadow-sm space-y-6">
                <div className="flex flex-wrap justify-between items-center gap-2 border-b pb-4">
                  <div>
                    <p className="font-bold">{new Date(session.work_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p className="text-sm text-muted-foreground">
                      Shift: {new Date(session.clock_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })} - {session.clock_out_at ? new Date(session.clock_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : 'In Progress'}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${session.session_status === 'open' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                    {session.session_status}
                  </div>
                </div>

                <div className="bg-accent/5 p-6 rounded-2xl border border-accent/10 space-y-2">
                  <h4 className="text-md font-bold mb-3">Shift Summary for @{profile.username}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1 font-mono text-sm">
                    <p><span className="font-bold">Check In:</span> {new Date(session.clock_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toUpperCase()}</p>
                    <p><span className="font-bold">Check Out:</span> {session.clock_out_at ? new Date(session.clock_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toUpperCase() : 'N/A'}</p>
                    <p><span className="font-bold">Total Hours:</span> {summary?.total_duration_minutes ? (summary.total_duration_minutes / 60).toFixed(1) : '0.0'}</p>
                    <p><span className="font-bold">Clean Hours:</span> {summary?.clean_work_minutes ? (summary.clean_work_minutes / 60).toFixed(2) : '0.00'}</p>
                    
                    {summary && Object.entries(summary.break_counts || {}).map(([type, count]) => (
                      <p key={type}>
                        <span className="font-bold">{type}:</span> {count as number} {Number(count) === 1 ? 'time' : 'times'}
                      </p>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div className="p-3 bg-muted/20 rounded-xl space-y-1 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Calls</p>
                    <p className="text-lg font-bold">{session.call_entries?.length || 0}</p>
                  </div>
                  <div className="p-3 bg-muted/20 rounded-xl space-y-1 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Deposits</p>
                    <p className="text-lg font-bold">{session.deposit_entries?.length || 0}</p>
                  </div>
                  <div className="p-3 bg-muted/20 rounded-xl space-y-1 text-center col-span-2 md:col-span-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Deposit Sum</p>
                    <p className="text-lg font-bold text-emerald-600">
                      ${session.deposit_entries?.reduce((acc: number, d: any) => acc + Number(d.amount), 0).toFixed(2) || '0.00'}
                    </p>
                  </div>
                </div>

                {session.remarks && (
                  <div className="pt-2 border-t text-sm">
                    <span className="font-bold text-muted-foreground mr-2">Remarks:</span>
                    <span className="italic">"{session.remarks}"</span>
                  </div>
                )}
              </div>
            )
          })}
          {(!recentSessions || recentSessions.length === 0) && (
            <div className="py-12 text-center border rounded-xl bg-card text-muted-foreground italic">
              No sessions found for this representative
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
