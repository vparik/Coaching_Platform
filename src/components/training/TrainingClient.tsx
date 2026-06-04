'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TrainingSession } from '@/types'
import { Plus, X, Trash2, Pencil } from 'lucide-react'

const INTENSITY_STYLES = {
  low: 'bg-blue-500/20 text-blue-400',
  medium: 'bg-amber-500/20 text-amber-400',
  high: 'bg-red-500/20 text-red-400',
}

const PHASE_STYLES = {
  recovery: 'bg-teal-500/20 text-teal-400',
  prep: 'bg-purple-500/20 text-purple-400',
  development: 'bg-indigo-500/20 text-indigo-400',
}

type FormState = {
  date: string; time: string; objective: string
  intensity: 'low' | 'medium' | 'high'; phase: 'recovery' | 'prep' | 'development'; notes: string
}

const emptyForm: FormState = {
  date: '', time: '', objective: '', intensity: 'medium', phase: 'prep', notes: '',
}

export default function TrainingClient({ sessions, teamId }: { sessions: TrainingSession[]; teamId: string | null | undefined }) {
  const [showForm, setShowForm] = useState(false)
  const [editingSession, setEditingSession] = useState<TrainingSession | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const router = useRouter()
  const supabase = createClient()

  function startEdit(s: TrainingSession) {
    setForm({ date: s.date, time: s.time ?? '', objective: s.objective, intensity: s.intensity, phase: s.phase, notes: s.notes ?? '' })
    setEditingSession(s)
    setShowForm(true)
  }

  function reset() {
    setForm(emptyForm)
    setEditingSession(null)
    setShowForm(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!teamId) return
    const payload = { team_id: teamId, ...form, time: form.time || null, notes: form.notes || null }

    if (editingSession) {
      await supabase.from('training_sessions').update(payload).eq('id', editingSession.id)
    } else {
      await supabase.from('training_sessions').insert(payload)
    }
    reset()
    router.refresh()
  }

  async function deleteSession(id: string) {
    if (!confirm('Delete this session?')) return
    await supabase.from('training_sessions').delete().eq('id', id)
    router.refresh()
  }

  const grouped = sessions.reduce<Record<string, TrainingSession[]>>((acc, s) => {
    const week = getWeekLabel(s.date)
    if (!acc[week]) acc[week] = []
    acc[week].push(s)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Training Planner</h1>
          <p className="text-gray-400 text-sm mt-0.5">{sessions.length} sessions planned</p>
        </div>
        <button
          onClick={() => { reset(); setShowForm(true) }}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} /> New Session
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">{editingSession ? 'Edit Session' : 'New Session'}</h2>
            <button onClick={reset} className="text-gray-500 hover:text-white"><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                <select value={form.intensity} onChange={e => setForm({ ...form, intensity: e.target.value as FormState['intensity'] })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Phase</label>
                <select value={form.phase} onChange={e => setForm({ ...form, phase: e.target.value as FormState['phase'] })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500">
                  <option value="recovery">Recovery</option>
                  <option value="prep">Prep</option>
                  <option value="development">Development</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg">
                {editingSession ? 'Save Changes' : 'Add Session'}
              </button>
              <button type="button" onClick={reset} className="text-gray-400 text-sm px-4 py-2.5 rounded-lg hover:text-white">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {Object.keys(grouped).length === 0 && (
        <div className="text-center py-12 text-gray-500">No training sessions planned yet.</div>
      )}

      {Object.entries(grouped).map(([week, weekSessions]) => (
        <div key={week}>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{week}</h2>
          <div className="space-y-2">
            {weekSessions.map(s => (
              <div key={s.id} className="bg-gray-900 rounded-xl border border-gray-800 px-4 py-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{s.objective}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(s.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
                      {s.time && ` · ${s.time}`}
                    </p>
                    {s.notes && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{s.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${INTENSITY_STYLES[s.intensity]}`}>{s.intensity}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${PHASE_STYLES[s.phase]}`}>{s.phase}</span>
                  </div>
                </div>
                <div className="flex gap-3 mt-2">
                  <button onClick={() => startEdit(s)} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                    <Pencil size={12} /> Edit
                  </button>
                  <button onClick={() => deleteSession(s.id)} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300">
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function getWeekLabel(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const startOfThisWeek = new Date(now)
  startOfThisWeek.setDate(now.getDate() - now.getDay() + 1)
  startOfThisWeek.setHours(0, 0, 0, 0)
  const startOfNextWeek = new Date(startOfThisWeek)
  startOfNextWeek.setDate(startOfThisWeek.getDate() + 7)

  if (date >= startOfThisWeek && date < startOfNextWeek) return 'This Week'
  if (date >= startOfNextWeek && date < new Date(startOfNextWeek.getTime() + 7 * 86400000)) return 'Next Week'
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/\d+/, w => {
    const d = parseInt(w)
    return `Week of ${d}`
  })
}
