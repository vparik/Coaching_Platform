import { createClient } from '@/lib/supabase/server'
import MatchPrepClient from '@/components/match-prep/MatchPrepClient'

export default async function MatchPrepPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('team_id')
    .eq('id', user!.id)
    .single()

  const { data: matches } = await supabase
    .from('matches')
    .select('*, match_preps(*)')
    .eq('team_id', profile?.team_id)
    .gte('date', new Date().toISOString().split('T')[0])
    .order('date', { ascending: true })

  return <MatchPrepClient matches={matches ?? []} teamId={profile?.team_id} />
}
