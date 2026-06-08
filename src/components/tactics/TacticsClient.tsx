'use client'

import { useState, useCallback } from 'react'
import { Maximize2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Tactic, PlayerPos } from '@/types'

// ─── Formation presets ────────────────────────────────────────────────────────
// Coordinates are relative (0–1). Our team occupies the bottom half (y ~0.53–0.93).
// Opponent positions are the vertical mirror: y_opp = 1 − y_our.

export function mirror(positions: PlayerPos[]): PlayerPos[] {
  return positions.map(p => ({ ...p, y: parseFloat((1 - p.y).toFixed(4)) }))
}

export const OUR_FORMATIONS: Record<string, PlayerPos[]> = {
  '4-4-2': [
    { id: 'GK',  label: 'GK',  x: 0.50, y: 0.93 },
    { id: 'RB',  label: 'RB',  x: 0.82, y: 0.79 },
    { id: 'CB1', label: 'CB',  x: 0.61, y: 0.79 },
    { id: 'CB2', label: 'CB',  x: 0.39, y: 0.79 },
    { id: 'LB',  label: 'LB',  x: 0.18, y: 0.79 },
    { id: 'RM',  label: 'RM',  x: 0.82, y: 0.65 },
    { id: 'CM1', label: 'CM',  x: 0.61, y: 0.65 },
    { id: 'CM2', label: 'CM',  x: 0.39, y: 0.65 },
    { id: 'LM',  label: 'LM',  x: 0.18, y: 0.65 },
    { id: 'ST1', label: 'ST',  x: 0.62, y: 0.55 },
    { id: 'ST2', label: 'ST',  x: 0.38, y: 0.55 },
  ],
  '4-3-3': [
    { id: 'GK',  label: 'GK',  x: 0.50, y: 0.93 },
    { id: 'RB',  label: 'RB',  x: 0.82, y: 0.79 },
    { id: 'CB1', label: 'CB',  x: 0.61, y: 0.79 },
    { id: 'CB2', label: 'CB',  x: 0.39, y: 0.79 },
    { id: 'LB',  label: 'LB',  x: 0.18, y: 0.79 },
    { id: 'CM1', label: 'CM',  x: 0.74, y: 0.67 },
    { id: 'CM2', label: 'CM',  x: 0.50, y: 0.67 },
    { id: 'CM3', label: 'CM',  x: 0.26, y: 0.67 },
    { id: 'RW',  label: 'RW',  x: 0.82, y: 0.55 },
    { id: 'ST',  label: 'ST',  x: 0.50, y: 0.55 },
    { id: 'LW',  label: 'LW',  x: 0.18, y: 0.55 },
  ],
  '4-2-3-1': [
    { id: 'GK',   label: 'GK',  x: 0.50, y: 0.93 },
    { id: 'RB',   label: 'RB',  x: 0.82, y: 0.79 },
    { id: 'CB1',  label: 'CB',  x: 0.61, y: 0.79 },
    { id: 'CB2',  label: 'CB',  x: 0.39, y: 0.79 },
    { id: 'LB',   label: 'LB',  x: 0.18, y: 0.79 },
    { id: 'CDM1', label: 'CDM', x: 0.62, y: 0.70 },
    { id: 'CDM2', label: 'CDM', x: 0.38, y: 0.70 },
    { id: 'RAM',  label: 'CAM', x: 0.74, y: 0.61 },
    { id: 'CAM',  label: 'CAM', x: 0.50, y: 0.61 },
    { id: 'LAM',  label: 'CAM', x: 0.26, y: 0.61 },
    { id: 'ST',   label: 'ST',  x: 0.50, y: 0.53 },
  ],
  '3-5-2': [
    { id: 'GK',  label: 'GK',  x: 0.50, y: 0.93 },
    { id: 'CB1', label: 'CB',  x: 0.68, y: 0.80 },
    { id: 'CB2', label: 'CB',  x: 0.50, y: 0.80 },
    { id: 'CB3', label: 'CB',  x: 0.32, y: 0.80 },
    { id: 'RWB', label: 'RWB', x: 0.88, y: 0.68 },
    { id: 'CM1', label: 'CM',  x: 0.68, y: 0.65 },
    { id: 'CM2', label: 'CM',  x: 0.50, y: 0.65 },
    { id: 'CM3', label: 'CM',  x: 0.32, y: 0.65 },
    { id: 'LWB', label: 'LWB', x: 0.12, y: 0.68 },
    { id: 'ST1', label: 'ST',  x: 0.62, y: 0.55 },
    { id: 'ST2', label: 'ST',  x: 0.38, y: 0.55 },
  ],
  '5-3-2': [
    { id: 'GK',  label: 'GK',  x: 0.50, y: 0.93 },
    { id: 'RWB', label: 'RWB', x: 0.88, y: 0.80 },
    { id: 'CB1', label: 'CB',  x: 0.71, y: 0.80 },
    { id: 'CB2', label: 'CB',  x: 0.50, y: 0.80 },
    { id: 'CB3', label: 'CB',  x: 0.29, y: 0.80 },
    { id: 'LWB', label: 'LWB', x: 0.12, y: 0.80 },
    { id: 'CM1', label: 'CM',  x: 0.68, y: 0.67 },
    { id: 'CM2', label: 'CM',  x: 0.50, y: 0.67 },
    { id: 'CM3', label: 'CM',  x: 0.32, y: 0.67 },
    { id: 'ST1', label: 'ST',  x: 0.62, y: 0.55 },
    { id: 'ST2', label: 'ST',  x: 0.38, y: 0.55 },
  ],
  '4-1-4-1': [
    { id: 'GK',  label: 'GK',  x: 0.50, y: 0.93 },
    { id: 'RB',  label: 'RB',  x: 0.82, y: 0.81 },
    { id: 'CB1', label: 'CB',  x: 0.61, y: 0.81 },
    { id: 'CB2', label: 'CB',  x: 0.39, y: 0.81 },
    { id: 'LB',  label: 'LB',  x: 0.18, y: 0.81 },
    { id: 'CDM', label: 'CDM', x: 0.50, y: 0.72 },
    { id: 'RM',  label: 'RM',  x: 0.82, y: 0.63 },
    { id: 'CM1', label: 'CM',  x: 0.61, y: 0.63 },
    { id: 'CM2', label: 'CM',  x: 0.39, y: 0.63 },
    { id: 'LM',  label: 'LM',  x: 0.18, y: 0.63 },
    { id: 'ST',  label: 'ST',  x: 0.50, y: 0.54 },
  ],
}

