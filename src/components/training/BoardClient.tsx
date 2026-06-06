'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Exercise, BoardData, BoardFrame, BoardPlayer, BoardLine, BoardScenario,
} from '@/types'
import {
  ArrowLeft, Plus, Minus, Trash2, Circle, Maximize2, X,
  Play, Pause, ChevronLeft, ChevronRight, RefreshCw,
} from 'lucide-react'

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

const PLAYER_COLORS: { id: BoardPlayer['color']; fill: string; stroke: string; arrowColor: string; label: string }[] = [
  { id: 'blue',   fill: '#2563eb', stroke: '#93c5fd', arrowColor: 'rgba(147,197,253,0.75)', label: 'Blue' },
  { id: 'red',    fill: '#dc2626', stroke: '#fca5a5', arrowColor: 'rgba(252,165,165,0.75)', label: 'Red' },
  { id: 'yellow', fill: '#d97706', stroke: '#fcd34d', arrowColor: 'rgba(252,211,77,0.75)',  label: 'Yellow' },
]

const SPEEDS = [
  { label: 'Slow', value: 0.5 },
  { label: 'Normal', value: 1 },
  { label: 'Fast', value: 2 },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

let _uid = 0
function uid() { return `b${++_uid}` }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

function migrateBoard(raw: BoardData | null): BoardData {
  if (!raw) return { scenario: 'full-pitch', lines: [], frames: [{ players: [], balls: [] }] }
  // migrate old format that had top-level players/balls
  if (raw.players && !raw.frames) {
    return { scenario: raw.scenario, lines: raw.lines ?? [], frames: [{ players: raw.players, balls: raw.balls ?? [] }] }
  }
  if (!raw.frames || raw.frames.length === 0) {
    return { ...raw, frames: [{ players: [], balls: [] }] }
  }
  return raw
}

function getLerpedFrame(frames: BoardFrame[], playhead: number): BoardFrame {
  if (frames.length === 0) return { players: [], balls: [] }
  if (frames.length === 1) return frames[0]
  const i = Math.min(Math.floor(playhead), frames.length - 2)
  const t = Math.min(1, playhead - i)
  const a = frames[i], b = frames[i + 1]
  return {
    players: a.players.map(pa => {
      const pb = b.players.find(p => p.id === pa.id)
      if (!pb) return pa
      return { ...pa, x: lerp(pa.x, pb.x, t), y: lerp(pa.y, pb.y, t) }
    }),
    balls: a.balls.map(ba => {
      const bb = b.balls.find(bl => bl.id === ba.id)
      if (!bb) return ba
      return { ...ba, x: lerp(ba.x, bb.x, t), y: lerp(ba.y, bb.y, t) }
    }),
  }
}

type Arrow = { id: string; x1: number; y1: number; x2: number; y2: number; color: string }

function getArrows(frames: BoardFrame[], frameIdx: number): Arrow[] {
  if (frameIdx >= frames.length - 1) return []
  const a = frames[frameIdx], b = frames[frameIdx + 1]
  const arrows: Arrow[] = []
  for (const pa of a.players) {
    const pb = b.players.find(p => p.id === pa.id)
    if (!pb) continue
    const dx = pb.x - pa.x, dy = pb.y - pa.y
    if (Math.sqrt(dx * dx + dy * dy) < 1.5) continue
    const col = PLAYER_COLORS.find(c => c.id === pa.color)
    arrows.push({ id: pa.id, x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y, color: col?.arrowColor ?? 'rgba(255,255,255,0.5)' })
  }
  for (const ba of a.balls) {
    const bb = b.balls.find(bl => bl.id === ba.id)
    if (!bb) continue
    const dx = bb.x - ba.x, dy = bb.y - ba.y
    if (Math.sqrt(dx * dx + dy * dy) < 1.5) continue
    arrows.push({ id: ba.id, x1: ba.x, y1: ba.y, x2: bb.x, y2: bb.y, color: 'rgba(255,255,255,0.6)' })
  }
  return arrows
}

// ── Pitch backgrounds ─────────────────────────────────────────────────────────

function PitchLines({ scenario }: { scenario: BoardScenario }) {
  const s = 'rgba(255,255,255,0.55)', sw = 0.8
  const stripes = [0,1,2,3].map(i => (
    <rect key={i} x="0" y={i * 35} width={VB_W} height={17.5} fill="rgba(0,0,0,0.07)" />
  ))
  if (scenario === 'blank') return <rect width={VB_W} height={VB_H} fill="#1a1a2e" />
  if (scenario === 'full-pitch') return (
    <>
      <rect width={VB_W} height={VB_H} fill="#1e5c2a" />{stripes}
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
      <rect width={VB_W} height={VB_H} fill="#1e5c2a" />{stripes}
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
      <rect width={VB_W} height={VB_H} fill="#1e5c2a" />{stripes}
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
      <rect width={VB_W} height={VB_H} fill="#1e5c2a" />{stripes}
      <rect x="30" y="40" width="40" height="60" fill="none" stroke={s} strokeWidth={sw} />
      <line x1="30" y1="70" x2="70" y2="70" stroke={s} strokeWidth={sw * 0.6} strokeDasharray="2 2" />
      <line x1="50" y1="40" x2="50" y2="100" stroke={s} strokeWidth={sw * 0.6} strokeDasharray="2 2" />
    </>
  )
  if (scenario === 'wide-corridor') return (
    <>
      <rect width={VB_W} height={VB_H} fill="#1e5c2a" />{stripes}
      <rect x="5" y="14" width="90" height="112" fill="none" stroke={s} strokeWidth={sw} />
      <line x1="35" y1="14" x2="35" y2="126" stroke={s} strokeWidth={sw * 0.6} strokeDasharray="3 2" />
      <line x1="65" y1="14" x2="65" y2="126" stroke={s} strokeWidth={sw * 0.6} strokeDasharray="3 2" />
      <line x1="5" y1="70" x2="95" y2="70" stroke={s} strokeWidth={sw} strokeDasharray="3 2" />
    </>
  )
  return null
}

// ── Football icon ─────────────────────────────────────────────────────────────

function FootballIcon() {
  return (
    <>
      <circle r="5" fill="white" stroke="#222" strokeWidth="0.5" />
      <path d="M0,-1.9 L1.8,-0.6 L1.1,1.6 L-1.1,1.6 L-1.8,-0.6 Z" fill="#111" />
      <line x1="0" y1="-1.9" x2="0" y2="-5" stroke="#333" strokeWidth="0.45" />
      <line x1="1.8" y1="-0.6" x2="4.8" y2="-1.6" stroke="#333" strokeWidth="0.45" />
      <line x1="1.1" y1="1.6" x2="2.9" y2="4.3" stroke="#333" strokeWidth="0.45" />
      <line x1="-1.1" y1="1.6" x2="-2.9" y2="4.3" stroke="#333" strokeWidth="0.45" />
      <line x1="-1.8" y1="-0.6" x2="-4.8" y2="-1.6" stroke="#333" strokeWidth="0.45" />
    </>
  )
}

// ── Board SVG ─────────────────────────────────────────────────────────────────

type BoardSVGProps = {
  scenario: BoardScenario
  lines: BoardLine[]
  frame: BoardFrame
  arrows: Arrow[]
  dragging: string | null
  activeTool: 'select' | 'line'
  lineStart: { x: number; y: number } | null
  isPlaying: boolean
  svgRef: React.RefObject<SVGSVGElement | null>
  onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => void
  onPointerUp: () => void
  onSvgClick: (e: React.MouseEvent<SVGSVGElement>) => void
  onDraggablePointerDown: (e: React.PointerEvent<SVGGElement>, id: string) => void
  className?: string
}

function BoardSVG({
  scenario, lines, frame, arrows, dragging, activeTool, lineStart, isPlaying,
  svgRef, onPointerMove, onPointerUp, onSvgClick, onDraggablePointerDown, className,
}: BoardSVGProps) {
  const cursor = isPlaying ? 'default' : activeTool === 'line' ? 'crosshair' : dragging ? 'grabbing' : 'default'
  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className={`touch-none select-none ${className ?? ''}`}
      style={{ cursor, display: 'block' }}
      onPointerMove={isPlaying ? undefined : onPointerMove}
      onPointerUp={isPlaying ? undefined : onPointerUp}
      onPointerLeave={isPlaying ? undefined : onPointerUp}
      onClick={isPlaying ? undefined : onSvgClick}
    >
      <defs>
        <marker id="ah" markerWidth="5" markerHeight="4" refX="4" refY="2" orient="auto">
          <polygon points="0 0, 5 2, 0 4" fill="rgba(255,255,255,0.65)" />
        </marker>
      </defs>

      <PitchLines scenario={scenario} />

      {/* Static zone lines */}
      {lines.map(ln => (
        <line key={ln.id} x1={ln.x1} y1={ln.y1} x2={ln.x2} y2={ln.y2}
          stroke="rgba(255,255,0,0.85)" strokeWidth="1.2"
          strokeDasharray={ln.style === 'dashed' ? '4 3' : undefined}
          strokeLinecap="round" />
      ))}

      {/* Movement arrows (next-frame preview) */}
      {arrows.map(a => (
        <line key={`arrow-${a.id}`} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
          stroke={a.color} strokeWidth="1" strokeDasharray="2.5 1.5"
          markerEnd="url(#ah)" opacity="0.8" />
      ))}

      {/* Line-in-progress */}
      {lineStart && <circle cx={lineStart.x} cy={lineStart.y} r="1.5" fill="yellow" opacity="0.8" />}

      {/* Players */}
      {frame.players.map(p => {
        const col = PLAYER_COLORS.find(c => c.id === p.color)!
        return (
          <g key={p.id} transform={`translate(${p.x} ${p.y})`}
            onPointerDown={isPlaying ? undefined : e => onDraggablePointerDown(e, p.id)}
            style={{ cursor: isPlaying ? 'default' : activeTool === 'select' ? 'grab' : 'default' }}>
            <circle r="4" fill={col.fill} stroke={col.stroke} strokeWidth="0.7" opacity="0.95" />
            <text textAnchor="middle" dominantBaseline="central" fill="white" fontSize="3" fontWeight="bold"
              style={{ pointerEvents: 'none', userSelect: 'none' }}>{p.label}</text>
          </g>
        )
      })}

      {/* Balls */}
      {frame.balls.map(b => (
        <g key={b.id} transform={`translate(${b.x} ${b.y})`}
          onPointerDown={isPlaying ? undefined : e => onDraggablePointerDown(e, b.id)}
          style={{ cursor: isPlaying ? 'default' : activeTool === 'select' ? 'grab' : 'default' }}>
          <g transform="scale(0.42)"><FootballIcon /></g>
        </g>
      ))}
    </svg>
  )
}

