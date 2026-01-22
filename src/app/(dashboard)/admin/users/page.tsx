import { createClient } from '@/lib/supabase/server'
import { Users, Shield, User as UserIcon } from 'lucide-react'
import Link from 'next/link'
import { toggleUserStatus, updateUserRole } from './actions'

export default async function AdminUsersPage() {

  const supabase = await createClient()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('role', { ascending: true })
    .order('full_name', { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Representatives</h2>
          <p className="text-muted-foreground">Manage roles and permissions</p>
        </div>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-muted/50 text-xs font-bold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Role</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {profiles?.map(profile => (
              <tr key={profile.id} className="hover:bg-accent/50 transition-colors">
                <td className="px-6 py-4 font-medium flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <UserIcon size={16} />
                  </div>
                  {profile.full_name}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium text-[10px] uppercase border ${profile.role === 'admin' ? 'bg-purple-500/10 border-purple-500/20 text-purple-600' : 'bg-blue-500/10 border-blue-500/20 text-blue-600'}`}>
                    {profile.role === 'admin' && <Shield size={10} />}
                    {profile.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {profile.is_active ? (
                    <span className="text-emerald-600 flex items-center gap-1.5 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      Active
                    </span>
                  ) : (
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <form action={toggleUserStatus.bind(null, profile.id, !profile.is_active)}>
                      <button 
                        type="submit"
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                          profile.is_active 
                            ? 'bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive' 
                            : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                        }`}
                      >
                        {profile.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </form>
                    {profile.role !== 'admin' && (
                      <form action={updateUserRole.bind(null, profile.id, 'admin')}>
                        <button 
                          type="submit"
                          className="px-3 py-1 text-xs font-medium bg-purple-500/10 text-purple-600 rounded-md hover:bg-purple-500/20 transition-colors"
                        >
                          Make Admin
                        </button>
                      </form>
                    )}
                    <Link 
                      href={`/admin/users/${profile.id}`}
                      className="px-3 py-1 text-xs font-medium text-primary hover:underline"
                    >
                      View Details
                    </Link>
                  </div>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
