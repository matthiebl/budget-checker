import { useState } from 'react'
import { useAppContext } from '../../store/AppContext'
import { ColumnConfigRow } from './ColumnConfigRow'

export function ColumnConfigurator() {
  const { state } = useAppContext()
  const [expanded, setExpanded] = useState(true)

  if (state.columnConfigs.length === 0) return null

  const hasDate = state.columnConfigs.some(c => c.role === 'date')
  const hasAmount = state.columnConfigs.some(c => c.role === 'amount')

  return (
    <div className="mb-6 border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-700">Column Configuration</span>
          <div className="flex gap-1.5">
            {hasDate && (
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Date</span>
            )}
            {hasAmount && (
              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Amount</span>
            )}
            {!hasDate && (
              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">No date column set</span>
            )}
            {!hasAmount && (
              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">No amount column set</span>
            )}
          </div>
        </div>
        <span className="text-gray-400 text-sm">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-4 py-2">
          {state.columnConfigs.map((config, index) => (
            <ColumnConfigRow key={index} config={config} index={index} />
          ))}
        </div>
      )}
    </div>
  )
}
