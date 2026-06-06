import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BoardClient from '@/components/training/BoardClient'

export default async function BoardPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams
  if (!id) redirect('/training')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('team_id')
    .eq('id', user!.id)
    .single()

  const { data: exercise } = await supabase
    .from('exercises')
    .select('*')
    .eq('id', id)
    .eq('team_id', profile?.team_id)
    .single()

  if (!exercise) redirect('/training')

  return <BoardClient exercise={exercise} />
}
