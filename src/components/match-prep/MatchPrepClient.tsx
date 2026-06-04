'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Match, MatchPrep } from '@/types'
import { Plus, X, ChevronDown, ChevronUp, CheckCircle2, FileText } from 'lucide-react'

type MatchWithPrep = Match & { match_preps: MatchPrep[] }

const FORMATIONS = ['4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '3-4-3', '5-3-2', '4-1-4-1', '4-5-1', '4-4-1-1']

export default function MatchPrepClient({ matches, teamId }: { matches: MatchWithPrep[]; teamId: string | null | undefined }) {
  const [showMatchForm, setShowMatchForm] = useState(false)
  const [activePrepId, setActivePrepId] = useState<string | null>(null)
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const [matchForm, setMatchForm] = useState<{ opponent: string; date: string; venue: 'home' | 'away' | 'neutral' }>({ opponent: '', date: '', venue: 'home' })
  const [prepForm, setPrepForm] = useState({
    opponent_formation: '', opponent_style: '', opponent_strengths: '',
    opponent_weaknesses: '', key_players: '', set_piece_tendencies: '',
  })

  async function createMatch(e: React.FormEvent) {
    e.preventDefault()
    if (!teamId) return
    await supabase.from('matches').insert({ team_id: teamId, ...matchForm, prep_done: false })
    setMatchForm({ opponent: '', date: '', venue: 'home' })
    setShowMatchForm(false)
    router.refresh()
  }

  async function savePrep(matchId: string) {
    const match = matches.find(m => m.id === matchId)
    const existingPrep = match?.match_preps?.[0]

    const payload = { match_id: matchId, ...prepForm }

    if (existingPrep) {
      await supabase.from('match_preps').update(payload).eq('id', existingPrep.id)
    } else {
      await supabase.from('match_preps').insert(payload)
    }

    await supabase.from('matches').update({ prep_done: true }).eq('id', matchId)
    setActivePrepId(null)
    router.refresh()
  }

  function startPrep(match: MatchWithPrep) {
    const existing = match.match_preps?.[0]
    setPrepForm({
      opponent_formation: existing?.opponent_formation ?? '',
      opponent_style: existing?.opponent_style ?? '',
      opponent_strengths: existing?.opponent_strengths ?? '',
      opponent_weaknesses: existing?.opponent_weaknesses ?? '',
      key_players: existing?.key_players ?? '',
      set_piece_tendencies: existing?.set_piece_tendencies ?? '',
    })
    setActivePrepId(match.id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Match Preparation</h1>
          <p className="text-gray-400 text-sm mt-0.5">Scout your opponents, prepare your squad</p>
        </div>
        <button
          onClick={() => setShowMatchForm(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} /> Add Match
        </button>
      </div>

      {showMatchForm && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">New Match</h2>
            <button onClick={() => setShowMatchForm(false)} className="text-gray-500 hover:text-white"><X size={18} /></button>
          </div>
          <form onSubmit={createMatch} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Opponent *</label>
                <input value={matchForm.opponent} onChange={e => setMatchForm({ ...matchForm, opponent: e.target.value })} required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" placeholder="Team name" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Date *</label>
                <input type="date" value={matchForm.date} onChange={e => setMatchForm({ ...matchForm, date: e.target.value })} required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Venue</label>
                <select value={matchForm.venue} onChange={e => setMatchForm({ ...matchForm, venue: e.target.value as 'home' | 'away' | 'neutral' })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500">
                  <option value="home">Home</option>
                  <option value="away">Away</option>
                  <option value="neutral">Neutral</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg">Add Match</button>
              <button type="button" onClick={() => setShowMatchForm(false)} className="text-gray-400 text-sm px-4 py-2.5 hover:text-white">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {matches.length === 0 && (
        <div className="text-center py-12 text-gray-500">No upcoming matches. Add one to start preparing.</div>
      )}

      <div className="space-y-3">
        {matches.map(match => {
          const prep = match.match_preps?.[0]
          const isActive = activePrepId === match.id
          const isExpanded = expandedMatch === match.id
          const daysAway = Math.ceil((new Date(match.date).getTime() - Date.now()) / 86400000)

          return (
            <div key={match.id} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="px-4 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-white">vs {match.opponent}</h3>
                      {match.prep_done && <CheckCircle2 size={16} className="text-green-400" />}
                    </div>
                    <p className="text-gray-400 text-sm mt-0.5">
                      {new Date(match.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {' · '}
                      <span className="capitalize">{match.venue}</span>
                      {' · '}
                      <span className={daysAway <= 2 ? 'text-red-400' : 'text-gray-400'}>
                        {daysAway === 0 ? 'Today' : daysAway === 1 ? 'Tomorrow' : `${daysAway}d`}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {prep && (
                      <button onClick={() => setExpandedMatch(isExpanded ? null : match.id)} className="text-gray-500 hover:text-white">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    )}
                    <button
                      onClick={() => isActive ? setActivePrepId(null) : startPrep(match)}
                      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                        match.prep_done
                          ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                          : 'bg-green-600 text-white hover:bg-green-500'
                      }`}
                    >
                      <FileText size={13} />
                      {match.prep_done ? 'Edit Prep' : 'Start Prep'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Brief view */}
              {isExpanded && prep && (
                <div className="border-t border-gray-800 px-4 py-4 space-y-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Match Brief</h4>
                  {prep.opponent_formation && (
                    <div><span className="text-xs text-gray-500">Formation: </span><span className="text-sm text-white">{prep.opponent_formation}</span></div>
                  )}
                  {prep.opponent_style && (
                    <div><span className="text-xs text-gray-500">Style: </span><span className="text-sm text-white">{prep.opponent_style}</span></div>
                  )}
                  {prep.opponent_strengths && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Strengths</p>
                      <p className="text-sm text-white">{prep.opponent_strengths}</p>
                    </div>
                  )}
                  {prep.opponent_weaknesses && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Weaknesses</p>
                      <p className="text-sm text-white">{prep.opponent_weaknesses}</p>
                    </div>
                  )}
                  {prep.key_players && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Key Players to Watch</p>
                      <p className="text-sm text-white">{prep.key_players}</p>
                    </div>
                  )}
                  {prep.set_piece_tendencies && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Set Pieces</p>
                      <p className="text-sm text-white">{prep.set_piece_tendencies}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Prep form */}
              {isActive && (
                <div className="border-t border-gray-800 px-4 py-4 space-y-4">
                  <h4 className="text-sm font-semibold text-white">Opponent Analysis — {match.opponent}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Formation</label>
                      <select value={prepForm.opponent_formation} onChange={e => setPrepForm({ ...prepForm, opponent_formation: e.target.value })}
                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500">
                        <option value="">Select</option>
                        {FORMATIONS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Playing Style</label>
                      <input value={prepForm.opponent_style} onChange={e => setPrepForm({ ...prepForm, opponent_style: e.target.value })}
                        placeholder="e.g. High press, direct play"
                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Strengths</label>
                      <textarea value={prepForm.opponent_strengths} onChange={e => setPrepForm({ ...prepForm, opponent_strengths: e.target.value })}
                        rows={3} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Weaknesses</label>
                      <textarea value={prepForm.opponent_weaknesses} onChange={e => setPrepForm({ ...prepForm, opponent_weaknesses: e.target.value })}
                        rows={3} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Key Players to Watch</label>
                      <textarea value={prepForm.key_players} onChange={e => setPrepForm({ ...prepForm, key_players: e.target.value })}
                        rows={2} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Set-Piece Tendencies</label>
                      <textarea value={prepForm.set_piece_tendencies} onChange={e => setPrepForm({ ...prepForm, set_piece_tendencies: e.target.value })}
                        rows={2} className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none" />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button onClick={() => savePrep(match.id)} className="bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg">
                      Save Match Brief
                    </button>
                    <button onClick={() => setActivePrepId(null)} className="text-gray-400 text-sm px-4 py-2.5 hover:text-white">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
