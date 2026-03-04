import { Fragment } from 'react'
import type { CategoryList, BudgetEntry } from '../../types'
import { BudgetCategoryRow } from './BudgetCategoryRow'
import { BudgetSubcategoryRow } from './BudgetSubcategoryRow'
import { getGrandWeeklyTotal, displayAmount, formatCurrency } from '../../utils/budgetCalculations'
import type { Period } from '../../types'

const PERIODS: Period[] = ['week', 'fortnight', 'month', 'year']
const PERIOD_HEADERS: Record<Period, string> = {
  week: 'Weekly',
  fortnight: 'Fortnightly',
  month: 'Monthly',
  year: 'Yearly',
}

interface BudgetTableProps {
  categoryList: CategoryList
  budgetEntries: BudgetEntry[]
}

export function BudgetTable({ categoryList, budgetEntries }: BudgetTableProps) {
  if (categoryList.categories.length === 0) {
    return (
      <div className="text-sm text-gray-400 italic py-8 text-center">
        Add categories and subcategories first to enter budget values.
      </div>
    )
  }

  const grandWeekly = getGrandWeeklyTotal(categoryList, budgetEntries)
  let altRow = 0

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-100 border-b border-gray-200">
            <th className="pl-3 pr-2 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-48">
              Category / Subcategory
            </th>
            {PERIODS.map(p => (
              <th key={p} className="px-2 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right w-32">
                {PERIOD_HEADERS[p]}
              </th>
            ))}
            <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right w-28">
              Annual
            </th>
          </tr>
        </thead>
        <tbody>
          {categoryList.categories.map(category => (
            <Fragment key={category.id}>
              <BudgetCategoryRow
                category={category}
                categoryList={categoryList}
                budgetEntries={budgetEntries}
              />
              {category.children.map(sub => {
                const entry = budgetEntries.find(e => e.subcategoryId === sub.id)
                const isAlt = altRow++ % 2 === 1
                return (
                  <BudgetSubcategoryRow
                    key={sub.id}
                    subcategory={sub}
                    entry={entry}
                    isAlt={isAlt}
                  />
                )
              })}
            </Fragment>
          ))}
        </tbody>
        {grandWeekly > 0 && (
          <tfoot>
            <tr className="border-t-2 border-gray-300 bg-gray-100">
              <td className="pl-3 pr-2 py-2 text-sm font-bold text-gray-700">Total</td>
              {PERIODS.map(p => (
                <td key={p} className="px-2 py-2 text-right text-sm font-bold text-gray-700">
                  {formatCurrency(displayAmount(grandWeekly, p))}
                </td>
              ))}
              <td className="px-3 py-2 text-right text-sm font-bold text-gray-700">
                {formatCurrency(displayAmount(grandWeekly, 'year'))}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
