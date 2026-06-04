import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Calendar, Users, Target, AlertCircle, CheckCircle2, Clock } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, teams(*)')
    .eq('id', user!.id)
    .single()

  const teamId = profile?.team_id

  const today = new Date().toISOString().split('T')[0]
  const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  const [
    { data: nextMatch },
    { data: trainingSessions },
    { data: players },
    { data: recentMessages },
  ] = await Promise.all([
    supabase
      .from('matches')
      .select('*, match_preps(*)')
      .eq('team_id', teamId)
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('training_sessions')
      .select('*')
      .eq('team_id', teamId)
      .gte('date', today)
      .lte('date', weekEnd)
      .order('date', { ascending: true }),
    supabase
      .from('players')
      .select('*')
      .eq('team_id', teamId),
    supabase
      .from('team_messages')
      .select('*, profiles(name)')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  const availablePlayers = players?.filter(p => p.availability_status === 'available') ?? []
  const injuredPlayers = players?.filter(p => p.availability_status === 'injured') ?? []
  const absentPlayers = players?.filter(p => p.availability_status === 'absent') ?? []

  const daysUntilMatch = nextMatch
    ? Math.ceil((new Date(nextMatch.date).getTime() - Date.now()) / 86400000)
    : null

  const prepDone = nextMatch?.prep_done || (nextMatch?.match_preps && nextMatch.match_preps.length > 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">This Week</h1>
        <p className="text-gray-400 text-sm mt-1">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Next Match */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Next Match</h2>
        {nextMatch ? (
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-semibold text-white">vs {nextMatch.opponent}</p>
                <p className="text-gray-400 text-sm mt-0.5">
                  {new Date(nextMatch.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                  {' · '}
                  <span className="capitalize">{nextMatch.venue}</span>
                </p>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                daysUntilMatch !== null && daysUntilMatch <= 2
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-gray-800 text-gray-400'
              }`}>
                {daysUntilMatch === 0 ? 'Today' : daysUntilMatch === 1 ? 'Tomorrow' : `${daysUntilMatch}d away`}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-3">
              {prepDone ? (
                <span className="flex items-center gap-1.5 text-xs text-green-400">
                  <CheckCircle2 size={14} /> Match prep done
                </span>
              ) : (
                <Link href="/match-prep" className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300">
                  <AlertCircle size={14} /> Match prep needed
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 border-dashed text-center">
            <p className="text-gray-500 text-sm">No upcoming match</p>
            <Link href="/matches" className="text-green-400 text-sm hover:text-green-300 mt-1 inline-block">
              Add a match
            </Link>
          </div>
        )}
      </section>

      {/* Training this week */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Training This Week</h2>
          <Link href="/training" className="text-green-400 text-xs hover:text-green-300">View all</Link>
        </div>
        {trainingSessions && trainingSessions.length > 0 ? (
          <div className="space-y-2">
            {trainingSessions.map(session => (
              <div key={session.id} className="bg-gray-900 rounded-xl px-4 py-3 border border-gray-800 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{session.objective}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(session.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}
                    {session.time && ` · ${session.time}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                    session.intensity === 'high' ? 'bg-red-500/20 text-red-400' :
                    session.intensity === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {session.intensity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 border-dashed text-center">
            <p className="text-gray-500 text-sm">No sessions planned</p>
            <Link href="/training" className="text-green-400 text-sm hover:text-green-300 mt-1 inline-block">
              Plan training
            </Link>
          </div>
        )}
      </section>

      {/* Squad Status */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Squad Status</h2>
          <Link href="/squad" className="text-green-400 text-xs hover:text-green-300">Manage</Link>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
            <p className="text-2xl font-bold text-green-400">{availablePlayers.length}</p>
            <p className="text-xs text-gray-400 mt-1">Available</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
            <p className="text-2xl font-bold text-red-400">{injuredPlayers.length}</p>
            <p className="text-xs text-gray-400 mt-1">Injured</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
            <p className="text-2xl font-bold text-amber-400">{absentPlayers.length}</p>
            <p className="text-xs text-gray-400 mt-1">Absent</p>
          </div>
        </div>
      </section>

      {/* Latest Messages */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Team Hub</h2>
          <Link href="/team-hub" className="text-green-400 text-xs hover:text-green-300">View all</Link>
        </div>
        {recentMessages && recentMessages.length > 0 ? (
          <div className="space-y-2">
            {recentMessages.map((msg: { id: string; content: string; created_at: string; profiles?: { name: string } | null }) => (
              <div key={msg.id} className="bg-gray-900 rounded-xl px-4 py-3 border border-gray-800">
                <p className="text-sm text-white line-clamp-2">{msg.content}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(msg.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 border-dashed text-center">
            <p className="text-gray-500 text-sm">No messages yet</p>
            <Link href="/team-hub" className="text-green-400 text-sm hover:text-green-300 mt-1 inline-block">
              Post to squad
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}
