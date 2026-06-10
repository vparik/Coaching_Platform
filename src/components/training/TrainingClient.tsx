'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TrainingSession, Exercise, SessionBlock, ExerciseCategory, UserRole } from '@/types'
import Link from 'next/link'
import {
  Plus, X, Trash2, Pencil, ChevronLeft, ChevronRight,
  Calendar, List, BookOpen, ChevronUp, ChevronDown, Layout,
} from 'lucide-react'

// ── Styles ────────────────────────────────────────────────────────────────────

const INTENSITY_STYLES = {
  low: 'bg-blue-500/20 text-blue-400',
  medium: 'bg-amber-500/20 text-amber-400',
  high: 'bg-red-500/20 text-red-400',
}
const INTENSITY_DOT = { low: 'bg-blue-400', medium: 'bg-amber-400', high: 'bg-red-400' }
const PHASE_STYLES = {
  recovery: 'bg-teal-500/20 text-teal-400',
  prep: 'bg-purple-500/20 text-purple-400',
  development: 'bg-indigo-500/20 text-indigo-400',
}
const CATEGORY_STYLES: Record<ExerciseCategory, string> = {
  'warm-up':   'bg-orange-500/20 text-orange-400',
  'technical': 'bg-sky-500/20 text-sky-400',
  'tactical':  'bg-violet-500/20 text-violet-400',
  'physical':  'bg-red-500/20 text-red-400',
  'set-piece': 'bg-cyan-500/20 text-cyan-400',
  'cool-down': 'bg-teal-500/20 text-teal-400',
  'general':   'bg-gray-500/20 text-gray-400',
}
const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  'warm-up': 'Warm-up', 'technical': 'Technical', 'tactical': 'Tactical',
  'physical': 'Physical', 'set-piece': 'Set Piece', 'cool-down': 'Cool-down', 'general': 'General',
}
const CATEGORY_ORDER: ExerciseCategory[] = ['warm-up', 'technical', 'tactical', 'physical', 'set-piece', 'cool-down', 'general']

// ── Types ─────────────────────────────────────────────────────────────────────

type SessionFormState = {
  date: string; time: string; objective: string
  intensity: 'low' | 'medium' | 'high'; phase: 'recovery' | 'prep' | 'development'; notes: string
}
const emptySessionForm: SessionFormState = {
  date: '', time: '', objective: '', intensity: 'medium', phase: 'prep', notes: '',
}

type BlockItem = {
  tempId: string
  id?: string
  source: 'library' | 'custom'
  exercise_id: string | null
  free_text: string
  duration: number
}

type ExerciseFormState = {
  name: string; category: ExerciseCategory; default_duration: number; description: string
}
const emptyExerciseForm: ExerciseFormState = {
  name: '', category: 'general', default_duration: 15, description: '',
}

