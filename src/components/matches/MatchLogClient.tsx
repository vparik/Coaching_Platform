'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Match, PlayerRating, UserRole } from '@/types'
import { Plus, X, ChevronDown, ChevronUp, Pencil } from 'lucide-react'

interface PlayerBasic { id: string; name: string; position: string }

export default function MatchLogClient({
  matches, players, ratings, teamId, role = 'coach', playerId = null,
}: {
  matches: Match[]
  players: PlayerBasic[]
  ratings: PlayerRating[]
  teamId: string | null | undefined
  role?: UserRole
  playerId?: string | null
}) {
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [ratingMatch, setRatingMatch] = useState<string | null>(null)
  const [playerRatings, setPlayerRatings] = useState<Record<string, number>>({})
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({ opponent: '', date: '', venue: 'home', result: '', notes: '' })

  function reset() {
    setForm({ opponent: '', date: '', venue: 'home', result: '', notes: '' })
    setShowForm(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!teamId) return
    await supabase.from('matches').insert({
      team_id: teamId,
      opponent: form.opponent,
      date: form.date,
      venue: form.venue,
      result: form.result || null,
      notes: form.notes || null,
      prep_done: false,
    })
    reset()
    router.refresh()
  }

  function startRatings(matchId: string) {
    const existing = ratings.filter(r => r.match_id === matchId)
    const init: Record<string, number> = {}
    existing.forEach(r => { init[r.player_id] = r.rating })
    setPlayerRatings(init)
    setRatingMatch(matchId)
  }

  async function saveRatings(matchId: string) {
    await supabase.from('player_ratings').delete().eq('match_id', matchId)

    const inserts = Object.entries(playerRatings)
      .filter(([, rating]) => rating > 0)
      .map(([player_id, rating]) => ({ match_id: matchId, player_id, rating }))

    if (inserts.length > 0) {
      await supabase.from('player_ratings').insert(inserts)
    }

    setRatingMatch(null)
    router.refresh()
  }

  function getResult(result: string | null) {
    if (!result) return null
    const parts = result.split('-').map(Number)
    if (parts.length !== 2) return null
    if (parts[0] > parts[1]) return { label: 'W', color: 'text-green-400 bg-green-500/20' }
    if (parts[0] < parts[1]) return { label: 'L', color: 'text-red-400 bg-red-500/20' }
    return { label: 'D', color: 'text-amber-400 bg-amber-500/20' }
  }

  const past = matches.filter(m => m.date < new Date().toISOString().split('T')[0])
  const upcoming = matches.filter(m => m.date >= new Date().toISOString().split('T')[0])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Match Log</h1>
          <p className="text-gray-400 text-sm mt-0.5">{matches.length} matches total</p>
        </div>
        {role === 'coach' && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} /> Add Match
          </button>
        )}
      </div>

      {showForm && role === 'coach' && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Add Match</h2>
            <button onClick={reset} className="text-gray-500 hover:text-white"><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Opponent *</label>
                <input value={form.opponent} onChange={e => setForm({ ...form, opponent: e.target.value })} required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Date *</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Venue</label>
                <select value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500">
                  <option value="home">Home</option>
                  <option value="away">Away</option>
                  <option value="neutral">Neutral</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Result (e.g. 2-1)</label>
                <input value={form.result} onChange={e => setForm({ ...form, result: e.target.value })} placeholder="2-1"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Notes</label>
                <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg">Add Match</button>
              <button type="button" onClick={reset} className="text-gray-400 text-sm px-4 py-2.5 hover:text-white">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Upcoming</h2>
          <MatchList matches={upcoming} players={players} ratings={ratings} expanded={expanded} ratingMatch={ratingMatch}
            playerRatings={playerRatings} setExpanded={setExpanded} startRatings={startRatings} saveRatings={saveRatings}
            setPlayerRatings={setPlayerRatings} setRatingMatch={setRatingMatch} getResult={getResult} role={role} playerId={playerId} />
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Past Matches</h2>
          <MatchList matches={past} players={players} ratings={ratings} expanded={expanded} ratingMatch={ratingMatch}
            playerRatings={playerRatings} setExpanded={setExpanded} startRatings={startRatings} saveRatings={saveRatings}
            setPlayerRatings={setPlayerRatings} setRatingMatch={setRatingMatch} getResult={getResult} role={role} playerId={playerId} />
        </section>
      )}

      {matches.length === 0 && (
        <div className="text-center py-12 text-gray-500">No matches logged yet.</div>
      )}
    </div>
  )
}

