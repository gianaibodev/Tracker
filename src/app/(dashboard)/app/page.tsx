import { createClient } from '@/lib/supabase/server'
import { clockIn, clockOut, startBreak, endBreak, logCall, logDeposit } from './actions'
import { Clock, Coffee, Phone, DollarSign, PenLine } from 'lucide-react'
import { FormattedTime } from '@/components/ui/date-formatter'

export default async function CSRDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: activeSession } = await supabase
    .from('work_sessions')
    .select('*, break_entries(*)')
    .eq('user_id', user?.id)
    .eq('session_status', 'open')
    .single()

  const { data: lastClosedSession } = !activeSession ? await supabase
    .from('work_sessions')
    .select('*')
    .eq('user_id', user?.id)
    .eq('session_status', 'closed')
    .order('clock_out_at', { ascending: false })
    .limit(1)
    .single() : { data: null }

  const { data: sessionSummary } = lastClosedSession ? await supabase
    .rpc('get_session_summary', { p_session_id: lastClosedSession.id })
    .single() as { data: {
      total_duration_minutes: number,
      total_break_minutes: number,
      clean_work_minutes: number,
      break_counts: Record<string, number>,
      username: string
    } | null } : { data: null }

  const activeBreak = activeSession?.break_entries?.find((b: any) => !b.end_at)

  // RPC for remaining allowances
  const { data: allowances } = await supabase.rpc('get_remaining_allowances', { p_user_id: user?.id }) as { data: Array<{
    break_type: string,
    max_count: number,
    max_minutes: number,
    used_count: number,
    used_minutes: number,
    remaining_count: number,
    remaining_minutes: number
  }> | null }
  const { data: stats } = await supabase.rpc('get_user_stats', { p_user_id: user?.id }).single() as { data: {
    total_calls: number,
    total_deposits_count: number,
    total_deposits_amount: number,
    total_break_minutes: number,
    total_sessions: number
  } | null }

  const { data: callStatuses } = await supabase.from('call_status_options').select('*').eq('is_enabled', true).order('sort_order')
  const { data: callOutcomes } = await supabase.from('call_outcome_options').select('*').eq('is_enabled', true).order('sort_order')

  return (
    <div className="space-y-6">
      {/* Session Status Card */}
      <div className="p-6 bg-card border rounded-2xl shadow-sm">
        {!activeSession ? (
          <div className="text-center py-4 space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-bold">You are clocked out</h2>
              <p className="text-sm text-muted-foreground">Ready to start your shift?</p>
            </div>
            
            <form action={clockIn}>
              <button className="flex items-center gap-2 mx-auto px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg hover:opacity-90 transition-opacity">
                <Clock size={20} />
                Clock In Now
              </button>
            </form>

            {sessionSummary && (
              <div className="mt-8 pt-6 border-t space-y-2 text-left bg-accent/10 p-6 rounded-2xl border border-accent/20">
                <h3 className="text-lg font-bold mb-4">Shift Summary for @{sessionSummary.username}</h3>
                
                <div className="space-y-1 font-mono text-sm">
                  <p><span className="font-bold">Check In:</span> <FormattedTime date={lastClosedSession.clock_in_at} options={{ hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }} /></p>
                  <p><span className="font-bold">Check Out:</span> <FormattedTime date={lastClosedSession.clock_out_at} options={{ hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }} /></p>
                  <p><span className="font-bold">Total Hours:</span> {sessionSummary?.total_duration_minutes ? (sessionSummary.total_duration_minutes / 60).toFixed(1) : '0.0'}</p>
                  <p><span className="font-bold">Clean Hours:</span> {sessionSummary?.clean_work_minutes ? (sessionSummary.clean_work_minutes / 60).toFixed(2) : '0.00'}</p>
                  
                  {Object.entries(sessionSummary.break_counts || {}).map(([type, count]) => (
                    <p key={type}>
                      <span className="font-bold">{type}:</span> {count as number} {Number(count) === 1 ? 'time' : 'times'}
                    </p>
                  ))}
                  
                  {Object.keys(sessionSummary.break_counts || {}).length === 0 && (
                    <p className="text-muted-foreground italic">No breaks recorded</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Active Session</p>
                <h2 className="text-2xl font-bold">Clocked In</h2>
              </div>
              <form action={clockOut.bind(null, activeSession.id)}>
                <button className="px-4 py-2 border border-destructive text-destructive rounded-lg text-sm font-bold hover:bg-destructive/10 transition-colors">
                  Clock Out
                </button>
              </form>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-2">
              {activeBreak ? (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Coffee className="text-amber-500" size={24} />
                    <div>
                      <p className="text-sm font-bold text-amber-500 uppercase">On {activeBreak.break_type} Break</p>
                      <p className="text-xs text-muted-foreground italic">Started at <FormattedTime date={activeBreak.start_at} options={{ hour: '2-digit', minute: '2-digit', hour12: true }} /></p>
                    </div>
                  </div>
                  <form action={endBreak.bind(null, activeBreak.id)}>
                    <button className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-bold shadow-md hover:bg-amber-600">
                      End Break
                    </button>
                  </form>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allowances?.filter(a => a.remaining_count > 0).map(a => (
                    <form key={a.break_type} action={startBreak.bind(null, activeSession.id, a.break_type)}>
                      <button className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-full text-sm font-bold hover:bg-secondary/80 transition-colors uppercase">
                        <Coffee size={16} />
                        {a.break_type}
                      </button>
                    </form>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Break Quotas Card */}
      <div className="p-6 bg-card border rounded-2xl shadow-sm space-y-4">
        <h3 className="font-bold flex items-center gap-2">
           <Coffee size={18} className="text-muted-foreground" />
           Break Allowances Left
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {allowances?.map(a => (
            <div key={a.break_type} className="p-3 bg-accent/50 rounded-xl">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-tighter mb-1">{a.break_type}</p>
              <div className="flex justify-between items-end">
                <p className="text-xl font-bold">{a.remaining_count}</p>
                <p className="text-xs text-muted-foreground">{Math.max(0, Math.round(a.remaining_minutes))}m left</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Today's Totals Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-center">
          <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Calls</p>
          <p className="text-xl font-black text-blue-600">{stats?.total_calls || 0}</p>
        </div>
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center">
          <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Deposits</p>
          <p className="text-xl font-black text-emerald-600">{stats?.total_deposits_count || 0}</p>
        </div>
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-center">
          <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Break Mins</p>
          <p className="text-xl font-black text-amber-600">{Math.round(stats?.total_break_minutes || 0)}</p>
        </div>
      </div>

      {activeSession && !activeBreak && (
        <div className="grid grid-cols-1 gap-6">
          {/* Add Call Card */}
          <div className="p-6 bg-card border rounded-2xl shadow-sm space-y-4">
            <h3 className="font-bold flex items-center gap-2 text-primary">
              <Phone size={18} />
              Log a Call
            </h3>
            <form action={logCall} className="space-y-3">
              <input type="hidden" name="sessionId" value={activeSession.id} />
              <div className="grid grid-cols-2 gap-3">
                <select name="status" className="p-2 border rounded-lg bg-background text-sm" required>
                  <option value="">Status</option>
                  {callStatuses?.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
                <select name="outcome" className="p-2 border rounded-lg bg-background text-sm" required>
                  <option value="">Outcome</option>
                  {callOutcomes?.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
              </div>
              <textarea 
                name="notes" 
                placeholder="Call remarks..." 
                className="w-full p-2 border rounded-lg bg-background text-sm h-20"
              />
              <button type="submit" className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-md">
                Save Call Entry
              </button>
            </form>
          </div>

          {/* Add Deposit Card */}
          <div className="p-6 bg-card border rounded-2xl shadow-sm space-y-4">
            <h3 className="font-bold flex items-center gap-2 text-emerald-500">
              <DollarSign size={18} />
              Log Deposit
            </h3>
            <form action={logDeposit} className="space-y-3">
              <input type="hidden" name="sessionId" value={activeSession.id} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input 
                  type="number" 
                  step="0.01" 
                  name="amount" 
                  placeholder="Amount" 
                  className="p-2 border rounded-lg bg-background text-sm" 
                  required 
                />
                <input 
                  type="text" 
                  name="reference" 
                  placeholder="Reference #" 
                  className="p-2 border rounded-lg bg-background text-sm" 
                />
              </div>
              <textarea 
                name="notes" 
                placeholder="Deposit notes..." 
                className="w-full p-2 border rounded-lg bg-background text-sm h-20"
              />
              <button type="submit" className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl shadow-md">
                Save Deposit
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
