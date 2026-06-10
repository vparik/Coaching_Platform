import { createClient } from '@/lib/supabase/server'
import TrainingClient from '@/components/training/TrainingClient'

export default async function TrainingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('team_id, role')
    .eq('id', user!.id)
    .single()

  const isPlayer = profile?.role === 'player'

  const [{ data: sessionsRaw }, { data: matches }, exercisesResult] = await Promise.all([
    supabase
      .from('training_sessions')
      .select('*, session_blocks(id, exercise_id, free_text, duration, position, exercises(id, name, category))')
      .eq('team_id', profile?.team_id)
      .order('date', { ascending: true }),
    supabase
      .from('matches')
      .select('id, opponent, date, venue')
      .eq('team_id', profile?.team_id)
      .order('date', { ascending: true }),
    isPlayer
      ? Promise.resolve({ data: [] })
      : supabase
          .from('exercises')
          .select('*')
          .eq('team_id', profile?.team_id)
          .order('name', { ascending: true }),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessions = (sessionsRaw ?? []) as any[]

  return (
    <TrainingClient
      sessions={sessions}
      teamId={profile?.team_id}
      matches={matches ?? []}
      exercises={exercisesResult.data ?? []}
      role={profile?.role ?? 'coach'}
    />
  )
}
