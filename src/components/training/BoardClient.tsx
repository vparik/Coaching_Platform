'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Exercise, BoardData, BoardPlayer, BoardLine, BoardBall, BoardScenario } from '@/types'
import { ArrowLeft, Plus, Minus, Trash2, Circle, Maximize2, X } from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────────

const VB_W = 100
const VB_H = 140

const SCENARIOS: { id: BoardScenario; label: string }[] = [
  { id: 'blank',         label: 'Blank' },
  { id: 'full-pitch',    label: 'Full Pitch' },
  { id: 'half-pitch',    label: 'Half Pitch' },
  { id: 'final-third',   label: 'Final Third' },
  { id: 'small-grid',    label: 'Small Grid' },
  { id: 'wide-corridor', label: 'Corridor' },
]

const PLAYER_COLORS: { id: BoardPlayer['color']; fill: string; stroke: string; label: string }[] = [
  { id: 'blue',   fill: '#2563eb', stroke: '#93c5fd', label: 'Blue' },
  { id: 'red',    fill: '#dc2626', stroke: '#fca5a5', label: 'Red' },
  { id: 'yellow', fill: '#d97706', stroke: '#fcd34d', label: 'Yellow' },
]

function emptyBoard(scenario: BoardScenario = 'full-pitch'): BoardData {
  return { scenario, players: [], lines: [] }
}

let _uid = 0
function uid() { return `b${++_uid}` }

// ── Pitch backgrounds ─────────────────────────────────────────────────────────

function PitchLines({ scenario }: { scenario: BoardScenario }) {
  const s = 'rgba(255,255,255,0.55)'
  const sw = 0.8

  if (scenario === 'blank') {
    return <rect width={VB_W} height={VB_H} fill="#1a1a2e" />
  }

  const stripes = [0,1,2,3].map(i => (
    <rect key={i} x="0" y={i * 35} width={VB_W} height={17.5} fill="rgba(0,0,0,0.07)" />
  ))

  if (scenario === 'full-pitch') return (
    <>
      <rect width={VB_W} height={VB_H} fill="#1e5c2a" />
      {stripes}
      <rect x="5" y="5" width="90" height="130" fill="none" stroke={s} strokeWidth={sw} />
      <line x1="5" y1="70" x2="95" y2="70" stroke={s} strokeWidth={sw} />
      <circle cx="50" cy="70" r="11" fill="none" stroke={s} strokeWidth={sw} />
      <circle cx="50" cy="70" r="0.8" fill={s} />
      <rect x="24" y="5" width="52" height="20" fill="none" stroke={s} strokeWidth={sw} />
      <rect x="36" y="5" width="28" height="7" fill="none" stroke={s} strokeWidth={sw} />
      <circle cx="50" cy="18" r="0.8" fill={s} />
      <path d="M 38 25 A 11 11 0 0 0 62 25" fill="none" stroke={s} strokeWidth={sw} />
      <rect x="41" y="2" width="18" height="3" fill="rgba(255,255,255,0.1)" stroke={s} strokeWidth={sw} />
      <rect x="24" y="115" width="52" height="20" fill="none" stroke={s} strokeWidth={sw} />
      <rect x="36" y="128" width="28" height="7" fill="none" stroke={s} strokeWidth={sw} />
      <circle cx="50" cy="122" r="0.8" fill={s} />
      <path d="M 38 115 A 11 11 0 0 1 62 115" fill="none" stroke={s} strokeWidth={sw} />
      <rect x="41" y="135" width="18" height="3" fill="rgba(255,255,255,0.1)" stroke={s} strokeWidth={sw} />
    </>
  )

  if (scenario === 'half-pitch') return (
    <>
      <rect width={VB_W} height={VB_H} fill="#1e5c2a" />
      {stripes}
      <rect x="5" y="5" width="90" height="130" fill="none" stroke={s} strokeWidth={sw} />
      <line x1="5" y1="5" x2="95" y2="5" stroke={s} strokeWidth={sw} strokeDasharray="3 2" />
      <rect x="18" y="100" width="64" height="35" fill="none" stroke={s} strokeWidth={sw} />
      <rect x="32" y="120" width="36" height="15" fill="none" stroke={s} strokeWidth={sw} />
      <circle cx="50" cy="115" r="0.8" fill={s} />
      <path d="M 33 100 A 11 11 0 0 1 67 100" fill="none" stroke={s} strokeWidth={sw} />
      <rect x="39" y="133" width="22" height="4" fill="rgba(255,255,255,0.1)" stroke={s} strokeWidth={sw} />
    </>
  )

  if (scenario === 'final-third') return (
    <>
      <rect width={VB_W} height={VB_H} fill="#1e5c2a" />
      {stripes}
      <rect x="5" y="5" width="90" height="130" fill="none" stroke={s} strokeWidth={sw} />
      <rect x="20" y="90" width="60" height="45" fill="none" stroke={s} strokeWidth={sw} />
      <rect x="33" y="115" width="34" height="20" fill="none" stroke={s} strokeWidth={sw} />
      <circle cx="50" cy="110" r="0.8" fill={s} />
      <path d="M 34 90 A 11 11 0 0 1 66 90" fill="none" stroke={s} strokeWidth={sw} />
      <rect x="40" y="133" width="20" height="4" fill="rgba(255,255,255,0.1)" stroke={s} strokeWidth={sw} />
    </>
  )

  if (scenario === 'small-grid') return (
    <>
      <rect width={VB_W} height={VB_H} fill="#1e5c2a" />
      {stripes}
      <rect x="30" y="40" width="40" height="60" fill="none" stroke={s} strokeWidth={sw} />
      <line x1="30" y1="70" x2="70" y2="70" stroke={s} strokeWidth={sw * 0.6} strokeDasharray="2 2" />
      <line x1="50" y1="40" x2="50" y2="100" stroke={s} strokeWidth={sw * 0.6} strokeDasharray="2 2" />
    </>
  )

  if (scenario === 'wide-corridor') return (
    <>
      <rect width={VB_W} height={VB_H} fill="#1e5c2a" />
      {stripes}
      <rect x="5" y="14" width="90" height="112" fill="none" stroke={s} strokeWidth={sw} />
      <line x1="35" y1="14" x2="35" y2="126" stroke={s} strokeWidth={sw * 0.6} strokeDasharray="3 2" />
      <line x1="65" y1="14" x2="65" y2="126" stroke={s} strokeWidth={sw * 0.6} strokeDasharray="3 2" />
      <line x1="5" y1="70" x2="95" y2="70" stroke={s} strokeWidth={sw} strokeDasharray="3 2" />
    </>
  )

  return null
}