type MatchBasic = { id: string; opponent: string; date: string; venue: string }

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function parseDate(dateStr: string) { return new Date(dateStr + 'T12:00:00') }
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}
function getDaysOfWeek(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })
}
function getWeekLabel(dateStr: string): string {
  const date = parseDate(dateStr)
  const now = new Date()
  const startOfThisWeek = getWeekStart(now)
  const startOfNextWeek = new Date(startOfThisWeek)
  startOfNextWeek.setDate(startOfThisWeek.getDate() + 7)
  if (date >= startOfThisWeek && date < startOfNextWeek) return 'This Week'
  if (date >= startOfNextWeek && date < new Date(startOfNextWeek.getTime() + 7 * 86400000)) return 'Next Week'
  const weekOf = getWeekStart(date)
  return `Week of ${weekOf.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
}
function totalMinutes(blocks: BlockItem[]) {
  return blocks.reduce((sum, b) => sum + (Number(b.duration) || 0), 0)
}
let _tid = 0
function newTempId() { return `t${++_tid}` }

// ── Component ─────────────────────────────────────────────────────────────────

export default function TrainingClient({
  sessions, teamId, matches, exercises, role = 'coach',
}: {
  sessions: TrainingSession[]
  teamId: string | null | undefined
  matches: MatchBasic[]
  exercises: Exercise[]
  role?: UserRole
}) {
  const router = useRouter()
  const supabase = createClient()

  // Top-level tab
  const [tab, setTab] = useState<'sessions' | 'library'>('sessions')

  // ── Sessions state ──
  const [view, setView] = useState<'week' | 'list'>('week')
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()))
  const [activeDay, setActiveDay] = useState<string>(() => toDateStr(new Date()))
  const [showForm, setShowForm] = useState(false)
  const [editingSession, setEditingSession] = useState<TrainingSession | null>(null)
  const [form, setForm] = useState<SessionFormState>(emptySessionForm)
  const [blocks, setBlocks] = useState<BlockItem[]>([])

  // ── Library state ──
  const [showExerciseForm, setShowExerciseForm] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  const [exerciseForm, setExerciseForm] = useState<ExerciseFormState>(emptyExerciseForm)

  // ── Derived ──
  const todayStr = toDateStr(new Date())
  const days = getDaysOfWeek(weekStart)
  const weekLabel = `${days[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} — ${days[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`

  const sessionsByDate = sessions.reduce<Record<string, TrainingSession[]>>((acc, s) => {
    if (!acc[s.date]) acc[s.date] = []
    acc[s.date].push(s)
    return acc
  }, {})
  const matchByDate = matches.reduce<Record<string, MatchBasic>>((acc, m) => { acc[m.date] = m; return acc }, {})
  const exerciseMap = exercises.reduce<Record<string, Exercise>>((acc, e) => { acc[e.id] = e; return acc }, {})

  const grouped = sessions.reduce<Record<string, TrainingSession[]>>((acc, s) => {
    const week = getWeekLabel(s.date)
    if (!acc[week]) acc[week] = []
    acc[week].push(s)
    return acc
  }, {})

  // ── Week navigation ──
  function shiftWeek(delta: number) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + delta * 7)
    setWeekStart(d)
    const newDays = getDaysOfWeek(d)
    const todayInWeek = newDays.find(day => toDateStr(day) === todayStr)
    setActiveDay(todayInWeek ? todayStr : toDateStr(newDays[0]))
  }
  function goToToday() { setWeekStart(getWeekStart(new Date())); setActiveDay(todayStr) }

  // ── Session form ──
  function openFormForDay(dateStr: string) {
    setForm({ ...emptySessionForm, date: dateStr })
    setBlocks([])
    setEditingSession(null)
    setShowForm(true)
  }
  function startEdit(s: TrainingSession) {
    setForm({ date: s.date, time: s.time ?? '', objective: s.objective, intensity: s.intensity, phase: s.phase, notes: s.notes ?? '' })
    setBlocks(
      [...(s.session_blocks ?? [])].sort((a, b) => a.position - b.position).map(b => ({
        tempId: newTempId(),
        id: b.id,
        source: b.exercise_id ? 'library' : 'custom' as 'library' | 'custom',
        exercise_id: b.exercise_id,
        free_text: b.free_text ?? '',
        duration: b.duration,
      }))
    )
    setEditingSession(s)
    setShowForm(true)
  }
  function resetSessionForm() {
    setForm(emptySessionForm); setBlocks([]); setEditingSession(null); setShowForm(false)
  }
  async function handleSessionSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!teamId) return
    const payload = { team_id: teamId, ...form, time: form.time || null, notes: form.notes || null }
    let sessionId: string
    if (editingSession) {
      await supabase.from('training_sessions').update(payload).eq('id', editingSession.id)
      sessionId = editingSession.id
      await supabase.from('session_blocks').delete().eq('session_id', sessionId)
    } else {
      const { data } = await supabase.from('training_sessions').insert(payload).select('id').single()
      sessionId = data!.id
    }
    if (blocks.length > 0) {
      await supabase.from('session_blocks').insert(
        blocks.map((b, i) => ({
          session_id: sessionId,
          exercise_id: b.source === 'library' ? b.exercise_id : null,
          free_text: b.source === 'custom' ? b.free_text || null : null,
          duration: Number(b.duration) || 15,
          position: i,
        }))
      )
    }
    resetSessionForm()
    router.refresh()
  }
  async function deleteSession(id: string) {
    if (!confirm('Delete this session?')) return
    await supabase.from('training_sessions').delete().eq('id', id)
    router.refresh()
  }

  // ── Block builder ──
  function addBlock(source: 'library' | 'custom') {
    setBlocks(prev => [...prev, { tempId: newTempId(), source, exercise_id: null, free_text: '', duration: 15 }])
  }
  function updateBlock(tempId: string, patch: Partial<BlockItem>) {
    setBlocks(prev => prev.map(b => b.tempId === tempId ? { ...b, ...patch } : b))
  }
  function removeBlock(tempId: string) {
    setBlocks(prev => prev.filter(b => b.tempId !== tempId))
  }
  function moveBlock(tempId: string, dir: 'up' | 'down') {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.tempId === tempId)
      if (dir === 'up' && idx > 0) {
        const next = [...prev];[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]; return next
      }
      if (dir === 'down' && idx < prev.length - 1) {
        const next = [...prev];[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]; return next
      }
      return prev
    })
  }
  function onExercisePick(tempId: string, exerciseId: string) {
    const ex = exerciseMap[exerciseId]
    updateBlock(tempId, { exercise_id: exerciseId, duration: ex?.default_duration ?? 15 })
  }

  // ── Exercise library ──
  function startEditExercise(ex: Exercise) {
    setExerciseForm({ name: ex.name, category: ex.category, default_duration: ex.default_duration, description: ex.description ?? '' })
    setEditingExercise(ex)
    setShowExerciseForm(true)
  }
  function resetExerciseForm() {
    setExerciseForm(emptyExerciseForm); setEditingExercise(null); setShowExerciseForm(false)
  }
  async function handleExerciseSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!teamId) return
    const payload = {
      team_id: teamId,
      name: exerciseForm.name,
      category: exerciseForm.category,
      default_duration: Number(exerciseForm.default_duration) || 15,
      description: exerciseForm.description || null,
    }
    if (editingExercise) {
      await supabase.from('exercises').update(payload).eq('id', editingExercise.id)
    } else {
      await supabase.from('exercises').insert(payload)
    }
    resetExerciseForm()
    router.refresh()
  }
  async function deleteExercise(id: string) {
    if (!confirm('Delete this exercise? Sessions using it will keep their block as free text.')) return
    await supabase.from('exercises').delete().eq('id', id)
    router.refresh()
  }

  // ── Grouped exercises by category ──
  const exercisesByCategory = CATEGORY_ORDER.reduce<Record<string, Exercise[]>>((acc, cat) => {
    const list = exercises.filter(e => e.category === cat)
    if (list.length) acc[cat] = list
    return acc
  }, {})

  // ══════════════════════════════════════════════════════════════════
  // Render
  // ══════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* ── Top header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Training</h1>
          <p className="text-gray-400 text-sm mt-0.5">{sessions.length} sessions</p>
        </div>
        {role === 'coach' && (
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setTab('sessions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === 'sessions' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Calendar size={13} /> Sessions
            </button>
            <button
              onClick={() => setTab('library')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === 'library' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <BookOpen size={13} /> Library
            </button>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════
          SESSIONS TAB
      ════════════════════════════════════════════════════════════ */}
      {tab === 'sessions' && (
        <div className="space-y-6">
          {/* Sub-toggle: Week / List */}
          <div className="flex items-center justify-between">
            <div className="flex bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setView('week')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'week' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <Calendar size={13} /> Week
              </button>
              <button
                onClick={() => setView('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'list' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <List size={13} /> List
              </button>
            </div>
            {view === 'list' && role === 'coach' && (
              <button
                onClick={() => { resetSessionForm(); setShowForm(true) }}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Plus size={16} /> New Session
              </button>
            )}
          </div>

          {/* Session form */}
          {showForm && (
            <SessionForm
              form={form} setForm={setForm}
              blocks={blocks}
              exercises={exercises}
              editingSession={editingSession}
              onSubmit={handleSessionSubmit}
              onCancel={resetSessionForm}
              onDelete={() => { resetSessionForm(); deleteSession(editingSession!.id) }}
              addBlock={addBlock}
              updateBlock={updateBlock}
              removeBlock={removeBlock}
              moveBlock={moveBlock}
              onExercisePick={onExercisePick}
            />
          )}

          {/* ── Week view ── */}
          {view === 'week' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={() => shiftWeek(-1)} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"><ChevronLeft size={16} /></button>
                  <span className="text-sm font-medium text-white w-44 text-center">{weekLabel}</span>
                  <button onClick={() => shiftWeek(1)} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"><ChevronRight size={16} /></button>
                </div>
                <button onClick={goToToday} className="text-xs text-green-400 hover:text-green-300 font-medium">Today</button>
              </div>

              {/* Desktop grid */}
              <div className="hidden md:grid grid-cols-7 gap-2">
                {days.map(day => {
                  const dateStr = toDateStr(day)
                  const daySessions = sessionsByDate[dateStr] ?? []
                  const isToday = dateStr === todayStr
                  const match = matchByDate[dateStr]
                  return (
                    <div key={dateStr} className="flex flex-col">
                      <div className={`text-center pb-2 mb-2 border-b ${isToday ? 'border-green-500/40' : 'border-gray-800'}`}>
                        <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">{day.toLocaleDateString('en-GB', { weekday: 'short' })}</p>
                        <p className={`text-xl font-bold mt-0.5 ${isToday ? 'text-green-400' : 'text-white'}`}>{day.getDate()}</p>
                        {match && <span className="inline-block mt-1 text-[10px] font-medium bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">vs {match.opponent}</span>}
                      </div>
                      <div className="flex-1 space-y-1.5 min-h-[80px]">
                        {daySessions.map(s => {
                          const blks = s.session_blocks ?? []
                          const mins = blks.reduce((sum, b) => sum + b.duration, 0)
                          return (
                            <div key={s.id} className="relative group">
                              {role === 'coach' && (
                                <button onClick={(e) => { e.stopPropagation(); deleteSession(s.id) }}
                                  className="absolute -top-1 -right-1 w-4 h-4 bg-gray-700 hover:bg-red-500 rounded-full items-center justify-center hidden group-hover:flex transition-colors z-10">
                                  <X size={8} />
                                </button>
                              )}
                              <div onClick={() => role === 'coach' && startEdit(s)} className={`bg-gray-800 rounded-lg px-2 py-1.5 transition-colors ${role === 'coach' ? 'hover:bg-gray-700 cursor-pointer' : ''}`}>
                                <p className="text-[11px] text-white font-medium leading-tight line-clamp-2">{s.objective}</p>
                                {blks.length > 0 && <p className="text-[10px] text-gray-500 mt-0.5">{blks.length} ex · {mins} min</p>}
                                {s.time && <p className="text-[10px] text-gray-500">{s.time}</p>}
                                <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full capitalize ${INTENSITY_STYLES[s.intensity]}`}>{s.intensity}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      {daySessions.length > 0 && (
                        <div className="flex gap-1 mt-2 justify-center">
                          {daySessions.map(s => <span key={s.id} className={`w-1.5 h-1.5 rounded-full ${INTENSITY_DOT[s.intensity]}`} />)}
                        </div>
                      )}
                                      {role === 'coach' && (
                        <button onClick={() => openFormForDay(dateStr)}
                          className="mt-2 w-full flex items-center justify-center gap-1 text-[11px] text-gray-600 hover:text-green-400 py-1.5 rounded-lg hover:bg-gray-800/50 transition-colors">
                          <Plus size={11} /> Add
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Mobile day strip */}
              <div className="md:hidden space-y-4">
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {days.map(day => {
                    const dateStr = toDateStr(day)
                    const isToday = dateStr === todayStr
                    const isActive = dateStr === activeDay
                    const count = (sessionsByDate[dateStr] ?? []).length
                    const hasMatch = !!matchByDate[dateStr]
                    return (
                      <button key={dateStr} onClick={() => setActiveDay(dateStr)}
                        className={`relative flex-shrink-0 flex flex-col items-center w-12 py-2 rounded-xl transition-colors ${isActive ? 'bg-green-600 text-white' : isToday ? 'bg-gray-800 text-green-400' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                        <span className="text-[10px] uppercase tracking-wider font-medium">{day.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                        <span className="text-lg font-bold leading-tight">{day.getDate()}</span>
                        {count > 0 && <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isActive ? 'bg-white/70' : 'bg-green-400'}`} />}
                        {hasMatch && <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-gray-950" />}
                      </button>
                    )
                  })}
                </div>
                {(() => {
                  const activeSessions = sessionsByDate[activeDay] ?? []
                  const activeDayDate = days.find(d => toDateStr(d) === activeDay) ?? days[0]
                  const activeMatch = matchByDate[activeDay]
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-300">{activeDayDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}</h3>
                        {activeMatch && <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">vs {activeMatch.opponent}</span>}
                      </div>
                      {activeSessions.length === 0
                        ? <div className="text-center py-6 text-gray-600 text-sm border border-dashed border-gray-800 rounded-xl">Rest day</div>
                        : activeSessions.map(s => <SessionCard key={s.id} session={s} onEdit={() => startEdit(s)} onDelete={() => deleteSession(s.id)} readOnly={role === 'player'} />)
                      }
                      {role === 'coach' && (
                        <button onClick={() => openFormForDay(activeDay)}
                          className="w-full flex items-center justify-center gap-2 border border-dashed border-gray-700 hover:border-green-500 text-gray-500 hover:text-green-400 text-sm py-3 rounded-xl transition-colors">
                          <Plus size={14} /> Add session for this day
                        </button>
                      )}
                    </div>
                  )
                })()}
              </div>
            </div>
          )}

          {/* ── List view ── */}
          {view === 'list' && (
            <>
              {Object.keys(grouped).length === 0 && !showForm && (
                <div className="text-center py-12 text-gray-500">No training sessions planned yet.</div>
              )}
              {Object.entries(grouped).map(([week, weekSessions]) => (
                <div key={week}>
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{week}</h2>
                  <div className="space-y-2">
                    {weekSessions.map(s => <SessionCard key={s.id} session={s} onEdit={() => startEdit(s)} onDelete={() => deleteSession(s.id)} showDate readOnly={role === 'player'} />)}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          LIBRARY TAB
      ════════════════════════════════════════════════════════════ */}
      {tab === 'library' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">{exercises.length} exercises saved</p>
            <button
              onClick={() => { resetExerciseForm(); setShowExerciseForm(true) }}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={16} /> New Exercise
            </button>
          </div>

          {/* Exercise form */}
          {showExerciseForm && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-white">{editingExercise ? 'Edit Exercise' : 'New Exercise'}</h2>
                <button onClick={resetExerciseForm} className="text-gray-500 hover:text-white"><X size={18} /></button>
              </div>
              <form onSubmit={handleExerciseSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">Name *</label>
                    <input value={exerciseForm.name} onChange={e => setExerciseForm({ ...exerciseForm, name: e.target.value })} required
                      placeholder="e.g. Rondo 5v2, High press drill"
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Category *</label>
                    <select value={exerciseForm.category} onChange={e => setExerciseForm({ ...exerciseForm, category: e.target.value as ExerciseCategory })}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500">
                      {CATEGORY_ORDER.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Default Duration (min) *</label>
                    <input type="number" min={1} max={180} value={exerciseForm.default_duration}
                      onChange={e => setExerciseForm({ ...exerciseForm, default_duration: parseInt(e.target.value) || 15 })}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">Description</label>
                    <textarea value={exerciseForm.description} onChange={e => setExerciseForm({ ...exerciseForm, description: e.target.value })} rows={3}
                      placeholder="Coaching points, rules, setup..."
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 resize-none" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg">
                    {editingExercise ? 'Save Changes' : 'Add Exercise'}
                  </button>
                  {editingExercise && (
                    <button type="button" onClick={() => { resetExerciseForm(); deleteExercise(editingExercise.id) }}
                      className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-sm px-4 py-2.5">
                      <Trash2 size={14} /> Delete
                    </button>
                  )}
                  <button type="button" onClick={resetExerciseForm} className="text-gray-400 text-sm px-4 py-2.5 hover:text-white">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* Exercise list grouped by category */}
          {exercises.length === 0 && !showExerciseForm && (
            <div className="text-center py-12 text-gray-500">
              <p>No exercises yet.</p>
              <p className="text-sm mt-1">Add exercises to your library and reuse them when building sessions.</p>
            </div>
          )}
          {Object.entries(exercisesByCategory).map(([cat, list]) => (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CATEGORY_STYLES[cat as ExerciseCategory]}`}>{CATEGORY_LABELS[cat as ExerciseCategory]}</span>
                <span className="text-xs text-gray-600">{list.length}</span>
              </div>
              <div className="space-y-2">
                {list.map(ex => (
                  <div key={ex.id} className="bg-gray-900 rounded-xl border border-gray-800 px-4 py-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{ex.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{ex.default_duration} min default</p>
                        {ex.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ex.description}</p>}
                      </div>
                      <div className="flex gap-3 ml-3">
                        <Link href={`/training/board?id=${ex.id}`} className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300"><Layout size={12} /> Board</Link>
                        <button onClick={() => startEditExercise(ex)} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"><Pencil size={12} /> Edit</button>
                        <button onClick={() => deleteExercise(ex.id)} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"><Trash2 size={12} /> Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Session form sub-component ────────────────────────────────────────────────

function SessionForm({
  form, setForm, blocks, exercises, editingSession,
  onSubmit, onCancel, onDelete, addBlock, updateBlock, removeBlock, moveBlock, onExercisePick,
}: {
  form: SessionFormState
  setForm: (f: SessionFormState) => void
  blocks: BlockItem[]
  exercises: Exercise[]
  editingSession: TrainingSession | null
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  onDelete: () => void
  addBlock: (source: 'library' | 'custom') => void
  updateBlock: (tempId: string, patch: Partial<BlockItem>) => void
  removeBlock: (tempId: string) => void
  moveBlock: (tempId: string, dir: 'up' | 'down') => void
  onExercisePick: (tempId: string, exerciseId: string) => void
}) {
  const total = totalMinutes(blocks)

  const groupedExercises = CATEGORY_ORDER.reduce<Record<string, Exercise[]>>((acc, cat) => {
    const list = exercises.filter(e => e.category === cat)
    if (list.length) acc[cat] = list
    return acc
  }, {})

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white">{editingSession ? 'Edit Session' : 'New Session'}</h2>
        <button onClick={onCancel} className="text-gray-500 hover:text-white"><X size={18} /></button>
      </div>
      <form onSubmit={onSubmit} className="space-y-5">
        {/* Basic fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Date *</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Time</label>
            <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-400 mb-1">Session Objective *</label>
            <input value={form.objective} onChange={e => setForm({ ...form, objective: e.target.value })} required
              placeholder="e.g. Pressing triggers, build-up play"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Intensity</label>
            <select value={form.intensity} onChange={e => setForm({ ...form, intensity: e.target.value as SessionFormState['intensity'] })}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500">
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Phase</label>
            <select value={form.phase} onChange={e => setForm({ ...form, phase: e.target.value as SessionFormState['phase'] })}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500">
              <option value="recovery">Recovery</option><option value="prep">Prep</option><option value="development">Development</option>
            </select>
          </div>
        </div>

        {/* Block builder */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Training Plan</label>
            {total > 0 && <span className="text-xs text-gray-400">{total} min total</span>}
          </div>

          {blocks.length > 0 && (
            <div className="space-y-2 mb-3">
              {blocks.map((block, idx) => (
                <div key={block.tempId} className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-600 w-4 shrink-0">{idx + 1}.</span>

                  {block.source === 'library' ? (
                    <select
                      value={block.exercise_id ?? ''}
                      onChange={e => onExercisePick(block.tempId, e.target.value)}
                      className="flex-1 bg-gray-700 border border-gray-600 text-white rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-green-500 min-w-0"
                    >
                      <option value="">Select exercise…</option>
                      {Object.entries(groupedExercises).map(([cat, list]) => (
                        <optgroup key={cat} label={CATEGORY_LABELS[cat as ExerciseCategory]}>
                          {list.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={block.free_text}
                      onChange={e => updateBlock(block.tempId, { free_text: e.target.value })}
                      placeholder="Custom exercise…"
                      className="flex-1 bg-gray-700 border border-gray-600 text-white rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-green-500 min-w-0"
                    />
                  )}

                  <input
                    type="number" min={1} max={180} value={block.duration}
                    onChange={e => updateBlock(block.tempId, { duration: parseInt(e.target.value) || 15 })}
                    className="w-14 bg-gray-700 border border-gray-600 text-white text-center rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-green-500 shrink-0"
                  />
                  <span className="text-[10px] text-gray-600 shrink-0">min</span>

                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button type="button" onClick={() => moveBlock(block.tempId, 'up')} disabled={idx === 0}
                      className="text-gray-600 hover:text-white disabled:opacity-20 transition-colors"><ChevronUp size={12} /></button>
                    <button type="button" onClick={() => moveBlock(block.tempId, 'down')} disabled={idx === blocks.length - 1}
                      className="text-gray-600 hover:text-white disabled:opacity-20 transition-colors"><ChevronDown size={12} /></button>
                  </div>
                  <button type="button" onClick={() => removeBlock(block.tempId)}
                    className="text-gray-600 hover:text-red-400 transition-colors shrink-0"><X size={14} /></button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={() => addBlock('library')}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors">
              <Plus size={12} /> From Library
            </button>
            <button type="button" onClick={() => addBlock('custom')}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors">
              <Plus size={12} /> Custom
            </button>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Notes</label>
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 resize-none" />
        </div>

        <div className="flex gap-3">
          <button type="submit" className="bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg">
            {editingSession ? 'Save Changes' : 'Add Session'}
          </button>
          {editingSession && (
            <button type="button" onClick={onDelete}
              className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-sm px-4 py-2.5">
              <Trash2 size={14} /> Delete
            </button>
          )}
          <button type="button" onClick={onCancel} className="text-gray-400 text-sm px-4 py-2.5 hover:text-white">Cancel</button>
        </div>
      </form>
    </div>
  )
}

// ── Session card (list + mobile day view) ─────────────────────────────────────

function SessionCard({ session, onEdit, onDelete, showDate = false, readOnly = false }: {
  session: TrainingSession; onEdit: () => void; onDelete: () => void; showDate?: boolean; readOnly?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const blks = session.session_blocks ?? []
  const totalMins = blks.reduce((sum, b) => sum + b.duration, 0)

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800">
      <div className="px-4 py-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 cursor-pointer" onClick={() => blks.length > 0 && setExpanded(!expanded)}>
            <p className="text-sm font-medium text-white">{session.objective}</p>
            {showDate && (
              <p className="text-xs text-gray-400 mt-0.5">
                {parseDate(session.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
                {session.time && ` · ${session.time}`}
              </p>
            )}
            {blks.length > 0 && (
              <p className="text-xs text-gray-500 mt-0.5">{blks.length} exercises · {totalMins} min</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 ml-3 shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${INTENSITY_STYLES[session.intensity]}`}>{session.intensity}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${PHASE_STYLES[session.phase]}`}>{session.phase}</span>
          </div>
        </div>
        <div className="flex gap-3 mt-2">
          {!readOnly && (
            <>
              <button onClick={onEdit} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"><Pencil size={12} /> Edit</button>
              <button onClick={onDelete} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"><Trash2 size={12} /> Delete</button>
            </>
          )}
          {blks.length > 0 && (
            <button onClick={() => setExpanded(!expanded)} className={`flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 ${!readOnly ? 'ml-auto' : ''}`}>
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Plan
            </button>
          )}
        </div>
      </div>

      {expanded && blks.length > 0 && (
        <div className="border-t border-gray-800 px-4 py-3 space-y-1.5">
          {[...blks].sort((a, b) => a.position - b.position).map((b, i) => {
            const name = b.exercises?.name ?? b.free_text ?? '—'
            const cat = b.exercises?.category
            return (
              <div key={b.id ?? i} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 w-4 shrink-0">{i + 1}.</span>
                <span className="text-xs text-white flex-1">{name}</span>
                {cat && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${CATEGORY_STYLES[cat]}`}>{CATEGORY_LABELS[cat]}</span>}
                <span className="text-xs text-gray-500 shrink-0">{b.duration} min</span>
              </div>
            )
          })}
          <div className="pt-1 border-t border-gray-800 flex justify-end">
            <span className="text-xs text-gray-400 font-medium">Total: {totalMins} min</span>
          </div>
        </div>
      )}
    </div>
  )
}
