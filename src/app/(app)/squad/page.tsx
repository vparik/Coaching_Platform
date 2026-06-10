import { createClient } from '@/lib/supabase/server'
import SquadClient from '@/components/squad/SquadClient'

export default async function SquadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('team_id, role, player_id')
    .eq('id', user!.id)
    .single()

  const isPlayer = profile?.role === 'player'

  if (isPlayer) {
    const { data: player } = await supabase
      .from('players')
      .select('*')
      .eq('id', profile!.player_id!)
      .single()

    return (
      <SquadClient
        players={player ? [player] : []}
        teamId={profile?.team_id ?? null}
        role="player"
        joinCode={null}
        linkedPlayerIds={[]}
      />
    )
  }

  const [{ data: players }, { data: team }, { data: linkedProfiles }] = await Promise.all([
    supabase
      .from('players')
      .select('*')
      .eq('team_id', profile?.team_id)
      .is('left_at', null)
      .order('name'),
    supabase
      .from('teams')
      .select('join_code')
      .eq('id', profile?.team_id)
      .single(),
    supabase
      .from('profiles')
      .select('player_id')
      .eq('team_id', profile?.team_id)
      .not('player_id', 'is', null),
  ])

  return (
    <SquadClient
      players={players ?? []}
      teamId={profile?.team_id ?? null}
      role="coach"
      joinCode={team?.join_code ?? null}
      linkedPlayerIds={(linkedProfiles ?? []).map(p => p.player_id as string)}
    />
  )
}