// ── Football icon (SVG group, centred at 0,0) ─────────────────────────────────

function FootballIcon() {
  return (
    <>
      <circle r="5" fill="white" stroke="#222" strokeWidth="0.5" />
      {/* centre pentagon */}
      <path d="M0,-1.9 L1.8,-0.6 L1.1,1.6 L-1.1,1.6 L-1.8,-0.6 Z" fill="#111" />
      {/* seam lines from pentagon vertices to edge */}
      <line x1="0" y1="-1.9" x2="0" y2="-5" stroke="#333" strokeWidth="0.45" />
      <line x1="1.8" y1="-0.6" x2="4.8" y2="-1.6" stroke="#333" strokeWidth="0.45" />
      <line x1="1.1" y1="1.6" x2="2.9" y2="4.3" stroke="#333" strokeWidth="0.45" />
      <line x1="-1.1" y1="1.6" x2="-2.9" y2="4.3" stroke="#333" strokeWidth="0.45" />
      <line x1="-1.8" y1="-0.6" x2="-4.8" y2="-1.6" stroke="#333" strokeWidth="0.45" />
    </>
  )
}

// ── Board SVG (shared between inline + modal) ─────────────────────────────────

type BoardSVGProps = {
  board: BoardData
  dragging: string | null
  activeTool: 'select' | 'line'
  lineStart: { x: number; y: number } | null
  svgRef: React.RefObject<SVGSVGElement | null>
  onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => void
  onPointerUp: () => void
  onSvgClick: (e: React.MouseEvent<SVGSVGElement>) => void
  onPlayerPointerDown: (e: React.PointerEvent<SVGGElement>, id: string) => void
  className?: string
}

