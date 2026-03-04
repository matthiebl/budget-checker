import { useState } from 'react'
import { useAppContext } from '../../store/AppContext'
import {
  displayAmount,
  formatCurrency,
  PERIOD_MULTIPLIERS,
} from '../../utils/budgetCalculations'
import type { Subcategory, BudgetEntry, Period } from '../../types'

const PERIODS: Period[] = ['week', 'fortnight', 'month', 'year']

interface BudgetSubcategoryRowProps {
  subcategory: Subcategory
  entry: BudgetEntry | undefined
  isAlt: boolean
}

export function BudgetSubcategoryRow({ subcategory, entry, isAlt }: BudgetSubcategoryRowProps) {
  const { dispatch } = useAppContext()
  const [localValues, setLocalValues] = useState<Partial<Record<Period, string>>>({})
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null)

  function getDisplayValue(period: Period): string {
    if (editingPeriod === period && localValues[period] !== undefined) {
      return localValues[period]!
    }
    if (!entry) return ''
    return displayAmount(entry.weeklyAmount, period).toString()
  }

  function handleFocus(period: Period) {
    setEditingPeriod(period)
    if (entry) {
      setLocalValues({ [period]: displayAmount(entry.weeklyAmount, period).toString() })
    } else {
      setLocalValues({ [period]: '' })
    }
  }

  function handleChange(period: Period, value: string) {
    setLocalValues({ [period]: value })
  }

  function handleBlur(period: Period, rawValue: string) {
    setEditingPeriod(null)
    setLocalValues({})
    const num = parseFloat(rawValue)
    if (!isNaN(num) && num >= 0) {
      dispatch({
        type: 'SET_BUDGET_AMOUNT',
        payload: { subcategoryId: subcategory.id, period, value: num },
      })
    }
  }

  const weeklyAmount = entry?.weeklyAmount ?? 0

  return (
    <tr className={isAlt ? 'bg-gray-50/50' : 'bg-white'}>
      <td className="pl-8 pr-2 py-2 text-sm text-gray-600 w-48">{subcategory.name}</td>
      {PERIODS.map(period => (
        <td key={period} className="px-2 py-1.5 text-right w-32">
          <input
            type="number"
            min="0"
            step="0.01"
            value={getDisplayValue(period)}
            onFocus={() => handleFocus(period)}
            onChange={e => handleChange(period, e.target.value)}
            onBlur={e => handleBlur(period, e.target.value)}
            placeholder="0.00"
            className="w-full text-right text-sm px-2 py-1 border border-transparent rounded focus:border-blue-400 focus:outline-none hover:border-gray-200 transition-colors bg-transparent"
          />
        </td>
      ))}
      <td className="px-3 py-2 text-right text-xs text-gray-400 w-28">
        {weeklyAmount > 0 ? formatCurrency(weeklyAmount * PERIOD_MULTIPLIERS.year) + '/yr' : ''}
      </td>
    </tr>
  )
}
