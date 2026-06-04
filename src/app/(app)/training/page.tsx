import { createClient } from '@/lib/supabase/server'
import TrainingClient from '@/components/training/TrainingClient'

export default async function TrainingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('team_id')
    .eq('id', user!.id)
    .single()

  const { data: sessions } = await supabase
    .from('training_sessions')
    .select('*')
    .eq('team_id', profile?.team_id)
    .order('date', { ascending: true })

  return <TrainingClient sessions={sessions ?? []} teamId={profile?.team_id} />
}
