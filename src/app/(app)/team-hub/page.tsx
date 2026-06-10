import { createClient } from '@/lib/supabase/server'
import TeamHubClient from '@/components/team-hub/TeamHubClient'

export default async function TeamHubPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, teams(*), role, player_id')
    .eq('id', user!.id)
    .single()

  const { data: messages } = await supabase
    .from('team_messages')
    .select('*, profiles(name)')
    .eq('team_id', profile?.team_id)
    .order('created_at', { ascending: false })

  const { data: players } = await supabase
    .from('players')
    .select('id')
    .eq('team_id', profile?.team_id)

  const { data: views } = await supabase
    .from('message_views')
    .select('message_id, player_id')
    .in('message_id', (messages ?? []).map((m: { id: string }) => m.id))

  const viewsByMessage = (views ?? []).reduce<Record<string, Set<string>>>((acc, v) => {
    if (!acc[v.message_id]) acc[v.message_id] = new Set()
    acc[v.message_id].add(v.player_id)
    return acc
  }, {})

  const enrichedMessages = (messages ?? []).map((m: { id: string; content: string; created_at: string; coach_id: string; profiles?: { name: string } | null; media_url?: string | null }) => ({
    ...m,
    view_count: viewsByMessage[m.id]?.size ?? 0,
    total_players: players?.length ?? 0,
  }))

  return (
    <TeamHubClient
      messages={enrichedMessages}
      teamId={profile?.team_id}
      userId={user!.id}
      role={profile?.role ?? 'coach'}
      playerId={profile?.player_id ?? null}
    />
  )
}
