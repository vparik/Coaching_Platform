import { createClient } from '@/lib/supabase/server'
import SquadClient from '@/components/squad/SquadClient'

export default async function SquadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('team_id')
    .eq('id', user!.id)
    .single()

  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('team_id', profile?.team_id)
    .order('name', { ascending: true })

  return <SquadClient players={players ?? []} teamId={profile?.team_id} />
}