export const FORMATION_NAMES = Object.keys(OUR_FORMATIONS)
const DEFAULT_FORMATION = '4-4-2'

// ─── PitchSVG ─────────────────────────────────────────────────────────────────
// Extracted as a module-level component so it can be rendered identically
// in both the inline view and the maximized modal without duplicating markup.
//
// viewBox 300×450 (ratio 2:3). Inner pitch area x=15 y=15 w=270 h=420.
// Scale: 270/68 ≈ 3.97 px/m (horiz), 420/105 = 4.0 px/m (vert).
//
// D arc geometry:
//   Penalty spot top: (150, 59).  Circle r=37.  Intersects penalty area edge
//   (y=81) at x≈120 and x≈180.
//   • Top D bows DOWNWARD into pitch → counterclockwise arc in SVG (sweep=0).
//   • Bottom D bows UPWARD into pitch → clockwise arc in SVG (sweep=1).
//
// handlePointerMove uses e.currentTarget.getBoundingClientRect() so it
// calculates relative coords correctly whether rendered inline or in a modal.

type PitchProps = {
  ourPositions: PlayerPos[]
  oppPositions: PlayerPos[]
  dragging: { team: 'our' | 'opp'; id: string } | null
  onPointerDown: (e: React.PointerEvent<SVGGElement>, team: 'our' | 'opp', id: string) => void
  onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => void
  onPointerUp: () => void
  className?: string
}

