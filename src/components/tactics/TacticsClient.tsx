'use client'

import { useState, useCallback } from 'react'
import { Maximize2, X, RotateCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Tactic, PlayerPos, UserRole } from '@/types'
import { OUR_FORMATIONS, FORMATION_NAMES, mirror } from '@/lib/formations'
import { FullPitchMarkings } from '@/components/shared/FullPitchMarkings'
import { FormationSelectors } from '@/components/shared/FormationSelectors'

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
  orientation: 'vertical' | 'horizontal'
  className?: string
}

function PitchSVG({ ourPositions, oppPositions, dragging, onPointerDown, onPointerMove, onPointerUp, orientation, className }: PitchProps) {
  const isH = orientation === 'horizontal'
  return (
    <svg
      viewBox={isH ? '0 0 450 300' : '0 0 300 450'}
      className={`touch-none select-none ${className ?? ''}`}
      style={{ cursor: dragging ? 'grabbing' : 'default' }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <g transform={isH ? 'translate(0 300) rotate(-90)' : undefined}>
        <FullPitchMarkings />

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
      </g>
    </svg>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TacticsClient({
  tactics: initialTactics,
  teamId,
  role = 'coach',
}: {
  tactics: Tactic[]
  teamId: string | null | undefined
  role?: UserRole
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
  const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('vertical')
  const isHorizontal = orientation === 'horizontal'

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
      // Horizontal: screen-x maps to original y-axis, screen-y maps to inverted original x-axis
      const x = isHorizontal
        ? Math.min(1, Math.max(0, 1 - (e.clientY - rect.top) / rect.height))
        : Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
      const y = isHorizontal
        ? Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
        : Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
      if (dragging.team === 'our') {
        setOurPositions(prev => prev.map(p => (p.id === dragging.id ? { ...p, x, y } : p)))
      } else {
        setOppPositions(prev => prev.map(p => (p.id === dragging.id ? { ...p, x, y } : p)))
      }
    },
    [dragging, isHorizontal]
  )

  const handlePointerUp = useCallback(() => setDragging(null), [])

  // ── Formation change ─────────────────────────────────────────────────────────

  function applyFormation(team: 'our' | 'opp', name: string) {
    const preset = OUR_FORMATIONS[name]
    if (!preset) return
    if (team === 'our') { setOurPositions(preset); setOurFormation(name) }
    else { setOppPositions(mirror(preset)); setOppFormation(name) }
  }

  function swapSides() {
    setOurPositions(prev => mirror(prev))
    setOppPositions(prev => mirror(prev))
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
    orientation,
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
          <p className="text-gray-400 text-sm mt-1">
            {role === 'coach' ? 'Build formations and save tactical setups' : 'Study team formations and tactics'}
          </p>
        </div>

        <FormationSelectors ourFormation={ourFormation} oppFormation={oppFormation} onChange={applyFormation} onSwap={swapSides} />

        {/* Pitch with rotate + maximize buttons */}
        <div className="relative">
          <div className="rounded-xl overflow-hidden border border-gray-800 bg-gray-900">
            <PitchSVG {...pitchProps} className="w-full" />
          </div>
          <button
            onClick={() => setOrientation(o => o === 'vertical' ? 'horizontal' : 'vertical')}
            title="Rotate pitch"
            className="absolute top-2 left-2 bg-black/50 hover:bg-black/80 text-white p-1.5 rounded-lg transition-colors z-10"
          >
            <RotateCw size={16} />
          </button>
          <button
            onClick={() => setIsMaximized(true)}
            title="Expand pitch"
            className="absolute top-2 right-2 bg-black/50 hover:bg-black/80 text-white p-1.5 rounded-lg transition-colors z-10"
          >
            <Maximize2 size={16} />
          </button>
        </div>

        {teamLabels}

        {/* Save — coach only */}
        {role === 'coach' && (
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
        )}

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
              {selectedTacticId && role === 'coach' && (
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
            <div className={`flex flex-col gap-4 p-4 ${isHorizontal ? 'max-w-2xl' : 'max-w-md'} mx-auto pb-8`}>

              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="text-white font-bold text-lg">Tactics Board</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOrientation(o => o === 'vertical' ? 'horizontal' : 'vertical')}
                    title="Rotate pitch"
                    className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                    <RotateCw size={20} />
                  </button>
                  <button onClick={closeMaximized} className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                    <X size={22} />
                  </button>
                </div>
              </div>

              {/* Formation selectors */}
              <FormationSelectors ourFormation={ourFormation} oppFormation={oppFormation} onChange={applyFormation} onSwap={swapSides} />

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
