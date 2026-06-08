import { ArrowUpDown } from 'lucide-react'
import { FORMATION_NAMES } from '@/lib/formations'

type Props = {
  ourFormation: string
  oppFormation: string
  onChange: (team: 'our' | 'opp', name: string) => void
  onSwap: () => void
  ourLabelClass?: string
  ourFocusClass?: string
}

export function FormationSelectors({
  ourFormation,
  oppFormation,
  onChange,
  onSwap,
  ourLabelClass = 'text-blue-400',
  ourFocusClass = 'focus:border-blue-500',
}: Props) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
      <div>
        <label className={`text-xs font-medium mb-1 block ${ourLabelClass}`}>Your formation</label>
        <select
          value={ourFormation}
          onChange={e => onChange('our', e.target.value)}
          className={`w-full bg-gray-900 border border-gray-800 text-white text-sm rounded-lg px-3 py-2 focus:outline-none ${ourFocusClass}`}
        >
          {FORMATION_NAMES.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      <button
        onClick={onSwap}
        title="Swap sides"
        className="p-2 mb-0.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowUpDown size={14} />
      </button>
      <div>
        <label className="text-xs font-medium text-red-400 mb-1 block">Opponent formation</label>
        <select
          value={oppFormation}
          onChange={e => onChange('opp', e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-red-500"
        >
          {FORMATION_NAMES.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
    </div>
  )
}
