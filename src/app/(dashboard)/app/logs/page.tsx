import { createClient } from '@/lib/supabase/server'
import { Phone, DollarSign, Coffee } from 'lucide-react'
import { FormattedDate, FormattedTime } from '@/components/ui/date-formatter'

export default async function CSRLogsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: sessions } = await supabase
    .from('work_sessions')
    .select(`
      *,
      call_entries(*),
      deposit_entries(*),
      break_entries(*)
    `)
    .eq('user_id', user?.id)
    .order('work_date', { ascending: false })
    .limit(10)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Your History</h2>
        <p className="text-muted-foreground text-sm">Review your last 10 work days</p>
      </div>

      <div className="space-y-4">
        {sessions?.map(session => (
          <div key={session.id} className="p-4 bg-card border rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <p className="text-sm font-bold"><FormattedDate date={session.work_date} options={{ weekday: 'long', month: 'short', day: 'numeric' }} /></p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                  <FormattedTime date={session.clock_in_at} options={{ hour: '2-digit', minute: '2-digit' }} /> - {session.clock_out_at ? <FormattedTime date={session.clock_out_at} options={{ hour: '2-digit', minute: '2-digit' }} /> : 'Active'}
                </p>
              </div>
              <div className="text-right">
                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${session.session_status === 'open' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                  {session.session_status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center p-2 bg-accent/50 rounded-xl">
                <Phone size={14} className="text-blue-500 mb-1" />
                <p className="text-sm font-bold">{session.call_entries?.length || 0}</p>
                <p className="text-[9px] text-muted-foreground uppercase">Calls</p>
              </div>
              <div className="flex flex-col items-center p-2 bg-accent/50 rounded-xl">
                <DollarSign size={14} className="text-emerald-500 mb-1" />
                <p className="text-sm font-bold">{session.deposit_entries?.length || 0}</p>
                <p className="text-[9px] text-muted-foreground uppercase">Deposits</p>
              </div>
              <div className="flex flex-col items-center p-2 bg-accent/50 rounded-xl">
                <Coffee size={14} className="text-amber-500 mb-1" />
                <p className="text-sm font-bold">{session.break_entries?.length || 0}</p>
                <p className="text-[9px] text-muted-foreground uppercase">Breaks</p>
              </div>
            </div>

            {session.remarks && (
              <div className="p-2 bg-muted/30 rounded-lg">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Remarks</p>
                <p className="text-xs italic">"{session.remarks}"</p>
              </div>
            )}
          </div>
        ))}

        {(!sessions || sessions.length === 0) && (
          <div className="py-20 text-center text-muted-foreground">
            <p>No history found yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