// ── Controls panel ────────────────────────────────────────────────────────────

function ControlsPanel({
  board, currentFrame, activeTool, lineStyle, activeColor, lineStart, isPlaying,
  setActiveTool, setLineStyle, setActiveColor, setLineStart,
  addPlayer, removeLastPlayer, addBall, removeLastBall, removeLastLine, clearBoard,
}: {
  board: BoardData
  currentFrame: BoardFrame
  activeTool: 'select' | 'line'
  lineStyle: 'solid' | 'dashed'
  activeColor: BoardPlayer['color']
  lineStart: { x: number; y: number } | null
  isPlaying: boolean
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
  const disabled = isPlaying
  return (
    <div className="space-y-4">
      {/* Tool */}
      <div>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Tool</p>
        <div className="flex bg-gray-800 rounded-lg p-1">
          {(['select', 'line'] as const).map(t => (
            <button key={t} disabled={disabled}
              onClick={() => { setActiveTool(t); if (t === 'select') setLineStart(null) }}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-40 ${activeTool === t ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>
              {t === 'select' ? 'Move' : 'Line'}
            </button>
          ))}
        </div>
        {activeTool === 'line' && !isPlaying && (
          <div className="mt-2 space-y-1.5">
            <div className="flex bg-gray-800 rounded-lg p-1">
              {(['solid', 'dashed'] as const).map(s => (
                <button key={s} onClick={() => setLineStyle(s)}
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${lineStyle === s ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>
                  {s}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-500">{lineStart ? 'Tap canvas for end point' : 'Tap canvas for start point'}</p>
          </div>
        )}
      </div>

      {/* Players */}
      <div>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Players</p>
        <div className="space-y-1.5">
          {PLAYER_COLORS.map(c => (
            <button key={c.id} disabled={disabled} onClick={() => setActiveColor(c.id)}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border disabled:opacity-40 ${activeColor === c.id ? 'border-white/30 bg-gray-700 text-white' : 'border-transparent bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'}`}>
              <Circle size={9} fill={c.fill} color={c.fill} />
              <span className="flex-1 text-left">{c.label}</span>
              <span className="text-gray-500 font-normal">{currentFrame.players.filter(p => p.color === c.id).length}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 mt-2">
          <button disabled={disabled} onClick={addPlayer}
            className="flex-1 flex items-center justify-center gap-1 text-xs bg-gray-800 hover:bg-gray-700 text-white py-1.5 rounded-lg transition-colors disabled:opacity-40">
            <Plus size={11} /> Add
          </button>
          <button disabled={disabled || currentFrame.players.filter(p => p.color === activeColor).length === 0} onClick={removeLastPlayer}
            className="flex-1 flex items-center justify-center gap-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white disabled:opacity-30 py-1.5 rounded-lg transition-colors">
            <Minus size={11} /> Remove
          </button>
        </div>
      </div>

      {/* Ball */}
      <div>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Ball</p>
        <div className="flex gap-1.5">
          <button disabled={disabled} onClick={addBall}
            className="flex-1 flex items-center justify-center gap-1 text-xs bg-gray-800 hover:bg-gray-700 text-white py-1.5 rounded-lg transition-colors disabled:opacity-40">
            <Plus size={11} /> Add
          </button>
          <button disabled={disabled || currentFrame.balls.length === 0} onClick={removeLastBall}
            className="flex-1 flex items-center justify-center gap-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white disabled:opacity-30 py-1.5 rounded-lg transition-colors">
            <Minus size={11} /> Remove
          </button>
        </div>
      </div>

      {/* Lines / clear */}
      <div className="space-y-1.5">
        {board.lines.length > 0 && (
          <button disabled={disabled} onClick={removeLastLine}
            className="w-full flex items-center justify-center gap-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white disabled:opacity-40 py-1.5 rounded-lg transition-colors">
            <Minus size={11} /> Undo Line
          </button>
        )}
        {(currentFrame.players.length > 0 || currentFrame.balls.length > 0 || board.lines.length > 0) && (
          <button disabled={disabled} onClick={clearBoard}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-red-400 hover:text-red-300 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 py-1.5 rounded-lg transition-colors">
            <Trash2 size={11} /> Clear Frame
          </button>
        )}
      </div>
    </div>
  )
}

// ── Frame strip ───────────────────────────────────────────────────────────────

function FrameStrip({
  count, currentIdx, isPlaying,
  onSelect, onAdd, onDelete,
}: {
  count: number
  currentIdx: number
  isPlaying: boolean
  onSelect: (i: number) => void
  onAdd: () => void
  onDelete: (i: number) => void
}) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="relative shrink-0 group">
          <button
            onClick={() => !isPlaying && onSelect(i)}
            className={`w-9 h-9 rounded-lg text-xs font-bold transition-colors ${currentIdx === i ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            {i + 1}
          </button>
          {count > 1 && !isPlaying && (
            <button
              onClick={() => onDelete(i)}
              className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-gray-700 hover:bg-red-500 rounded-full items-center justify-center hidden group-hover:flex transition-colors z-10"
            >
              <X size={7} />
            </button>
          )}
        </div>
      ))}
      {!isPlaying && (
        <button
          onClick={onAdd}
          className="shrink-0 w-9 h-9 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-lg flex items-center justify-center transition-colors"
          title="Add frame"
        >
          <Plus size={14} />
        </button>
      )}
    </div>
  )
}

// ── Playback bar ──────────────────────────────────────────────────────────────

function PlaybackBar({
  isPlaying, frameCount, currentIdx, speed, loop,
  onPlay, onPause, onPrev, onNext, onSpeedChange, onLoopToggle, onReset,
}: {
  isPlaying: boolean
  frameCount: number
  currentIdx: number
  speed: number
  loop: boolean
  onPlay: () => void
  onPause: () => void
  onPrev: () => void
  onNext: () => void
  onSpeedChange: (v: number) => void
  onLoopToggle: () => void
  onReset: () => void
}) {
  if (frameCount <= 1) return null
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 px-4 py-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Playback</p>
        <span className="text-xs text-gray-500">{isPlaying ? 'Playing…' : `Frame ${currentIdx + 1} / ${frameCount}`}</span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all"
          style={{ width: `${((currentIdx) / Math.max(1, frameCount - 1)) * 100}%` }}
        />
      </div>

      <div className="flex items-center gap-2">
        {/* Transport */}
        <button onClick={onReset} disabled={isPlaying}
          className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white disabled:opacity-40 transition-colors">
          <RefreshCw size={13} />
        </button>
        <button onClick={onPrev} disabled={isPlaying || currentIdx === 0}
          className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white disabled:opacity-40 transition-colors">
          <ChevronLeft size={13} />
        </button>
        <button
          onClick={isPlaying ? onPause : onPlay}
          className="px-4 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-semibold transition-colors"
        >
          {isPlaying ? <Pause size={13} /> : <Play size={13} />}
        </button>
        <button onClick={onNext} disabled={isPlaying || currentIdx >= frameCount - 1}
          className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white disabled:opacity-40 transition-colors">
          <ChevronRight size={13} />
        </button>

        {/* Speed */}
        <div className="flex bg-gray-800 rounded-lg p-0.5 ml-auto">
          {SPEEDS.map(sp => (
            <button key={sp.label} onClick={() => onSpeedChange(sp.value)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${speed === sp.value ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-white'}`}>
              {sp.label}
            </button>
          ))}
        </div>

        {/* Loop */}
        <button onClick={onLoopToggle}
          className={`p-1.5 rounded-lg transition-colors text-xs ${loop ? 'bg-green-600/30 text-green-400' : 'bg-gray-800 text-gray-500 hover:text-white'}`}
          title="Loop">
          <RefreshCw size={11} />
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BoardClient({ exercise }: { exercise: Exercise }) {
  const router = useRouter()
  const supabase = createClient()

  // ── Board state ──
  const [board, setBoard] = useState<BoardData>(() => migrateBoard(exercise.board))
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0)

  // ── Editing state ──
  const [activeTool, setActiveTool] = useState<'select' | 'line'>('select')
  const [lineStart, setLineStart] = useState<{ x: number; y: number } | null>(null)
  const [lineStyle, setLineStyle] = useState<'solid' | 'dashed'>('solid')
  const [activeColor, setActiveColor] = useState<BoardPlayer['color']>('blue')
  const [dragging, setDragging] = useState<string | null>(null)

  // ── Playback state ──
  const [isPlaying, setIsPlaying] = useState(false)
  const [playhead, setPlayhead] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [loop, setLoop] = useState(false)

  // ── UI state ──
  const [isMaximized, setIsMaximized] = useState(false)
  const [saving, setSaving] = useState(false)

  const inlineSvgRef = useRef<SVGSVGElement>(null)
  const modalSvgRef = useRef<SVGSVGElement>(null)

  // ── Refs for rAF loop ──
  const isPlayingRef = useRef(false)
  const playheadRef = useRef(0)
  const speedRef = useRef(speed)
  const boardRef = useRef(board)
  const loopRef = useRef(loop)
  useEffect(() => { speedRef.current = speed }, [speed])
  useEffect(() => { boardRef.current = board }, [board])
  useEffect(() => { loopRef.current = loop }, [loop])

  // ── Derived ──
  const currentFrame = board.frames[Math.min(currentFrameIdx, board.frames.length - 1)] ?? { players: [], balls: [] }
  const displayFrame = isPlaying ? getLerpedFrame(board.frames, playhead) : currentFrame
  const arrows = isPlaying ? [] : getArrows(board.frames, currentFrameIdx)

  // ── Coord helpers ──
  function svgCoords(e: React.PointerEvent, ref: React.RefObject<SVGSVGElement | null>) {
    const rect = ref.current!.getBoundingClientRect()
    return {
      x: Math.min(VB_W, Math.max(0, ((e.clientX - rect.left) / rect.width) * VB_W)),
      y: Math.min(VB_H, Math.max(0, ((e.clientY - rect.top) / rect.height) * VB_H)),
    }
  }

  // ── Frame mutations ──
  function updateCurrentFrame(patch: Partial<BoardFrame>) {
    setBoard(b => {
      const frames = b.frames.map((f, i) => i === currentFrameIdx ? { ...f, ...patch } : f)
      return { ...b, frames }
    })
  }

  // ── Players ──
  function addPlayer() {
    const sameColor = currentFrame.players.filter(p => p.color === activeColor).length
    updateCurrentFrame({
      players: [...currentFrame.players, {
        id: uid(), color: activeColor, label: String(sameColor + 1),
        x: 35 + Math.random() * 30, y: 50 + Math.random() * 40,
      }],
    })
  }
  function removeLastPlayer() {
    const sameColor = currentFrame.players.filter(p => p.color === activeColor)
    if (!sameColor.length) return
    const lastId = sameColor[sameColor.length - 1].id
    updateCurrentFrame({ players: currentFrame.players.filter(p => p.id !== lastId) })
  }

  // ── Balls ──
  function addBall() {
    updateCurrentFrame({
      balls: [...currentFrame.balls, { id: uid(), x: 45 + Math.random() * 10, y: 60 + Math.random() * 20 }],
    })
  }
  function removeLastBall() {
    if (!currentFrame.balls.length) return
    updateCurrentFrame({ balls: currentFrame.balls.slice(0, -1) })
  }

  // ── Drag ──
  const handleDraggablePointerDown = useCallback((e: React.PointerEvent<SVGGElement>, id: string) => {
    if (activeTool !== 'select') return
    e.stopPropagation()
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    setDragging(id)
  }, [activeTool])

  function makeMoveHandler(ref: React.RefObject<SVGSVGElement | null>) {
    return (e: React.PointerEvent<SVGSVGElement>) => {
      if (!dragging) return
      const { x, y } = svgCoords(e, ref)
      setBoard(b => {
        const frames = b.frames.map((f, i) => {
          if (i !== currentFrameIdx) return f
          return {
            ...f,
            players: f.players.map(p => p.id === dragging ? { ...p, x, y } : p),
            balls: f.balls.map(bl => bl.id === dragging ? { ...bl, x, y } : bl),
          }
        })
        return { ...b, frames }
      })
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
  function removeLastLine() { setBoard(b => ({ ...b, lines: b.lines.slice(0, -1) })) }

  function clearBoard() {
    if (!confirm('Clear players, balls and lines from this frame?')) return
    updateCurrentFrame({ players: [], balls: [] })
    setBoard(b => ({ ...b, lines: [] }))
    setLineStart(null)
  }

  // ── Frames ──
  function addFrame() {
    const copy: BoardFrame = {
      players: currentFrame.players.map(p => ({ ...p })),
      balls: currentFrame.balls.map(b => ({ ...b })),
    }
    setBoard(b => ({ ...b, frames: [...b.frames, copy] }))
    setCurrentFrameIdx(board.frames.length)
  }
  function deleteFrame(idx: number) {
    if (board.frames.length <= 1) return
    setBoard(b => ({ ...b, frames: b.frames.filter((_, i) => i !== idx) }))
    setCurrentFrameIdx(prev => Math.min(prev, board.frames.length - 2))
  }
  function selectFrame(idx: number) {
    setCurrentFrameIdx(idx)
    setPlayhead(idx)
  }

  // ── Playback ──
  function startPlay() {
    if (board.frames.length <= 1) return
    const startHead = currentFrameIdx >= board.frames.length - 1 ? 0 : currentFrameIdx
    isPlayingRef.current = true
    playheadRef.current = startHead
    setPlayhead(startHead)
    setCurrentFrameIdx(startHead)
    setIsPlaying(true)
  }

  useEffect(() => {
    if (!isPlaying) return
    let lastTime: number | null = null
    let raf: number

    function tick(time: number) {
      if (!isPlayingRef.current) return
      if (lastTime !== null) {
        const dt = (time - lastTime) / 1000
        playheadRef.current += dt * speedRef.current
        const maxHead = boardRef.current.frames.length - 1
        if (playheadRef.current >= maxHead) {
          if (loopRef.current) {
            playheadRef.current = 0
          } else {
            playheadRef.current = maxHead
            setPlayhead(maxHead)
            setCurrentFrameIdx(maxHead)
            isPlayingRef.current = false
            setIsPlaying(false)
            return
          }
        }
        setPlayhead(playheadRef.current)
        setCurrentFrameIdx(Math.round(playheadRef.current))
      }
      lastTime = time
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); isPlayingRef.current = false }
  }, [isPlaying])

  function pausePlay() { isPlayingRef.current = false; setIsPlaying(false) }
  function resetPlay() { setCurrentFrameIdx(0); setPlayhead(0) }

  // ── Save ──
  async function save() {
    setSaving(true)
    await supabase.from('exercises').update({ board }).eq('id', exercise.id)
    setSaving(false)
    router.push('/training')
  }

  // ── Shared props ──
  const sharedSvgProps = (ref: React.RefObject<SVGSVGElement | null>) => ({
    scenario: board.scenario,
    lines: board.lines,
    frame: displayFrame,
    arrows,
    dragging,
    activeTool,
    lineStart,
    isPlaying,
    svgRef: ref,
    onPointerMove: makeMoveHandler(ref),
    onPointerUp: handlePointerUp,
    onSvgClick: makeClickHandler(ref),
    onDraggablePointerDown: handleDraggablePointerDown,
  })

  const controlsProps = {
    board, currentFrame, activeTool, lineStyle, activeColor, lineStart, isPlaying,
    setActiveTool, setLineStyle, setActiveColor, setLineStart,
    addPlayer, removeLastPlayer, addBall, removeLastBall, removeLastLine, clearBoard,
  }

  const playbackProps = {
    isPlaying, frameCount: board.frames.length, currentIdx: currentFrameIdx, speed, loop,
    onPlay: startPlay, onPause: pausePlay,
    onPrev: () => selectFrame(Math.max(0, currentFrameIdx - 1)),
    onNext: () => selectFrame(Math.min(board.frames.length - 1, currentFrameIdx + 1)),
    onSpeedChange: setSpeed,
    onLoopToggle: () => setLoop(v => !v),
    onReset: resetPlay,
  }

  // ── Inline layout ─────────────────────────────────────────────────────────

  const canvasBlock = (ref: React.RefObject<SVGSVGElement | null>, withExpand = false) => (
    <div className="relative flex-shrink-0" style={{ width: 'min(55vw, 260px)' }}>
      <div className="rounded-xl overflow-hidden border border-gray-800">
        <BoardSVG {...sharedSvgProps(ref)} className="w-full" />
      </div>
      {withExpand && (
        <button onClick={() => setIsMaximized(true)} title="Expand"
          className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/90 text-white p-1.5 rounded-lg transition-colors">
          <Maximize2 size={14} />
        </button>
      )}
    </div>
  )

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
            <p className="text-xs text-gray-500">Drill Board · {board.frames.length} frame{board.frames.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={save} disabled={saving}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        {/* Scenario */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {SCENARIOS.map(sc => (
            <button key={sc.id} disabled={isPlaying}
              onClick={() => setBoard(b => ({ ...b, scenario: sc.id }))}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-40 ${board.scenario === sc.id ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              {sc.label}
            </button>
          ))}
        </div>

        {/* Side-by-side */}
        <div className="flex gap-4 items-start">
          {canvasBlock(inlineSvgRef, true)}
          <div className="flex-1 min-w-0">
            <ControlsPanel {...controlsProps} />
          </div>
        </div>

        {/* Frame strip */}
        <FrameStrip
          count={board.frames.length} currentIdx={currentFrameIdx} isPlaying={isPlaying}
          onSelect={selectFrame} onAdd={addFrame} onDelete={deleteFrame}
        />

        {/* Playback */}
        <PlaybackBar {...playbackProps} />
      </div>

      {/* ── Fullscreen modal ────────────────────────────────────────────── */}
      {isMaximized && (
        <div className="fixed inset-0 bg-black/95 z-50 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <div className="flex flex-col gap-4 p-4 max-w-md mx-auto pb-8">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-white font-bold truncate">{exercise.name}</p>
                  <p className="text-xs text-gray-500">{board.frames.length} frame{board.frames.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={save} disabled={saving}
                    className="bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => { setIsMaximized(false); setDragging(null) }}
                    className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                {SCENARIOS.map(sc => (
                  <button key={sc.id} disabled={isPlaying}
                    onClick={() => setBoard(b => ({ ...b, scenario: sc.id }))}
                    className={`shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-40 ${board.scenario === sc.id ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                    {sc.label}
                  </button>
                ))}
              </div>
              <div className="rounded-xl overflow-hidden border border-gray-800">
                <BoardSVG {...sharedSvgProps(modalSvgRef)} className="w-full" />
              </div>
              <FrameStrip
                count={board.frames.length} currentIdx={currentFrameIdx} isPlaying={isPlaying}
                onSelect={selectFrame} onAdd={addFrame} onDelete={deleteFrame}
              />
              <PlaybackBar {...playbackProps} />
              <ControlsPanel {...controlsProps} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
