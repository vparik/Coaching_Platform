'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft } from 'lucide-react'

interface ClaimablePlayer {
  id: string
  name: string
  position: string
  was_member: boolean
}

export default function ClaimPage() {
  const [players, setPlayers] = useState<ClaimablePlayer[]>([])
  const [teamName, setTeamName] = useState('')
  const [defaultName, setDefaultName] = useState('')
  const [confirming, setConfirming] = useState<ClaimablePlayer | null>(null)
  const [addingMyself, setAddingMyself] = useState(false)
  const [myName, setMyName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('player_id, team_id, name')
        .eq('id', user.id)
        .single()

      if (profile?.player_id) { router.replace('/'); return }
      if (!profile?.team_id) {
        setError('Your join code was not linked to a team. Sign out and try again with the correct code.')
        setLoading(false)
        return
      }

      const { data: team } = await supabase
        .from('teams')
        .select('name')
        .eq('id', profile.team_id)
        .single()
      if (team?.name) setTeamName(team.name)

      setDefaultName(profile.name || '')
      setMyName(profile.name || '')

      const { data, error: rpcError } = await supabase.rpc('get_claimable_players')
      if (rpcError) {
        setError(`Could not load squad list: ${rpcError.message}`)
      } else {
        setPlayers(data || [])
      }

      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function claim(playerId: string | null) {
    setSaving(true)
    setError('')
    const { error: rpcError } = await supabase.rpc('claim_player_record', {
      p_player_id: playerId,
      p_name: playerId ? null : myName,
    })
    if (rpcError) {
      setError(rpcError.message)
      setSaving(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    )
  }

  const active = players.filter(p => !p.was_member)
  const former = players.filter(p => p.was_member)

  // ── Confirmation screen ────────────────────────────────────────────────────
  if (confirming) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-4xl mb-2">⚽</div>
            <h1 className="text-2xl font-bold text-white">Is this you?</h1>
            <p className="text-gray-400 text-sm mt-1">Confirm before linking your account</p>
          </div>

          <div className="bg-gray-900 border border-green-600/50 rounded-xl px-5 py-4 mb-6 text-center">
            <p className="text-lg font-semibold text-white">{confirming.name}</p>
            {confirming.position && <p className="text-sm text-gray-400 mt-0.5">{confirming.position}</p>}
          </div>

          {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}

          <div className="space-y-3">
            <button
              onClick={() => claim(confirming.id)}
              disabled={saving}
              className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {saving ? 'Linking...' : 'Yes, that\'s me'}
            </button>
            <button
              onClick={() => setConfirming(null)}
              disabled={saving}
              className="w-full flex items-center justify-center gap-1.5 text-gray-400 hover:text-white text-sm py-2.5 rounded-lg transition-colors"
            >
              <ChevronLeft size={15} /> Back to list
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Player list ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">⚽</div>
          <h1 className="text-2xl font-bold text-white">Who are you?</h1>
          <p className="text-gray-400 text-sm mt-1">
            {teamName ? `Select your name from ${teamName}` : 'Select your name from the squad'}
          </p>
        </div>

        {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}

        <div className="space-y-2 mb-3">
          {active.map(player => (
            <button
              key={player.id}
              onClick={() => { setConfirming(player); setAddingMyself(false) }}
              className="w-full flex items-center justify-between bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-green-600 text-left px-4 py-3 rounded-lg transition-colors"
            >
              <div>
                <p className="text-white font-medium">{player.name}</p>
                {player.position && <p className="text-xs text-gray-400">{player.position}</p>}
              </div>
            </button>
          ))}

          {former.length > 0 && (
            <>
              <p className="text-xs text-gray-500 pt-2 pb-1 px-1">Previously on this team</p>
              {former.map(player => (
                <button
                  key={player.id}
                  onClick={() => { setConfirming(player); setAddingMyself(false) }}
                  className="w-full flex items-center justify-between bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-green-600 text-left px-4 py-3 rounded-lg transition-colors"
                >
                  <div>
                    <p className="text-white font-medium">{player.name}</p>
                    {player.position && <p className="text-xs text-gray-400">{player.position}</p>}
                  </div>
                </button>
              ))}
            </>
          )}

          {players.length === 0 && !addingMyself && !error && (
            <p className="text-center text-gray-500 text-sm py-4">
              No squad members listed yet — add yourself below.
            </p>
          )}
        </div>

        {!addingMyself ? (
          <button
            onClick={() => setAddingMyself(true)}
            className="w-full border border-dashed border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 py-3 rounded-lg text-sm transition-colors"
          >
            + I&apos;m not listed — add myself
          </button>
        ) : (
          <div className="space-y-3 mt-2 pt-4 border-t border-gray-800">
            <p className="text-sm text-gray-400">Your name as it will appear to the coach:</p>
            <input
              type="text"
              value={myName}
              onChange={e => setMyName(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-green-500 transition-colors"
              placeholder={defaultName || 'Full name'}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAddingMyself(false)}
                className="flex-1 border border-gray-700 text-gray-400 py-2.5 rounded-lg text-sm hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => claim(null)}
                disabled={saving || !myName.trim()}
                className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
              >
                {saving ? 'Joining...' : 'Join'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
