'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Player, UserRole } from '@/types'
import { Plus, X, ChevronDown, ChevronUp, Pencil, Copy, Check, UserX, UserCheck, Link2Off } from 'lucide-react'

const STATUS_COLORS = {
  available: 'bg-green-500/20 text-green-400',
  injured: 'bg-red-500/20 text-red-400',
  absent: 'bg-amber-500/20 text-amber-400',
  unknown: 'bg-gray-700 text-gray-400',
}

const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST', 'CF']

type PlayerForm = {
  name: string; position: string; age: string; preferred_foot: string
  nationality: string; private_notes: string; availability_status: string
}

function emptyForm(): PlayerForm {
  return { name: '', position: '', age: '', preferred_foot: '', nationality: '', private_notes: '', availability_status: 'available' }
}

export default function SquadClient({
  players, teamId, role, joinCode, linkedPlayerIds,
}: {
  players: Player[]
  teamId: string | null | undefined
  role: UserRole
  joinCode: string | null
  linkedPlayerIds: string[]
}) {
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState<PlayerForm>(emptyForm)
  const router = useRouter()
  const supabase = createClient()
  const linkedSet = new Set(linkedPlayerIds)

  function resetForm() {
    setForm(emptyForm())
    setEditingPlayer(null)
    setShowForm(false)
  }

  function startEdit(player: Player) {
    setForm({
      name: player.name,
      position: player.position,
      age: player.age?.toString() ?? '',
      preferred_foot: player.preferred_foot ?? '',
      nationality: player.nationality ?? '',
      private_notes: player.private_notes ?? '',
      availability_status: player.availability_status,
    })
    setEditingPlayer(player)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      team_id: teamId,
      name: form.name,
      position: form.position,
      age: form.age ? parseInt(form.age) : null,
      preferred_foot: form.preferred_foot || null,
      nationality: form.nationality || null,
      private_notes: role === 'coach' ? (form.private_notes || null) : undefined,
      availability_status: form.availability_status,
    }
    if (editingPlayer) {
      await supabase.from('players').update(payload).eq('id', editingPlayer.id)
    } else {
      await supabase.from('players').insert(payload)
    }
    resetForm()
    router.refresh()
  }

  async function removePlayer(id: string) {
    if (!confirm('Remove this player from the team? Their history will be preserved.')) return
    await supabase.rpc('remove_player_from_team', { p_player_id: id })
    router.refresh()
  }

  async function unlinkPlayer(id: string) {
    if (!confirm('Unlink this player\'s account? They will need to re-claim their profile.')) return
    await supabase.rpc('unlink_player_account', { p_player_id: id })
    router.refresh()
  }

  async function updateStatus(id: string, status: Player['availability_status']) {
    await supabase.from('players').update({ availability_status: status }).eq('id', id)
    router.refresh()
  }

  async function copyJoinCode() {
    if (!joinCode) return
    await navigator.clipboard.writeText(joinCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Player view ────────────────────────────────────────────────────────────
  if (role === 'player') {
    const player = players[0]
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">My Profile</h1>
          <p className="text-gray-400 text-sm mt-0.5">Your squad record</p>
        </div>

        {!player ? (
          <p className="text-gray-500">No player profile linked.</p>
        ) : showForm ? (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">Edit Profile</h2>
              <button onClick={resetForm} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs text-gray-400 mb-1">Name *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Position *</label>
                  <select value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} required
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500">
                    <option value="">Select</option>
                    {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Age</label>
                  <input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Preferred Foot</label>
                  <select value={form.preferred_foot} onChange={e => setForm({ ...form, preferred_foot: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500">
                    <option value="">—</option>
                    <option value="right">Right</option>
                    <option value="left">Left</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Nationality</label>
                  <input value={form.nationality} onChange={e => setForm({ ...form, nationality: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" className="bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">Save</button>
                <button type="button" onClick={resetForm} className="text-gray-400 hover:text-white text-sm px-4 py-2.5 rounded-lg transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white">
                  {player.position}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{player.name}</p>
                  <p className="text-xs text-gray-400">
                    {[
                      player.age ? `${player.age} yrs` : null,
                      player.nationality,
                      player.preferred_foot ? `${player.preferred_foot} foot` : null,
                    ].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
              <select
                value={player.availability_status}
                onChange={e => updateStatus(player.id, e.target.value as Player['availability_status'])}
                className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none ${STATUS_COLORS[player.availability_status]} bg-transparent`}
              >
                <option value="available">Available</option>
                <option value="injured">Injured</option>
                <option value="absent">Absent</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
            <div className="border-t border-gray-800 px-4 py-3">
              <button onClick={() => startEdit(player)} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300">
                <Pencil size={13} /> Edit Profile
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Coach view ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Squad</h1>
          <p className="text-gray-400 text-sm mt-0.5">{players.length} players</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} /> Add Player
        </button>
      </div>

      {joinCode && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Team Join Code — share with players</p>
            <p className="text-lg font-mono font-bold text-green-400 tracking-widest">{joinCode}</p>
          </div>
          <button
            onClick={copyJoinCode}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}

      {showForm && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">{editingPlayer ? 'Edit Player' : 'New Player'}</h2>
            <button onClick={resetForm} className="text-gray-500 hover:text-white"><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Position *</label>
                <select value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500">
                  <option value="">Select</option>
                  {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Age</label>
                <input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Preferred Foot</label>
                <select value={form.preferred_foot} onChange={e => setForm({ ...form, preferred_foot: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500">
                  <option value="">—</option>
                  <option value="right">Right</option>
                  <option value="left">Left</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nationality</label>
                <input value={form.nationality} onChange={e => setForm({ ...form, nationality: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Status</label>
                <select value={form.availability_status} onChange={e => setForm({ ...form, availability_status: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500">
                  <option value="available">Available</option>
                  <option value="injured">Injured</option>
                  <option value="absent">Absent</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Private Notes (coach only)</label>
                <textarea value={form.private_notes} onChange={e => setForm({ ...form, private_notes: e.target.value })} rows={3}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" className="bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
                {editingPlayer ? 'Save Changes' : 'Add Player'}
              </button>
              <button type="button" onClick={resetForm} className="text-gray-400 hover:text-white text-sm px-4 py-2.5 rounded-lg transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-2">
        {players.length === 0 && (
          <div className="text-center py-12 text-gray-500">No players yet. Add your first player.</div>
        )}
        {players.map(player => (
          <div key={player.id} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white">
                  {player.position}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">{player.name}</p>
                    {linkedSet.has(player.id) ? (
                      <span className="flex items-center gap-1 text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-full">
                        <UserCheck size={9} /> linked
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded-full">no account</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{player.age ? `${player.age} yrs` : ''}{player.nationality ? ` · ${player.nationality}` : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={player.availability_status}
                  onChange={e => updateStatus(player.id, e.target.value as Player['availability_status'])}
                  className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none ${STATUS_COLORS[player.availability_status]} bg-transparent`}
                >
                  <option value="available">Available</option>
                  <option value="injured">Injured</option>
                  <option value="absent">Absent</option>
                  <option value="unknown">Unknown</option>
                </select>
                <button onClick={() => setExpanded(expanded === player.id ? null : player.id)} className="text-gray-500 hover:text-white">
                  {expanded === player.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            </div>
            {expanded === player.id && (
              <div className="border-t border-gray-800 px-4 py-3 space-y-3">
                {player.private_notes && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Private Notes</p>
                    <p className="text-sm text-gray-300">{player.private_notes}</p>
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => startEdit(player)} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300">
                    <Pencil size={13} /> Edit
                  </button>
                  {linkedSet.has(player.id) && (
                    <button onClick={() => unlinkPlayer(player.id)} className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300">
                      <Link2Off size={13} /> Unlink account
                    </button>
                  )}
                  <button onClick={() => removePlayer(player.id)} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300">
                    <UserX size={13} /> Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
