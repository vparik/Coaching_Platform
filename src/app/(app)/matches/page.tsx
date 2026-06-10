import { createClient } from '@/lib/supabase/server'
import MatchLogClient from '@/components/matches/MatchLogClient'

export default async function MatchesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('team_id, role, player_id')
    .eq('id', user!.id)
    .single()

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .eq('team_id', profile?.team_id)
    .order('date', { ascending: false })

  const { data: players } = await supabase
    .from('players')
    .select('id, name, position')
    .eq('team_id', profile?.team_id)
    .order('name')

  const { data: ratings } = await supabase
    .from('player_ratings')
    .select('*')
    .in('match_id', (matches ?? []).map((m: { id: string }) => m.id))

  return (
    <MatchLogClient
      matches={matches ?? []}
      players={players ?? []}
      ratings={ratings ?? []}
      teamId={profile?.team_id}
      role={profile?.role ?? 'coach'}
      playerId={profile?.player_id ?? null}
    />
  )
}
