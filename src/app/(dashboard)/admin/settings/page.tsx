import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: settings } = await supabase.from('org_settings').select('*').single()
  const { data: allowances } = await supabase.from('break_allowances').select('*').order('break_type')
  const { data: statuses } = await supabase.from('call_status_options').select('*').order('sort_order')
  const { data: outcomes } = await supabase.from('call_outcome_options').select('*').order('sort_order')

  async function updateSettings(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const timezone = formData.get('timezone') as string
    const resetMode = formData.get('break_reset_mode') as string

    const { error } = await supabase.from('org_settings').update({
      timezone,
      break_reset_mode: resetMode,
    }).eq('id', settings?.id)

    if (!error) {
      revalidatePath('/admin/settings')
    }
  }

  async function updateAllowance(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const id = formData.get('id') as string
    const maxCount = parseInt(formData.get('max_count') as string)
    const maxMinutes = parseInt(formData.get('max_minutes') as string)
    const isEnabled = formData.get('is_enabled') === 'on'

    const { error } = await supabase.from('break_allowances').update({
      max_count: maxCount,
      max_minutes: maxMinutes,
      is_enabled: isEnabled,
    }).eq('id', id)

    if (!error) {
      revalidatePath('/admin/settings')
    }
  }


  return (
    <div className="space-y-10 max-w-4xl">
      <section>
        <h2 className="text-xl font-bold mb-4">Organization Settings</h2>
        <div className="p-6 bg-card border rounded-lg shadow-sm">
          <form action={updateSettings} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Timezone</label>
                <input 
                  name="timezone"
                  defaultValue={settings?.timezone}
                  className="w-full p-2 border rounded-md bg-background"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Break Reset Mode</label>
                <select 
                  name="break_reset_mode"
                  defaultValue={settings?.break_reset_mode}
                  className="w-full p-2 border rounded-md bg-background"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly_fixed">Weekly (Fixed)</option>
                  <option value="pay_period">Pay Period</option>
                  <option value="rolling">Rolling Window</option>
                </select>
              </div>
            </div>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">
              Save Settings
            </button>
          </form>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Break Allowances</h2>
        <div className="space-y-4">
          {allowances?.map((allowance) => (
            <div key={allowance.id} className="p-6 bg-card border rounded-lg shadow-sm">
              <form action={updateAllowance} className="flex flex-wrap items-end gap-4">
                <input type="hidden" name="id" value={allowance.id} />
                <div className="space-y-2 flex-1 min-w-[150px]">
                  <label className="text-sm font-medium block capitalize">{allowance.break_type} Max Count</label>
                  <input 
                    name="max_count"
                    type="number"
                    defaultValue={allowance.max_count}
                    className="w-full p-2 border rounded-md bg-background"
                  />
                </div>
                <div className="space-y-2 flex-1 min-w-[150px]">
                  <label className="text-sm font-medium block capitalize">{allowance.break_type} Max Minutes</label>
                  <input 
                    name="max_minutes"
                    type="number"
                    defaultValue={allowance.max_minutes}
                    className="w-full p-2 border rounded-md bg-background"
                  />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <input 
                    name="is_enabled"
                    type="checkbox"
                    defaultChecked={allowance.is_enabled}
                    id={`enabled-${allowance.id}`}
                  />
                  <label htmlFor={`enabled-${allowance.id}`} className="text-sm">Enabled</label>
                </div>
                <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">
                  Update
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Call Options</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="font-semibold text-muted-foreground">Statuses</h3>
            <div className="p-4 bg-card border rounded-lg space-y-2">
              {statuses?.map(s => (
                <div key={s.id} className="text-sm flex justify-between border-b last:border-0 pb-2">
                  <span>{s.label}</span>
                  <span className="text-muted-foreground">key: {s.key}</span>
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-2 italic">Add/Remove via DB in MVP</p>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold text-muted-foreground">Outcomes</h3>
            <div className="p-4 bg-card border rounded-lg space-y-2">
              {outcomes?.map(o => (
                <div key={o.id} className="text-sm flex justify-between border-b last:border-0 pb-2">
                  <span>{o.label}</span>
                  <span className="text-muted-foreground">key: {o.key}</span>
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-2 italic">Add/Remove via DB in MVP</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
