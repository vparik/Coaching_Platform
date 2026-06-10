import { createClient } from '@/lib/supabase/server'
import MatchPrepClient from '@/components/match-prep/MatchPrepClient'

export default async function MatchPrepPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('team_id, role')
    .eq('id', user!.id)
    .single()

  const { data: matches } = await supabase
    .from('matches')
    .select('*, match_preps(*)')
    .eq('team_id', profile?.team_id)
    .gte('date', new Date().toISOString().split('T')[0])
    .order('date', { ascending: true })

  const { data: players } = await supabase
    .from('players')
    .select('id, name, position, availability_status')
    .eq('team_id', profile?.team_id)
    .order('name')

  return (
    <MatchPrepClient
      matches={matches ?? []}
      players={players ?? []}
      teamId={profile?.team_id}
      role={profile?.role ?? 'coach'}
    />
  )
}
