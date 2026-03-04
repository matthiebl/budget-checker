import {
  getCategoryWeeklyTotal,
  displayAmount,
  formatCurrency,
  PERIOD_MULTIPLIERS,
} from '../../utils/budgetCalculations'
import type { Category, CategoryList, BudgetEntry, Period } from '../../types'

const PERIODS: Period[] = ['week', 'fortnight', 'month', 'year']

interface BudgetCategoryRowProps {
  category: Category
  categoryList: CategoryList
  budgetEntries: BudgetEntry[]
}

export function BudgetCategoryRow({ category, categoryList, budgetEntries }: BudgetCategoryRowProps) {
  const weeklyTotal = getCategoryWeeklyTotal(category.id, categoryList, budgetEntries)

  return (
    <tr className="bg-blue-50/60 border-t border-blue-100">
      <td className="pl-3 pr-2 py-2 text-sm font-semibold text-blue-800 w-48" colSpan={1}>
        {category.name}
      </td>
      {PERIODS.map(period => (
        <td key={period} className="px-2 py-2 text-right text-sm font-semibold text-blue-700 w-32">
          {weeklyTotal > 0 ? formatCurrency(displayAmount(weeklyTotal, period)) : '—'}
        </td>
      ))}
      <td className="px-3 py-2 text-right text-xs text-blue-400 w-28">
        {weeklyTotal > 0 ? formatCurrency(weeklyTotal * PERIOD_MULTIPLIERS.year) + '/yr' : ''}
      </td>
    </tr>
  )
}
