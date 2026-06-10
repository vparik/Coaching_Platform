import { createClient } from '@/lib/supabase/server'
import TacticsClient from '@/components/tactics/TacticsClient'

export default async function TacticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('team_id, role')
    .eq('id', user!.id)
    .single()

  const { data: tactics } = await supabase
    .from('tactics')
    .select('*')
    .eq('team_id', profile?.team_id)
    .order('created_at', { ascending: false })

  return <TacticsClient tactics={tactics ?? []} teamId={profile?.team_id} role={profile?.role ?? 'coach'} />
}