function BoardSVG({
  board, dragging, activeTool, lineStart, svgRef,
  onPointerMove, onPointerUp, onSvgClick, onPlayerPointerDown, className,
}: BoardSVGProps) {
  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className={`touch-none select-none ${className ?? ''}`}
      style={{
        cursor: activeTool === 'line' ? 'crosshair' : dragging ? 'grabbing' : 'default',
        display: 'block',
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onClick={onSvgClick}
    >
      <PitchLines scenario={board.scenario} />

      {board.lines.map(ln => (
        <line
          key={ln.id}
          x1={ln.x1} y1={ln.y1} x2={ln.x2} y2={ln.y2}
          stroke="rgba(255,255,0,0.85)"
          strokeWidth="1.2"
          strokeDasharray={ln.style === 'dashed' ? '4 3' : undefined}
          strokeLinecap="round"
        />
      ))}

      {lineStart && (
        <circle cx={lineStart.x} cy={lineStart.y} r="1.5" fill="yellow" opacity="0.8" />
      )}

      {board.players.map(p => {
        const col = PLAYER_COLORS.find(c => c.id === p.color)!
        return (
          <g
            key={p.id}
            transform={`translate(${p.x} ${p.y})`}
            onPointerDown={e => onPlayerPointerDown(e, p.id)}
            style={{ cursor: activeTool === 'select' ? 'grab' : 'default' }}
          >
            <circle r="4" fill={col.fill} stroke={col.stroke} strokeWidth="0.7" opacity="0.95" />
            <text
              textAnchor="middle" dominantBaseline="central"
              fill="white" fontSize="3" fontWeight="bold"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >{p.label}</text>
          </g>
        )
      })}

      {(board.balls ?? []).map(b => (
        <g
          key={b.id}
          transform={`translate(${b.x} ${b.y})`}
          onPointerDown={e => onPlayerPointerDown(e, b.id)}
          style={{ cursor: activeTool === 'select' ? 'grab' : 'default' }}
        >
          <g transform="scale(0.42)">
            <FootballIcon />
          </g>
        </g>
      ))}
    </svg>
  )
}

// ── Controls panel (shared) ───────────────────────────────────────────────────

function ControlsPanel({
  board, activeTool, lineStyle, activeColor, lineStart,
  setActiveTool, setLineStyle, setActiveColor, setLineStart,
  addPlayer, removeLastPlayer, addBall, removeLastBall, removeLastLine, clearBoard,
}: {
  board: BoardData
  activeTool: 'select' | 'line'
  lineStyle: 'solid' | 'dashed'
  activeColor: BoardPlayer['color']
  lineStart: { x: number; y: number } | null
  setActiveTool: (t: 'select' | 'line') => void
  setLineStyle: (s: 'solid' | 'dashed') => void
  setActiveColor: (c: BoardPlayer['color']) => void
  setLineStart: (v: null) => void
  addPlayer: () => void
  removeLastPlayer: () => void
  addBall: () => void
  removeLastBall: () => void
  removeLastLine: () => void
  clearBoard: () => void
}) {
  return (
    <div className="space-y-4">
      {/* Tool toggle */}
      <div>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Tool</p>
        <div className="flex bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => { setActiveTool('select'); setLineStart(null) }}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTool === 'select' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Move
          </button>
          <button
            onClick={() => setActiveTool('line')}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTool === 'line' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Line
          </button>
        </div>
        {activeTool === 'line' && (
          <div className="mt-2 space-y-2">
            <div className="flex bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setLineStyle('solid')}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${lineStyle === 'solid' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Solid
              </button>
              <button
                onClick={() => setLineStyle('dashed')}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${lineStyle === 'dashed' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Dashed
              </button>
            </div>
            {lineStart
              ? <p className="text-[10px] text-amber-400">Tap canvas for end point</p>
              : <p className="text-[10px] text-gray-500">Tap canvas for start point</p>
            }
          </div>
        )}
      </div>

      {/* Players */}
      <div>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Players</p>
        <div className="space-y-1.5">
          {PLAYER_COLORS.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveColor(c.id)}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${activeColor === c.id ? 'border-white/30 bg-gray-700 text-white' : 'border-transparent bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'}`}
            >
              <Circle size={9} fill={c.fill} color={c.fill} />
              <span className="flex-1 text-left">{c.label}</span>
              <span className="text-gray-500 font-normal">{board.players.filter(p => p.color === c.id).length}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 mt-2">
          <button
            onClick={addPlayer}
            className="flex-1 flex items-center justify-center gap-1 text-xs bg-gray-800 hover:bg-gray-700 text-white py-1.5 rounded-lg transition-colors"
          >
            <Plus size={11} /> Add
          </button>
          <button
            onClick={removeLastPlayer}
            disabled={board.players.filter(p => p.color === activeColor).length === 0}
            className="flex-1 flex items-center justify-center gap-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white disabled:opacity-30 py-1.5 rounded-lg transition-colors"
          >
            <Minus size={11} /> Remove
          </button>
        </div>
      </div>

      {/* Ball */}
      <div>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Ball</p>
        <div className="flex gap-1.5">
          <button
            onClick={addBall}
            className="flex-1 flex items-center justify-center gap-1 text-xs bg-gray-800 hover:bg-gray-700 text-white py-1.5 rounded-lg transition-colors"
          >
            <Plus size={11} /> Add
          </button>
          <button
            onClick={removeLastBall}
            disabled={(board.balls ?? []).length === 0}
            className="flex-1 flex items-center justify-center gap-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white disabled:opacity-30 py-1.5 rounded-lg transition-colors"
          >
            <Minus size={11} /> Remove
          </button>
        </div>
        {(board.balls ?? []).length > 0 && (
          <p className="text-[10px] text-gray-600 mt-1">{(board.balls ?? []).length} ball{(board.balls ?? []).length !== 1 ? 's' : ''} on pitch</p>
        )}
      </div>

      {/* Lines / clear */}
      <div className="space-y-1.5">
        {board.lines.length > 0 && (
          <button
            onClick={removeLastLine}
            className="w-full flex items-center justify-center gap-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white py-1.5 rounded-lg transition-colors"
          >
            <Minus size={11} /> Undo Line
          </button>
        )}
        {(board.players.length > 0 || board.lines.length > 0) && (
          <button
            onClick={clearBoard}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-red-400 hover:text-red-300 bg-gray-800 hover:bg-gray-700 py-1.5 rounded-lg transition-colors"
          >
            <Trash2 size={11} /> Clear All
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BoardClient({ exercise }: { exercise: Exercise }) {
  const router = useRouter()
  const supabase = createClient()

  const [board, setBoard] = useState<BoardData>(() => exercise.board ?? emptyBoard('full-pitch'))
  const [activeTool, setActiveTool] = useState<'select' | 'line'>('select')
  const [lineStart, setLineStart] = useState<{ x: number; y: number } | null>(null)
  const [lineStyle, setLineStyle] = useState<'solid' | 'dashed'>('solid')
  const [activeColor, setActiveColor] = useState<BoardPlayer['color']>('blue')
  const [dragging, setDragging] = useState<string | null>(null)
  const [isMaximized, setIsMaximized] = useState(false)
  const [saving, setSaving] = useState(false)

  const inlineSvgRef = useRef<SVGSVGElement>(null)
  const modalSvgRef = useRef<SVGSVGElement>(null)

  // ── Coord helper ──
  function svgCoords(e: React.PointerEvent, ref: React.RefObject<SVGSVGElement | null>) {
    const rect = ref.current!.getBoundingClientRect()
    return {
      x: Math.min(VB_W, Math.max(0, ((e.clientX - rect.left) / rect.width) * VB_W)),
      y: Math.min(VB_H, Math.max(0, ((e.clientY - rect.top) / rect.height) * VB_H)),
    }
  }

  // ── Players ──
  function addPlayer() {
    const sameColor = board.players.filter(p => p.color === activeColor).length
    setBoard(b => ({
      ...b,
      players: [...b.players, {
        id: uid(), color: activeColor, label: String(sameColor + 1),
        x: 35 + Math.random() * 30, y: 50 + Math.random() * 40,
      }],
    }))
  }

  function removeLastPlayer() {
    const sameColor = board.players.filter(p => p.color === activeColor)
    if (sameColor.length === 0) return
    const lastId = sameColor[sameColor.length - 1].id
    setBoard(b => ({ ...b, players: b.players.filter(p => p.id !== lastId) }))
  }

  // ── Drag ──
  const handlePlayerPointerDown = useCallback((e: React.PointerEvent<SVGGElement>, id: string) => {
    if (activeTool !== 'select') return
    e.stopPropagation()
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    setDragging(id)
  }, [activeTool])

  function makeMoveHandler(ref: React.RefObject<SVGSVGElement | null>) {
    return (e: React.PointerEvent<SVGSVGElement>) => {
      if (!dragging) return
      const { x, y } = svgCoords(e, ref)
      setBoard(b => ({
        ...b,
        players: b.players.map(p => p.id === dragging ? { ...p, x, y } : p),
        balls: (b.balls ?? []).map(bl => bl.id === dragging ? { ...bl, x, y } : bl),
      }))
    }
  }

  const handlePointerUp = useCallback(() => setDragging(null), [])

  // ── Line tool ──
  function makeClickHandler(ref: React.RefObject<SVGSVGElement | null>) {
    return (e: React.MouseEvent<SVGSVGElement>) => {
      if (activeTool !== 'line') return
      const rect = ref.current!.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * VB_W
      const y = ((e.clientY - rect.top) / rect.height) * VB_H
      if (!lineStart) {
        setLineStart({ x, y })
      } else {
        setBoard(b => ({ ...b, lines: [...b.lines, { id: uid(), x1: lineStart.x, y1: lineStart.y, x2: x, y2: y, style: lineStyle }] }))
        setLineStart(null)
      }
    }
  }

  function removeLastLine() {
    setBoard(b => ({ ...b, lines: b.lines.slice(0, -1) }))
  }

  // ── Balls ──
  function addBall() {
    const newBall: BoardBall = {
      id: uid(), x: 45 + Math.random() * 10, y: 60 + Math.random() * 20,
    }
    setBoard(b => ({ ...b, balls: [...(b.balls ?? []), newBall] }))
  }

  function removeLastBall() {
    setBoard(b => {
      const balls = b.balls ?? []
      return { ...b, balls: balls.slice(0, -1) }
    })
  }

  function clearBoard() {
    if (!confirm('Clear all players, balls and lines?')) return
    setBoard(b => ({ ...b, players: [], balls: [], lines: [] }))
    setLineStart(null)
  }

  // ── Save ──
  async function save() {
    setSaving(true)
    await supabase.from('exercises').update({ board }).eq('id', exercise.id)
    setSaving(false)
    router.push('/training')
  }

  // ── Shared controls props ──
  const controlsProps = {
    board, activeTool, lineStyle, activeColor, lineStart,
    setActiveTool, setLineStyle, setActiveColor, setLineStart,
    addPlayer, removeLastPlayer, addBall, removeLastBall, removeLastLine, clearBoard,
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/training')} className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">{exercise.name}</h1>
            <p className="text-xs text-gray-500">Drill Board</p>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        {/* Scenario selector */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {SCENARIOS.map(sc => (
            <button
              key={sc.id}
              onClick={() => setBoard(b => ({ ...b, scenario: sc.id }))}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${board.scenario === sc.id ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            >
              {sc.label}
            </button>
          ))}
        </div>

        {/* Side-by-side layout */}
        <div className="flex gap-4 items-start">
          {/* Canvas */}
          <div className="relative flex-shrink-0" style={{ width: 'min(55vw, 260px)' }}>
            <div className="rounded-xl overflow-hidden border border-gray-800">
              <BoardSVG
                board={board} dragging={dragging} activeTool={activeTool}
                lineStart={lineStart} svgRef={inlineSvgRef}
                onPointerMove={makeMoveHandler(inlineSvgRef)}
                onPointerUp={handlePointerUp}
                onSvgClick={makeClickHandler(inlineSvgRef)}
                onPlayerPointerDown={handlePlayerPointerDown}
                className="w-full"
              />
            </div>
            <button
              onClick={() => setIsMaximized(true)}
              title="Expand"
              className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/90 text-white p-1.5 rounded-lg transition-colors"
            >
              <Maximize2 size={14} />
            </button>
          </div>

          {/* Controls */}
          <div className="flex-1 min-w-0">
            <ControlsPanel {...controlsProps} />
          </div>
        </div>
      </div>

      {/* ── Fullscreen modal ──────────────────────────────────────────────── */}
      {isMaximized && (
        <div className="fixed inset-0 bg-black/95 z-50 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <div className="flex flex-col gap-4 p-4 max-w-md mx-auto pb-8">

              {/* Modal header */}
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-white font-bold truncate">{exercise.name}</p>
                  <p className="text-xs text-gray-500">Drill Board</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={save}
                    disabled={saving}
                    className="bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => { setIsMaximized(false); setDragging(null) }}
                    className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Scenario selector */}
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                {SCENARIOS.map(sc => (
                  <button
                    key={sc.id}
                    onClick={() => setBoard(b => ({ ...b, scenario: sc.id }))}
                    className={`shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${board.scenario === sc.id ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                  >
                    {sc.label}
                  </button>
                ))}
              </div>

              {/* Full canvas */}
              <div className="rounded-xl overflow-hidden border border-gray-800">
                <BoardSVG
                  board={board} dragging={dragging} activeTool={activeTool}
                  lineStart={lineStart} svgRef={modalSvgRef}
                  onPointerMove={makeMoveHandler(modalSvgRef)}
                  onPointerUp={handlePointerUp}
                  onSvgClick={makeClickHandler(modalSvgRef)}
                  onPlayerPointerDown={handlePlayerPointerDown}
                  className="w-full"
                />
              </div>

              <ControlsPanel {...controlsProps} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
