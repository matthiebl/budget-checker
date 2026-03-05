import { useAppContext } from '../../store/AppContext'
import type { ColumnConfig, ColumnRole } from '../../types'

const ROLE_OPTIONS: { value: ColumnRole; label: string }[] = [
  { value: 'other', label: 'Other' },
  { value: 'date', label: 'Date' },
  { value: 'amount', label: 'Amount' },
  { value: 'description', label: 'Description' },
  { value: 'omit', label: 'Omit' },
]

interface ColumnConfigRowProps {
  config: ColumnConfig
  index: number
}

export function ColumnConfigRow({ config, index }: ColumnConfigRowProps) {
  const { dispatch } = useAppContext()

  function update(partial: Partial<ColumnConfig>) {
    dispatch({ type: 'UPDATE_COLUMN_CONFIG', payload: { index, update: partial } })
  }

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      {/* Column index */}
      <span className="text-xs text-gray-400 w-6 mt-2 text-right shrink-0">
        {index + 1}
      </span>

      {/* Display name */}
      <div className="flex-1 min-w-0">
        <input
          type="text"
          value={config.displayName}
          onChange={e => update({ displayName: e.target.value })}
          placeholder="Column name"
          className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-md focus:border-blue-400 focus:outline-none"
        />
        <p className="text-xs text-gray-400 mt-0.5 truncate">
          Original: {config.originalHeader}
        </p>
      </div>

      {/* Role selector */}
      <div className="shrink-0">
        <select
          value={config.role}
          onChange={e => update({ role: e.target.value as ColumnRole })}
          className={[
            'text-sm px-2 py-1.5 border rounded-md focus:outline-none focus:border-blue-400',
            config.role === 'omit' ? 'border-gray-200 text-gray-400 bg-gray-50' :
            config.role === 'date' ? 'border-blue-200 text-blue-700 bg-blue-50' :
            config.role === 'amount' ? 'border-green-200 text-green-700 bg-green-50' :
            config.role === 'description' ? 'border-purple-200 text-purple-700 bg-purple-50' :
            'border-gray-200 text-gray-600',
          ].join(' ')}
        >
          {ROLE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Date format */}
      {config.role === 'date' && (
        <div className="shrink-0">
          <input
            type="text"
            value={config.dateFormat ?? 'DD/MM/YYYY'}
            onChange={e => update({ dateFormat: e.target.value })}
            placeholder="DD/MM/YYYY"
            className="w-28 text-sm px-2 py-1.5 border border-blue-200 rounded-md focus:border-blue-400 focus:outline-none"
            title="Date format, e.g. DD/MM/YYYY or YYYY-MM-DD"
          />
        </div>
      )}

      {/* Negate amount */}
      {config.role === 'amount' && (
        <div className="flex items-center gap-1.5 shrink-0 mt-1.5">
          <input
            type="checkbox"
            id={`negate-${index}`}
            checked={config.negateAmount ?? false}
            onChange={e => update({ negateAmount: e.target.checked })}
            className="rounded border-gray-300 text-blue-600"
          />
          <label htmlFor={`negate-${index}`} className="text-xs text-gray-600 whitespace-nowrap">
            Negate (×−1)
          </label>
        </div>
      )}
    </div>
  )
}