function MatchList({
  matches, players, ratings, expanded, ratingMatch, playerRatings,
  setExpanded, startRatings, saveRatings, setPlayerRatings, setRatingMatch, getResult,
  role = 'coach', playerId = null,
}: {
  matches: Match[]
  players: PlayerBasic[]
  ratings: PlayerRating[]
  expanded: string | null
  ratingMatch: string | null
  playerRatings: Record<string, number>
  setExpanded: (id: string | null) => void
  startRatings: (id: string) => void
  saveRatings: (id: string) => void
  setPlayerRatings: React.Dispatch<React.SetStateAction<Record<string, number>>>
  setRatingMatch: (id: string | null) => void
  getResult: (r: string | null) => { label: string; color: string } | null
  role?: UserRole
  playerId?: string | null
}) {
  return (
    <div className="space-y-2">
      {matches.map(match => {
        const resultInfo = getResult(match.result)
        const matchRatings = ratings.filter(r => r.match_id === match.id)
        const isExpanded = expanded === match.id
        const isRating = ratingMatch === match.id

        return (
          <div key={match.id} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                {resultInfo ? (
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${resultInfo.color}`}>
                    {resultInfo.label}
                  </span>
                ) : (
                  <span className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs text-gray-500">–</span>
                )}
                <div>
                  <p className="text-sm font-medium text-white">
                    vs {match.opponent}
                    {match.result && <span className="text-gray-400 font-normal ml-2">{match.result}</span>}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(match.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}
                    <span className="capitalize">{match.venue}</span>
                  </p>
                </div>
              </div>
              <button onClick={() => setExpanded(isExpanded ? null : match.id)} className="text-gray-500 hover:text-white">
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>

            {isExpanded && (
              <div className="border-t border-gray-800 px-4 py-3 space-y-4">
                {match.notes && <p className="text-sm text-gray-300">{match.notes}</p>}

                {role === 'player' ? (
                  (() => {
                    const myRating = matchRatings.find(r => r.player_id === playerId)
                    return myRating ? (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Your Rating</p>
                        <p className="text-2xl font-bold text-white">{myRating.rating}<span className="text-sm text-gray-500 font-normal">/10</span></p>
                        {myRating.notes && <p className="text-xs text-gray-400 mt-1">{myRating.notes}</p>}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-600">No rating yet</p>
                    )
                  })()
                ) : (
                  <>
                    {matchRatings.length > 0 && !isRating && (
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Player Ratings</p>
                        <div className="grid grid-cols-2 gap-2">
                          {matchRatings.map(r => {
                            const player = players.find(p => p.id === r.player_id)
                            return (
                              <div key={r.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-1.5">
                                <span className="text-xs text-gray-300">{player?.name ?? '?'}</span>
                                <span className="text-xs font-semibold text-white">{r.rating}/10</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {isRating ? (
                      <div className="space-y-3">
                        <p className="text-xs text-gray-500">Rate Players (1–10, leave 0 to skip)</p>
                        <div className="grid grid-cols-2 gap-3">
                          {players.map(p => (
                            <div key={p.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                              <span className="text-xs text-gray-300">{p.name}</span>
                              <input
                                type="number" min={0} max={10}
                                value={playerRatings[p.id] ?? 0}
                                onChange={e => setPlayerRatings(prev => ({ ...prev, [p.id]: parseInt(e.target.value) || 0 }))}
                                className="w-12 bg-gray-700 text-white text-xs text-center rounded px-2 py-1 focus:outline-none"
                              />
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-3">
                          <button onClick={() => saveRatings(match.id)} className="bg-green-600 hover:bg-green-500 text-white text-xs font-medium px-4 py-2 rounded-lg">Save Ratings</button>
                          <button onClick={() => setRatingMatch(null)} className="text-gray-400 text-xs px-3 py-2 hover:text-white">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => startRatings(match.id)} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300">
                        <Pencil size={12} /> {matchRatings.length > 0 ? 'Edit Ratings' : 'Add Ratings'}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

interface PlayerBasic { id: string; name: string; position: string }
