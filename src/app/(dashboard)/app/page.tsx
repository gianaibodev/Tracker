import { createClient } from '@/lib/supabase/server'
import { clockIn, clockOut, endBreak, logCall, logDeposit, updateRemarks, updateBreakNotes } from './actions'
import { Clock, Coffee, Phone, DollarSign, PenLine } from 'lucide-react'
import { FormattedTime } from '@/components/ui/date-formatter'
import { BreakButton } from '@/components/break-button'
import { SubmitButton } from '@/components/submit-button'



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

  // Get available break types (no time limits - all breaks are always available)
  const { data: breakTypes } = await supabase
    .from('break_allowances')
    .select('break_type')
    .eq('is_enabled', true)
    .order('break_type')
  // Get stats for today - explicitly pass null to use today's date range
  const { data: stats, error: statsError } = await supabase.rpc('get_user_stats', { 
    p_user_id: user?.id,
    p_start_date: null,
    p_end_date: null
  }).single() as { data: {
    total_calls: number,
    total_deposits_count: number,
    total_deposits_amount: number,
    total_break_minutes: number,
    total_sessions: number
  } | null, error: any }
  
  if (statsError) {
    console.error('Error fetching stats:', statsError)
  }

  const { data: callStatuses } = await supabase.from('call_status_options').select('*').eq('is_enabled', true).order('sort_order')
  const { data: callOutcomes } = await supabase.from('call_outcome_options').select('*').eq('is_enabled', true).order('sort_order')

  return (
    <div className="space-y-6">
      {/* STEP 1: Clock In/Out - Most Important */}
      <div className="p-6 bg-card border rounded-2xl shadow-sm">
        {!activeSession ? (
          <div className="text-center py-6 space-y-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Welcome Back!</h2>
              <p className="text-sm text-muted-foreground">Start your shift by clocking in</p>
            </div>
            
            <form action={clockIn}>
              <SubmitButton className="flex items-center gap-2 mx-auto px-10 py-4 bg-primary text-primary-foreground rounded-full font-bold text-lg shadow-lg hover:opacity-90 transition-opacity" loadingText="Clocking In...">
                <Clock size={24} />
                Clock In Now
              </SubmitButton>
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
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-4 border-b">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Step 1: Status</p>
                <h2 className="text-2xl font-bold text-emerald-600">✓ Clocked In</h2>
                <p className="text-xs text-muted-foreground mt-1">Session started</p>
              </div>
              <form action={clockOut.bind(null, activeSession.id)}>
                <SubmitButton className="px-4 py-2 border border-destructive text-destructive rounded-lg text-sm font-bold hover:bg-destructive/10 transition-colors" loadingText="Clocking Out...">
                  Clock Out
                </SubmitButton>
              </form>
            </div>

            {/* STEP 2: Break Management - Priority */}
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3">Step 2: Take a Break</p>
              {activeBreak ? (
                <div className="p-5 bg-amber-500/10 border-2 border-amber-500/30 rounded-xl space-y-4">
                  <div className="flex items-center gap-3">
                    <Coffee className="text-amber-500" size={28} />
                    <div className="flex-1">
                      <p className="text-base font-bold text-amber-600 uppercase">On {activeBreak.break_type} Break</p>
                      <p className="text-xs text-muted-foreground">Started at <FormattedTime date={activeBreak.start_at} options={{ hour: '2-digit', minute: '2-digit', hour12: true }} /></p>
                    </div>
                  </div>
                  
                  {/* Break Remarks Form */}
                  <div className="space-y-3">
                    <form action={updateBreakNotes} className="space-y-3">
                      <input type="hidden" name="breakId" value={activeBreak.id} />
                      <div>
                        <label className="text-sm font-medium block mb-2">Why are you taking this break?</label>
                        <textarea
                          name="notes"
                          defaultValue={activeBreak.notes || ''}
                          placeholder="Enter your reason for taking this break..."
                          className="w-full p-3 border rounded-lg bg-background text-sm h-24 resize-none"
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <SubmitButton className="flex-1 py-2 px-4 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 transition-colors" loadingText="Saving...">
                          Save Reason
                        </SubmitButton>
                      </div>
                    </form>
                    <form action={endBreak.bind(null, activeBreak.id)}>
                      <SubmitButton className="w-full py-2 px-4 bg-destructive text-white font-bold rounded-lg hover:bg-destructive/90 transition-colors" loadingText="Ending...">
                        End Break
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Click a break type to start:</p>
                  <div className="grid grid-cols-1 gap-3">
                    {breakTypes?.map(bt => (
                      <BreakButton 
                        key={bt.break_type} 
                        breakType={bt.break_type} 
                        sessionId={activeSession.id}
                      />
                    ))}
                    {(!breakTypes || breakTypes.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-4">No breaks configured</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>


      {/* STEP 3: Activity Logging - Moved to Bottom */}
      {activeSession && !activeBreak && (
        <div className="space-y-6 pt-4 border-t">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Step 3: Log Activities (Optional)</p>
          
          {/* Today's Summary - Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-center">
              <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Calls</p>
              <p className="text-xl font-black text-blue-600">{stats?.total_calls || 0}</p>
            </div>
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
              <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Deposits</p>
              <p className="text-xl font-black text-emerald-600">{stats?.total_deposits_count || 0}</p>
            </div>
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
              <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Break Mins</p>
              <p className="text-xl font-black text-amber-600">{Math.round(stats?.total_break_minutes || 0)}</p>
            </div>
          </div>

          {/* Log Call */}
          <div className="p-5 bg-card border rounded-xl shadow-sm space-y-3">
            <h3 className="font-bold flex items-center gap-2 text-primary text-sm">
              <Phone size={16} />
              Log a Call
            </h3>
            <form action={logCall} className="space-y-3">
              <input type="hidden" name="sessionId" value={activeSession.id} />
              <div className="grid grid-cols-2 gap-2">
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
                className="w-full p-2 border rounded-lg bg-background text-sm h-16"
              />
              <SubmitButton className="w-full py-2 bg-primary text-primary-foreground font-medium rounded-lg" loadingText="Saving...">
                Save Call
              </SubmitButton>
            </form>
          </div>

          {/* Log Deposit */}
          <div className="p-5 bg-card border rounded-xl shadow-sm space-y-3">
            <h3 className="font-bold flex items-center gap-2 text-emerald-500 text-sm">
              <DollarSign size={16} />
              Log Deposit
            </h3>
            <form action={logDeposit} className="space-y-3">
              <input type="hidden" name="sessionId" value={activeSession.id} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
                className="w-full p-2 border rounded-lg bg-background text-sm h-16"
              />
              <SubmitButton className="w-full py-2 bg-emerald-500 text-white font-medium rounded-lg" loadingText="Saving...">
                Save Deposit
              </SubmitButton>
            </form>
          </div>

          {/* Session Remarks */}
          <div className="p-5 bg-card border rounded-xl shadow-sm space-y-3">
            <h3 className="font-bold flex items-center gap-2 text-sm">
              <PenLine size={16} className="text-muted-foreground" />
              Session Remarks
            </h3>
            <form action={updateRemarks} className="space-y-2">
              <input type="hidden" name="sessionId" value={activeSession.id} />
              <textarea 
                name="remarks" 
                defaultValue={activeSession.remarks || ''}
                placeholder="Add any notes about your shift..."
                className="w-full p-2 border rounded-lg bg-background text-sm h-20 resize-none"
              />
              <SubmitButton className="w-full py-2 bg-secondary text-secondary-foreground font-medium rounded-lg" loadingText="Saving...">
                Save Remarks
              </SubmitButton>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
