'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Match, MatchPrep, Player, PlayerPos, LineupStarter } from '@/types'
import { OUR_FORMATIONS, FORMATION_NAMES, mirror } from '@/components/tactics/TacticsClient'
import { Plus, X, Save, Maximize2 } from 'lucide-react'

type SquadPlayer = Pick<Player, 'id' | 'name' | 'position' | 'availability_status'>
type MatchWithPrep = Match & { match_preps: MatchPrep[] }
type DragTarget = { team: 'our' | 'opp'; id: string } | null

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts.length === 1
    ? parts[0].slice(0, 2).toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function isUnavailable(p: SquadPlayer) {
  return p.availability_status === 'injured' || p.availability_status === 'absent'
}

function buildStarters(formation: string, existing?: LineupStarter[] | null): LineupStarter[] {
  const preset = OUR_FORMATIONS[formation] ?? OUR_FORMATIONS['4-4-2']
  return preset.map(slot => ({
    ...slot,
    player_id: existing?.find(e => e.id === slot.id)?.player_id ?? null,
  }))
}

// Sort picker players: those whose stored position matches the slot label appear first.
function partitionByPosition(players: SquadPlayer[], slotLabel: string) {
  const label = slotLabel.toLowerCase()
  const suggested = players.filter(p => p.position?.toLowerCase().includes(label))
  const others = players.filter(p => !p.position?.toLowerCase().includes(label))
  return { suggested, others }
}

// ─── Pitch SVG ────────────────────────────────────────────────────────────────
// Must stay at module level — see docs/implementations/impl-tactics-board.md.

type PitchProps = {
  starters: LineupStarter[]
  oppPositions: PlayerPos[]
  selectedSlotId: string | null
  playerMap: Map<string, SquadPlayer>
  dragging: DragTarget
  onPointerDown: (e: React.PointerEvent<SVGGElement>, team: 'our' | 'opp', id: string) => void
  onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => void
  onPointerUp: (e: React.PointerEvent<SVGSVGElement>) => void
  className?: string
}

