import { formatCurrency, roundToTwo } from '../../utils/budgetCalculations'
import type { InsightsData, CategoryInsight, SubcategoryInsight } from '../../utils/insightsCalculations'

interface BudgetVsActualTableProps {
  data: InsightsData
}

function StatusBadge({ percent }: { percent: number }) {
  if (percent === Infinity || percent > 100) {
    return <span className="inline-block text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Over</span>
  }
  if (percent >= 90) {
    return <span className="inline-block text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Near</span>
  }
  return <span className="inline-block text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Under</span>
}

function VarianceCell({ variance, percent }: { variance: number; percent: number }) {
  const isOver = variance < 0
  return (
    <td className={`px-3 py-2 text-right text-sm ${isOver ? 'text-red-600' : 'text-green-600'}`}>
      {isOver ? '-' : '+'}{formatCurrency(Math.abs(variance))}
      <span className="text-xs text-gray-400 ml-1">
        ({percent === Infinity ? '∞' : `${Math.round(percent)}%`})
      </span>
    </td>
  )
}

export function BudgetVsActualTable({ data }: BudgetVsActualTableProps) {
  const proRatedTotal = roundToTwo(data.totalBudgetMonthly * data.totalMonths)
  const totalVariance = roundToTwo(proRatedTotal - data.totalActual)
  const totalPercent = proRatedTotal > 0 ? roundToTwo((data.totalActual / proRatedTotal) * 100) : 0

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Budget vs Actual</h3>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200">
              <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Subcategory</th>
              <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Budget/Month</th>
              <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Budget (Period)</th>
              <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actual Spend</th>
              <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Variance</th>
              <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center w-16">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.categories.map((cat, ci) => (
              <CategoryRows key={cat.categoryId} category={cat} totalMonths={data.totalMonths} index={ci} />
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t-2 border-gray-300 font-bold">
              <td className="px-3 py-2.5 text-sm text-gray-800" colSpan={2}>Total</td>
              <td className="px-3 py-2.5 text-sm text-right text-gray-800">{formatCurrency(data.totalBudgetMonthly)}</td>
              <td className="px-3 py-2.5 text-sm text-right text-gray-800">{formatCurrency(proRatedTotal)}</td>
              <td className="px-3 py-2.5 text-sm text-right text-gray-800">{formatCurrency(data.totalActual)}</td>
              <VarianceCell variance={totalVariance} percent={totalPercent} />
              <td className="px-3 py-2.5 text-center">
                <StatusBadge percent={totalPercent} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function CategoryRows({ category, totalMonths, index }: { category: CategoryInsight; totalMonths: number; index: number }) {
  const proRated = roundToTwo(category.budgetMonthly * totalMonths)

  return (
    <>
      {/* Category header row */}
      <tr className="bg-blue-50/60 border-t border-gray-200">
        <td className="px-3 py-2 text-sm font-bold text-gray-800">{category.categoryName}</td>
        <td className="px-3 py-2 text-sm text-gray-400">—</td>
        <td className="px-3 py-2 text-sm text-right font-semibold text-gray-700">{formatCurrency(category.budgetMonthly)}</td>
        <td className="px-3 py-2 text-sm text-right font-semibold text-gray-700">{formatCurrency(proRated)}</td>
        <td className="px-3 py-2 text-sm text-right font-semibold text-gray-700">{formatCurrency(category.actualTotal)}</td>
        <VarianceCell variance={category.variance} percent={category.variancePercent} />
        <td className="px-3 py-2 text-center">
          {category.budgetMonthly > 0 && <StatusBadge percent={category.variancePercent} />}
        </td>
      </tr>
      {/* Subcategory rows */}
      {category.subcategories.map((sub, si) => (
        <SubcategoryRow key={sub.subcategoryId} sub={sub} totalMonths={totalMonths} odd={(index + si) % 2 === 1} />
      ))}
    </>
  )
}

function SubcategoryRow({ sub, totalMonths, odd }: { sub: SubcategoryInsight; totalMonths: number; odd: boolean }) {
  const proRated = roundToTwo(sub.budgetMonthly * totalMonths)
  const hasData = sub.budgetMonthly > 0 || sub.actualTotal > 0

  if (!hasData) return null

  return (
    <tr className={odd ? 'bg-gray-50/40' : 'bg-white'}>
      <td className="px-3 py-1.5" />
      <td className="px-3 py-1.5 text-sm text-gray-600">{sub.subcategoryName}</td>
      <td className="px-3 py-1.5 text-sm text-right text-gray-600">{formatCurrency(sub.budgetMonthly)}</td>
      <td className="px-3 py-1.5 text-sm text-right text-gray-600">{formatCurrency(proRated)}</td>
      <td className="px-3 py-1.5 text-sm text-right text-gray-600">{formatCurrency(sub.actualTotal)}</td>
      <VarianceCell variance={sub.variance} percent={sub.variancePercent} />
      <td className="px-3 py-1.5 text-center">
        {sub.budgetMonthly > 0 && <StatusBadge percent={sub.variancePercent} />}
      </td>
    </tr>
  )
}