function PitchSVG({ ourPositions, oppPositions, dragging, onPointerDown, onPointerMove, onPointerUp, className }: PitchProps) {
  return (
    <svg
      viewBox="0 0 300 450"
      className={`touch-none select-none ${className ?? ''}`}
      style={{ cursor: dragging ? 'grabbing' : 'default' }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {/* Background */}
      <rect width="300" height="450" fill="#1e5c2a" />

      {/* Alternating grass stripes */}
      {[0, 1, 2, 3, 4, 5, 6].map(i => (
        <rect key={i} x="15" y={15 + i * 60} width="270" height="30" fill="rgba(0,0,0,0.08)" />
      ))}

      {/* Outer boundary */}
      <rect x="15" y="15" width="270" height="420" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />

      {/* Halfway line */}
      <line x1="15" y1="225" x2="285" y2="225" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />

      {/* Centre circle + spot */}
      <circle cx="150" cy="225" r="37" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <circle cx="150" cy="225" r="3" fill="rgba(255,255,255,0.55)" />

      {/* ── Top end ── */}
      <rect x="70" y="15" width="160" height="66" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <rect x="114" y="15" width="72" height="22" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <rect x="136" y="7" width="28" height="8" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
      <circle cx="150" cy="59" r="2.5" fill="rgba(255,255,255,0.55)" />
      {/* Top D: bows downward (away from top goal), sweep=0 */}
      <path d="M 120 81 A 37 37 0 0 0 180 81" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />

      {/* ── Bottom end ── */}
      <rect x="70" y="369" width="160" height="66" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <rect x="114" y="413" width="72" height="22" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <rect x="136" y="435" width="28" height="8" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
      <circle cx="150" cy="391" r="2.5" fill="rgba(255,255,255,0.55)" />
      {/* Bottom D: bows upward (away from bottom goal), sweep=1 */}
      <path d="M 120 369 A 37 37 0 0 1 180 369" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />

      {/* Opponent players (red) — rendered under blue */}
      {oppPositions.map(p => (
        <g
          key={`opp-${p.id}`}
          transform={`translate(${p.x * 300} ${p.y * 450})`}
          onPointerDown={e => onPointerDown(e, 'opp', p.id)}
          style={{ cursor: 'grab' }}
        >
          <circle r="14" fill="#dc2626" stroke="white" strokeWidth="1.5" opacity="0.92" />
          <text textAnchor="middle" dominantBaseline="central" fill="white" fontSize="7.5" fontWeight="bold"
            style={{ pointerEvents: 'none', userSelect: 'none' }}>{p.label}</text>
        </g>
      ))}

      {/* Our players (blue) */}
      {ourPositions.map(p => (
        <g
          key={`our-${p.id}`}
          transform={`translate(${p.x * 300} ${p.y * 450})`}
          onPointerDown={e => onPointerDown(e, 'our', p.id)}
          style={{ cursor: 'grab' }}
        >
          <circle r="14" fill="#2563eb" stroke="white" strokeWidth="1.5" opacity="0.92" />
          <text textAnchor="middle" dominantBaseline="central" fill="white" fontSize="7.5" fontWeight="bold"
            style={{ pointerEvents: 'none', userSelect: 'none' }}>{p.label}</text>
        </g>
      ))}
    </svg>
  )
}

// ─── Formation selectors ──────────────────────────────────────────────────────

function FormationSelectors({ ourFormation, oppFormation, onChange }: {
  ourFormation: string
  oppFormation: string
  onChange: (team: 'our' | 'opp', name: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-xs font-medium text-blue-400 mb-1 block">Your formation</label>
        <select value={ourFormation} onChange={e => onChange('our', e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500">
          {FORMATION_NAMES.map(f => <option key={f}>{f}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-red-400 mb-1 block">Opponent formation</label>
        <select value={oppFormation} onChange={e => onChange('opp', e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-red-500">
          {FORMATION_NAMES.map(f => <option key={f}>{f}</option>)}
        </select>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TacticsClient({
  tactics: initialTactics,
  teamId,
}: {
  tactics: Tactic[]
  teamId: string | null | undefined
}) {
  const [ourPositions, setOurPositions] = useState<PlayerPos[]>(OUR_FORMATIONS[DEFAULT_FORMATION])
  const [oppPositions, setOppPositions] = useState<PlayerPos[]>(mirror(OUR_FORMATIONS[DEFAULT_FORMATION]))
  const [ourFormation, setOurFormation] = useState(DEFAULT_FORMATION)
  const [oppFormation, setOppFormation] = useState(DEFAULT_FORMATION)
  const [dragging, setDragging] = useState<{ team: 'our' | 'opp'; id: string } | null>(null)
  const [tactics, setTactics] = useState<Tactic[]>(initialTactics)
  const [tacticName, setTacticName] = useState('')
  const [selectedTacticId, setSelectedTacticId] = useState('')
  const [saving, setSaving] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)

  const supabase = createClient()

  // ── Drag handlers ────────────────────────────────────────────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGGElement>, team: 'our' | 'opp', id: string) => {
      e.stopPropagation()
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
      setDragging({ team, id })
    },
    []
  )

  // Uses e.currentTarget (the SVG element) so coords are correct in both
  // the inline view and the maximized modal.
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!dragging) return
      const rect = e.currentTarget.getBoundingClientRect()
      const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
      const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
      if (dragging.team === 'our') {
        setOurPositions(prev => prev.map(p => (p.id === dragging.id ? { ...p, x, y } : p)))
      } else {
        setOppPositions(prev => prev.map(p => (p.id === dragging.id ? { ...p, x, y } : p)))
      }
    },
    [dragging]
  )

  const handlePointerUp = useCallback(() => setDragging(null), [])

  // ── Formation change ─────────────────────────────────────────────────────────

  function applyFormation(team: 'our' | 'opp', name: string) {
    const preset = OUR_FORMATIONS[name]
    if (!preset) return
    if (team === 'our') { setOurPositions(preset); setOurFormation(name) }
    else { setOppPositions(mirror(preset)); setOppFormation(name) }
  }

  // ── Save / load ──────────────────────────────────────────────────────────────

  async function saveTactic() {
    if (!tacticName.trim() || !teamId) return
    setSaving(true)
    const { data, error } = await supabase
      .from('tactics')
      .insert({
        team_id: teamId,
        name: tacticName.trim(),
        formation_our: ourFormation,
        formation_opp: oppFormation,
        positions: { our: ourPositions, opp: oppPositions },
      })
      .select()
      .single()
    setSaving(false)
    if (!error && data) {
      setTactics(prev => [data, ...prev])
      setTacticName('')
    }
  }

  function loadTactic(id: string) {
    const tactic = tactics.find(t => t.id === id)
    if (!tactic) return
    setOurPositions(tactic.positions.our)
    setOppPositions(tactic.positions.opp)
    setOurFormation(tactic.formation_our ?? '')
    setOppFormation(tactic.formation_opp ?? '')
    setSelectedTacticId(id)
  }

  async function deleteTactic(id: string) {
    await supabase.from('tactics').delete().eq('id', id)
    setTactics(prev => prev.filter(t => t.id !== id))
    if (selectedTacticId === id) setSelectedTacticId('')
  }

  function closeMaximized() {
    setIsMaximized(false)
    setDragging(null)
  }

  // ── Shared pitch props ───────────────────────────────────────────────────────

  const pitchProps: Omit<PitchProps, 'className'> = {
    ourPositions,
    oppPositions,
    dragging,
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
  }

  const teamLabels = (
    <div className="grid grid-cols-2 gap-3 text-center text-xs">
      <div className="flex items-center justify-center gap-1.5 text-red-400">
        <span className="w-3 h-3 rounded-full bg-red-600 inline-block" />
        Opponent
      </div>
      <div className="flex items-center justify-center gap-1.5 text-blue-400">
        <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
        Your team
      </div>
    </div>
  )

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-white">Tactics</h1>
          <p className="text-gray-400 text-sm mt-1">Build formations and save tactical setups</p>
        </div>

        <FormationSelectors ourFormation={ourFormation} oppFormation={oppFormation} onChange={applyFormation} />

        {/* Pitch with maximize button */}
        <div className="relative">
          <div className="rounded-xl overflow-hidden border border-gray-800 bg-gray-900">
            <PitchSVG {...pitchProps} className="w-full" />
          </div>
          <button
            onClick={() => setIsMaximized(true)}
            title="Expand pitch"
            className="absolute top-2 right-2 bg-black/50 hover:bg-black/80 text-white p-1.5 rounded-lg transition-colors z-10"
          >
            <Maximize2 size={16} />
          </button>
        </div>

        {teamLabels}

        {/* Save */}
        <div className="flex gap-2">
          <input
            value={tacticName}
            onChange={e => setTacticName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveTactic()}
            placeholder="Name this tactic…"
            className="flex-1 bg-gray-900 border border-gray-800 text-white text-sm rounded-lg px-3 py-2.5 placeholder-gray-500 focus:outline-none focus:border-green-600"
          />
          <button
            onClick={saveTactic}
            disabled={!tacticName.trim() || saving}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        {/* Load saved tactic */}
        {tactics.length > 0 && (
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Load saved tactic</label>
            <div className="flex gap-2">
              <select
                value={selectedTacticId}
                onChange={e => loadTactic(e.target.value)}
                className="flex-1 bg-gray-900 border border-gray-800 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-green-600"
              >
                <option value="">Select a tactic…</option>
                {tactics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {selectedTacticId && (
                <button
                  onClick={() => deleteTactic(selectedTacticId)}
                  className="text-red-400 hover:text-red-300 text-sm px-3 py-2.5 rounded-lg border border-gray-800 hover:bg-gray-900 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Maximized modal ─────────────────────────────────────────────────── */}
      {isMaximized && (
        // Outer: fixed viewport frame, no flex so overflow-y-auto on the inner
        // scrollable wrapper works correctly.
        <div className="fixed inset-0 bg-black/95 z-50 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <div className="flex flex-col gap-4 p-4 max-w-md mx-auto pb-8">

              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="text-white font-bold text-lg">Tactics Board</span>
                <button onClick={closeMaximized} className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                  <X size={22} />
                </button>
              </div>

              {/* Formation selectors */}
              <FormationSelectors ourFormation={ourFormation} oppFormation={oppFormation} onChange={applyFormation} />

              {/* Full pitch */}
              <div className="rounded-xl overflow-hidden border border-gray-800 bg-gray-900">
                <PitchSVG {...pitchProps} className="w-full" />
              </div>

              {teamLabels}

              {/* Save */}
              <div className="flex gap-2">
                <input
                  value={tacticName}
                  onChange={e => setTacticName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveTactic()}
                  placeholder="Name this tactic…"
                  className="flex-1 bg-gray-900 border border-gray-800 text-white text-sm rounded-lg px-3 py-2.5 placeholder-gray-500 focus:outline-none focus:border-green-600"
                />
                <button
                  onClick={saveTactic}
                  disabled={!tacticName.trim() || saving}
                  className="bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>

              {/* Load saved tactic */}
              {tactics.length > 0 && (
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Load saved tactic</label>
                  <div className="flex gap-2">
                    <select
                      value={selectedTacticId}
                      onChange={e => loadTactic(e.target.value)}
                      className="flex-1 bg-gray-900 border border-gray-800 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-green-600"
                    >
                      <option value="">Select a tactic…</option>
                      {tactics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    {selectedTacticId && (
                      <button
                        onClick={() => deleteTactic(selectedTacticId)}
                        className="text-red-400 hover:text-red-300 text-sm px-3 py-2.5 rounded-lg border border-gray-800 hover:bg-gray-900 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  )
}