function LineupPitchSVG({ starters, oppPositions, selectedSlotId, playerMap, dragging, onPointerDown, onPointerMove, onPointerUp, className }: PitchProps) {
  return (
    <svg
      viewBox="0 0 300 450"
      className={`touch-none select-none w-full ${className ?? ''}`}
      style={{ cursor: dragging ? 'grabbing' : 'default' }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {/* Background */}
      <rect width="300" height="450" fill="#1e5c2a" />
      {[0, 1, 2, 3, 4, 5, 6].map(i => (
        <rect key={i} x="15" y={15 + i * 60} width="270" height="30" fill="rgba(0,0,0,0.08)" />
      ))}

      {/* Pitch markings */}
      <rect x="15" y="15" width="270" height="420" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <line x1="15" y1="225" x2="285" y2="225" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <circle cx="150" cy="225" r="37" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <circle cx="150" cy="225" r="3" fill="rgba(255,255,255,0.55)" />
      {/* Top end */}
      <rect x="70" y="15" width="160" height="66" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <rect x="114" y="15" width="72" height="22" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <rect x="136" y="7" width="28" height="8" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
      <circle cx="150" cy="59" r="2.5" fill="rgba(255,255,255,0.55)" />
      <path d="M 120 81 A 37 37 0 0 0 180 81" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      {/* Bottom end */}
      <rect x="70" y="369" width="160" height="66" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <rect x="114" y="413" width="72" height="22" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <rect x="136" y="435" width="28" height="8" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
      <circle cx="150" cy="391" r="2.5" fill="rgba(255,255,255,0.55)" />
      <path d="M 120 369 A 37 37 0 0 1 180 369" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />

      {/* Opponent circles (red) — rendered under our team */}
      {oppPositions.map(p => (
        <g
          key={`opp-${p.id}`}
          transform={`translate(${p.x * 300} ${p.y * 450})`}
          onPointerDown={e => onPointerDown(e, 'opp', p.id)}
          style={{ cursor: 'grab' }}
        >
          <circle r="14" fill="#dc2626" stroke="white" strokeWidth="1.5" opacity="0.92" />
          <text textAnchor="middle" dominantBaseline="central" fill="white" fontSize="7" fontWeight="bold"
            style={{ pointerEvents: 'none', userSelect: 'none' }}>{p.label}</text>
        </g>
      ))}

      {/* Our team circles (green) */}
      {starters.map(slot => {
        const player = slot.player_id ? playerMap.get(slot.player_id) : null
        const isSelected = selectedSlotId === slot.id
        const unavail = player && isUnavailable(player)

        return (
          <g
            key={`our-${slot.id}`}
            transform={`translate(${slot.x * 300} ${slot.y * 450})`}
            onPointerDown={e => onPointerDown(e, 'our', slot.id)}
            style={{ cursor: 'pointer' }}
          >
            <circle
              r="16"
              fill={player ? '#16a34a' : 'rgba(0,0,0,0.45)'}
              stroke={isSelected ? '#facc15' : player ? 'white' : 'rgba(255,255,255,0.4)'}
              strokeWidth={isSelected ? 2.5 : 1.5}
            />
            {!player && (
              <circle r="16" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeDasharray="3 2" />
            )}
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              fontSize={player ? '8.5' : '7'}
              fontWeight="bold"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {player ? initials(player.name) : slot.label}
            </text>
            {unavail && (
              <circle cx="12" cy="-12" r="5" fill="#f59e0b" stroke="#1e5c2a" strokeWidth="1" />
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LineupPanel({ match, players }: { match: MatchWithPrep; players: SquadPlayer[] }) {
  const prep = match.match_preps?.[0]

  const initOurFormation = prep?.lineup_formation ?? '4-4-2'
  const initOppFormation = prep?.opponent_formation ?? '4-4-2'

  const [ourFormation, setOurFormation] = useState(initOurFormation)
  const [oppFormation, setOppFormation] = useState(initOppFormation)
  const [starters, setStarters] = useState<LineupStarter[]>(() => buildStarters(initOurFormation, prep?.lineup_starters))
  const [oppPositions, setOppPositions] = useState<PlayerPos[]>(() =>
    mirror(OUR_FORMATIONS[initOppFormation] ?? OUR_FORMATIONS['4-4-2'])
  )
  const [subs, setSubs] = useState<string[]>(prep?.lineup_subs ?? [])
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [subPickerOpen, setSubPickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)

  // Unified drag state for both teams
  const [dragging, setDragging] = useState<DragTarget>(null)
  const [dragMoved, setDragMoved] = useState(false)
  const [dragOrigin, setDragOrigin] = useState<{ cx: number; cy: number } | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const playerMap = new Map(players.map(p => [p.id, p]))

  // ── Formation changes ─────────────────────────────────────────────────────────

  function changeOurFormation(f: string) {
    setOurFormation(f)
    setStarters(buildStarters(f, starters))
    setSelectedSlotId(null)
  }

  function changeOppFormation(f: string) {
    setOppFormation(f)
    setOppPositions(mirror(OUR_FORMATIONS[f] ?? OUR_FORMATIONS['4-4-2']))
  }

  // ── Drag + click ─────────────────────────────────────────────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGGElement>, team: 'our' | 'opp', id: string) => {
      e.stopPropagation()
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
      setDragging({ team, id })
      setDragMoved(false)
      setDragOrigin({ cx: e.clientX, cy: e.clientY })
    },
    []
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!dragging || !dragOrigin) return
      const dx = e.clientX - dragOrigin.cx
      const dy = e.clientY - dragOrigin.cy
      if (!dragMoved && Math.sqrt(dx * dx + dy * dy) < 5) return
      setDragMoved(true)
      const rect = e.currentTarget.getBoundingClientRect()
      const x = Math.min(0.97, Math.max(0.03, (e.clientX - rect.left) / rect.width))
      const y = Math.min(0.97, Math.max(0.03, (e.clientY - rect.top) / rect.height))
      if (dragging.team === 'our') {
        setStarters(prev => prev.map(s => s.id === dragging.id ? { ...s, x, y } : s))
      } else {
        setOppPositions(prev => prev.map(p => p.id === dragging.id ? { ...p, x, y } : p))
      }
    },
    [dragging, dragOrigin, dragMoved]
  )

  const handlePointerUp = useCallback(
    (_e: React.PointerEvent<SVGSVGElement>) => {
      // Tap on our circle (no drag) → open picker
      if (!dragMoved && dragging?.team === 'our') {
        setSelectedSlotId(prev => prev === dragging.id ? null : dragging.id)
        setSubPickerOpen(false)
      }
      setDragging(null)
      setDragOrigin(null)
    },
    [dragging, dragMoved]
  )

  // ── Player assignment ─────────────────────────────────────────────────────────

  function assignPlayer(playerId: string) {
    if (!selectedSlotId) return
    setStarters(prev => prev.map(s => {
      if (s.player_id === playerId && s.id !== selectedSlotId) return { ...s, player_id: null }
      if (s.id === selectedSlotId) return { ...s, player_id: playerId }
      return s
    }))
    setSelectedSlotId(null)
  }

  function clearSlot() {
    if (!selectedSlotId) return
    setStarters(prev => prev.map(s => s.id === selectedSlotId ? { ...s, player_id: null } : s))
    setSelectedSlotId(null)
  }

  // ── Bench ─────────────────────────────────────────────────────────────────────

  function addSub(playerId: string) {
    setSubs(prev => [...prev, playerId])
    setSubPickerOpen(false)
  }

  function removeSub(playerId: string) {
    setSubs(prev => prev.filter(id => id !== playerId))
  }

  // ── Save ──────────────────────────────────────────────────────────────────────

  async function save() {
    setSaving(true)
    const payload = { lineup_formation: ourFormation, lineup_starters: starters, lineup_subs: subs }
    if (prep) {
      await supabase.from('match_preps').update(payload).eq('id', prep.id)
    } else {
      await supabase.from('match_preps').insert({ match_id: match.id, ...payload })
    }
    setSaving(false)
    router.refresh()
  }

  // ── Derived values ────────────────────────────────────────────────────────────

  const allAssigned = new Set([
    ...starters.map(s => s.player_id).filter(Boolean) as string[],
    ...subs,
  ])
  const selectedSlot = starters.find(s => s.id === selectedSlotId)
  const pickerCandidates = players.filter(p => !allAssigned.has(p.id) || p.id === selectedSlot?.player_id)
  const { suggested, others } = selectedSlot
    ? partitionByPosition(pickerCandidates, selectedSlot.label)
    : { suggested: [], others: pickerCandidates }
  const availableForSubs = players.filter(p => !allAssigned.has(p.id))

  const pitchProps: Omit<PitchProps, 'className'> = {
    starters, oppPositions, selectedSlotId, playerMap, dragging,
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
  }

  // ── Shared UI blocks ──────────────────────────────────────────────────────────

  const formationSelectors = (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="text-xs font-medium text-green-400 mb-1 block">Your formation</label>
        <select value={ourFormation} onChange={e => changeOurFormation(e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-green-500">
          {FORMATION_NAMES.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-red-400 mb-1 block">Opponent formation</label>
        <select value={oppFormation} onChange={e => changeOppFormation(e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-red-500">
          {FORMATION_NAMES.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
    </div>
  )

  const teamLegend = (
    <div className="grid grid-cols-2 gap-2 text-center text-xs">
      <div className="flex items-center justify-center gap-1.5 text-red-400">
        <span className="w-3 h-3 rounded-full bg-red-600 inline-block" /> Opponent
      </div>
      <div className="flex items-center justify-center gap-1.5 text-green-400">
        <span className="w-3 h-3 rounded-full bg-green-600 inline-block" /> Your team
      </div>
    </div>
  )

  const playerPicker = selectedSlotId && (
    <div className="bg-gray-800 rounded-xl border border-yellow-600/40 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <span className="text-xs font-semibold text-yellow-400">
          {selectedSlot?.label}
          {selectedSlot?.player_id && ` — ${playerMap.get(selectedSlot.player_id)?.name}`}
        </span>
        <div className="flex items-center gap-3">
          {selectedSlot?.player_id && (
            <button onClick={clearSlot} className="text-xs text-gray-400 hover:text-red-400 transition-colors">Clear</button>
          )}
          <button onClick={() => setSelectedSlotId(null)} className="text-gray-500 hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>
      <div className="max-h-44 overflow-y-auto">
        {pickerCandidates.length === 0 ? (
          <p className="text-center text-xs text-gray-500 py-4">All players assigned</p>
        ) : (
          <>
            {suggested.length > 0 && (
              <>
                <p className="px-3 pt-2 pb-1 text-xs text-gray-500 font-medium">Suggested</p>
                {suggested.map(p => <PickerRow key={p.id} player={p} selected={p.id === selectedSlot?.player_id} onSelect={assignPlayer} />)}
              </>
            )}
            {others.length > 0 && (
              <>
                {suggested.length > 0 && <div className="border-t border-gray-700 my-1" />}
                {suggested.length > 0 && <p className="px-3 pt-1 pb-1 text-xs text-gray-500 font-medium">Others</p>}
                {others.map(p => <PickerRow key={p.id} player={p} selected={p.id === selectedSlot?.player_id} onSelect={assignPlayer} />)}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )

  const bench = (
    <div>
      <p className="text-xs text-gray-500 mb-1.5">Bench</p>
      {subs.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {subs.map(pid => {
            const p = playerMap.get(pid)
            return p ? (
              <span key={pid} className="flex items-center gap-1 text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">
                {p.name}
                <button onClick={() => removeSub(pid)} className="text-gray-500 hover:text-white ml-0.5 transition-colors"><X size={10} /></button>
              </span>
            ) : null
          })}
        </div>
      )}
      {availableForSubs.length > 0 && (
        subPickerOpen ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden max-h-36 overflow-y-auto">
            {availableForSubs.map(p => (
              <button key={p.id} onClick={() => addSub(p.id)}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 flex items-center justify-between transition-colors">
                <span>{p.name}</span>
                {isUnavailable(p) && <span className="text-xs text-amber-500">{p.availability_status}</span>}
              </button>
            ))}
          </div>
        ) : (
          <button onClick={() => { setSubPickerOpen(true); setSelectedSlotId(null) }}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
            <Plus size={12} /> Add substitute
          </button>
        )
      )}
    </div>
  )

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="px-3 py-3 space-y-3">
        {formationSelectors}

        {/* Pitch with maximize button */}
        <div className="relative">
          <div className="rounded-xl overflow-hidden border border-gray-800">
            <LineupPitchSVG {...pitchProps} />
          </div>
          <button
            onClick={() => setIsMaximized(true)}
            title="Expand"
            className="absolute top-2 right-2 bg-black/50 hover:bg-black/80 text-white p-1.5 rounded-lg transition-colors z-10"
          >
            <Maximize2 size={15} />
          </button>
        </div>

        {teamLegend}
        {playerPicker}
        {bench}

        <button onClick={save} disabled={saving}
          className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Save size={14} />
          {saving ? 'Saving…' : 'Save Lineup'}
        </button>
      </div>

      {/* ── Fullscreen modal ─────────────────────────────────────────────────── */}
      {isMaximized && (
        <div className="fixed inset-0 bg-black/95 z-50 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <div className="flex flex-col gap-4 p-4 max-w-md mx-auto pb-8">
              <div className="flex items-center justify-between">
                <span className="text-white font-bold text-lg">Lineup — vs {match.opponent}</span>
                <button onClick={() => setIsMaximized(false)} className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                  <X size={22} />
                </button>
              </div>

              {formationSelectors}

              <div className="rounded-xl overflow-hidden border border-gray-800">
                <LineupPitchSVG {...pitchProps} />
              </div>

              {teamLegend}
              {playerPicker}
              {bench}

              <button onClick={save} disabled={saving}
                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                <Save size={14} />
                {saving ? 'Saving…' : 'Save Lineup'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Picker row — extracted to avoid repetition ───────────────────────────────

function PickerRow({ player, selected, onSelect }: { player: SquadPlayer; selected: boolean; onSelect: (id: string) => void }) {
  const unavail = isUnavailable(player)
  return (
    <button
      onClick={() => onSelect(player.id)}
      className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors ${
        selected ? 'bg-green-900/40 text-green-400' : 'hover:bg-gray-700 text-white'
      }`}
    >
      <span>{player.name}</span>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        {player.position && <span>{player.position}</span>}
        {unavail && <span className="text-amber-500">{player.availability_status}</span>}
      </div>
    </button>
  )
}
