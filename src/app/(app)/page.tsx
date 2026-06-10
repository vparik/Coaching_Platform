import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Calendar, Users, Target, AlertCircle, CheckCircle2, Clock } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('team_id, role')
    .eq('id', user!.id)
    .single()

  const teamId = profile?.team_id
  const isPlayer = profile?.role === 'player'

  const today = new Date().toISOString().split('T')[0]

  // Current week Mon–Sun (UTC)
  const utcDay = new Date().getUTCDay()
  const weekStartMs = Date.now() - (utcDay === 0 ? 6 : utcDay - 1) * 86400000
  const weekStartStr = new Date(weekStartMs).toISOString().split('T')[0]
  const weekEndStr = new Date(weekStartMs + 6 * 86400000).toISOString().split('T')[0]
  const weekDays = Array.from({ length: 7 }, (_, i) =>
    new Date(new Date(weekStartStr + 'T00:00:00Z').getTime() + i * 86400000).toISOString().split('T')[0]
  )

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
      .gte('date', weekStartStr)
      .lte('date', weekEndStr)
      .order('date', { ascending: true }),
    supabase
      .from('players')
      .select('*')
      .eq('team_id', teamId)
      .is('left_at', null),
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

  const sessionsByDate = (trainingSessions ?? []).reduce<Record<string, { id: string; intensity: string; objective: string; time: string | null }[]>>((acc, s) => {
    if (!acc[s.date]) acc[s.date] = []
    acc[s.date].push(s)
    return acc
  }, {})

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
              ) : isPlayer ? (
                <span className="flex items-center gap-1.5 text-xs text-amber-400">
                  <AlertCircle size={14} /> Prep not ready yet
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
            {!isPlayer && (
              <Link href="/matches" className="text-green-400 text-sm hover:text-green-300 mt-1 inline-block">
                Add a match
              </Link>
            )}
          </div>
        )}
      </section>

      {/* Training this week — mini calendar */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Training This Week</h2>
          <Link href="/training" className="text-green-400 text-xs hover:text-green-300">View all</Link>
        </div>
        <Link href="/training" className="block group">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 group-hover:border-gray-700 transition-colors">
            <div className="grid grid-cols-7 gap-1.5">
              {weekDays.map(dateStr => {
                const daySessions = sessionsByDate[dateStr] ?? []
                const isToday = dateStr === today
                const isPast = dateStr < today
                const isMatchDay = nextMatch?.date === dateStr
                const dayDate = new Date(dateStr + 'T12:00:00')
                const dayLabel = dayDate.toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 2)

                return (
                  <div key={dateStr} className="flex flex-col min-h-[80px]">
                    {/* Day header */}
                    <div className={`text-center pb-1.5 mb-1.5 border-b ${isToday ? 'border-green-500/40' : 'border-gray-800'}`}>
                      <p className="text-[10px] font-medium text-gray-600 uppercase">{dayLabel}</p>
                      <p className={`text-sm font-bold leading-tight ${isToday ? 'text-green-400' : isPast ? 'text-gray-600' : 'text-gray-300'}`}>
                        {dayDate.getDate()}
                      </p>
                      {isMatchDay && <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 mt-0.5" />}
                    </div>

                    {/* Session blocks */}
                    <div className="flex flex-col gap-1">
                      {daySessions.map((s, i) => (
                        <div key={i} className={`rounded px-1 py-1 ${
                          s.intensity === 'high'   ? 'bg-red-500/15 border border-red-500/20' :
                          s.intensity === 'medium' ? 'bg-amber-500/15 border border-amber-500/20' :
                                                     'bg-blue-500/15 border border-blue-500/20'
                        }`}>
                          <p className="text-[10px] text-white leading-tight line-clamp-2 break-words">{s.objective}</p>
                          {s.time && <p className="text-[9px] text-gray-500 mt-0.5">{s.time}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            {(trainingSessions ?? []).length === 0 && (
              <p className="text-xs text-gray-600 text-center mt-2">
                {isPlayer ? 'No sessions this week' : 'No sessions planned — tap to add'}
              </p>
            )}
          </div>
        </Link>
      </section>

      {/* Squad Status */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Squad Status</h2>
          {!isPlayer && <Link href="/squad" className="text-green-400 text-xs hover:text-green-300">Manage</Link>}
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
            {!isPlayer && (
              <Link href="/team-hub" className="text-green-400 text-sm hover:text-green-300 mt-1 inline-block">
                Post to squad
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
