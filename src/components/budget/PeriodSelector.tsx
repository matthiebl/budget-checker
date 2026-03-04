import type { Period } from '../../types'
import { PERIOD_LABELS } from '../../utils/budgetCalculations'

const PERIODS: Period[] = ['week', 'fortnight', 'month', 'year']

interface PeriodSelectorProps {
  value: Period
  onChange: (period: Period) => void
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
      {PERIODS.map(period => (
        <button
          key={period}
          onClick={() => onChange(period)}
          className={[
            'px-4 py-1.5 text-sm font-medium transition-colors',
            value === period
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50',
          ].join(' ')}
        >
          {PERIOD_LABELS[period]}
        </button>
      ))}
    </div>
  )
}
