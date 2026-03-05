import type { AppState, ExpenseRow, ColumnConfig } from '../types'
import { fromWeekly, roundToTwo, formatCurrency, PERIOD_DAYS } from './budgetCalculations'
import { getActiveList } from './categoryHelpers'
import { extractExpenseDates, getDateRange, getMonthsBetween, toMonthKey } from './dateParsing'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MonthKey {
  year: number
  month: number
}

export interface SubcategoryInsight {
  subcategoryId: string
  subcategoryName: string
  categoryId: string
  categoryName: string
  budgetMonthly: number
  actualTotal: number
  actualMonthly: number
  actualByMonth: Map<string, number> // "YYYY-MM" → amount
  variance: number          // proRatedBudget - actual (positive = under budget)
  variancePercent: number   // actual / proRatedBudget * 100
}

export interface CategoryInsight {
  categoryId: string
  categoryName: string
  budgetMonthly: number
  actualTotal: number
  actualMonthly: number
  actualByMonth: Map<string, number>
  variance: number
  variancePercent: number
  subcategories: SubcategoryInsight[]
}

export interface InsightsData {
  categories: CategoryInsight[]
  months: MonthKey[]
  dateRange: { start: Date; end: Date }
  totalMonths: number
  hasDates: boolean
  totalBudgetMonthly: number
  totalActual: number
  unassignedTotal: number
  unassignedCount: number
}

export const CHART_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#6366F1',
]

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getExpenseAmount(row: ExpenseRow, amountConfig: ColumnConfig): number {
  const rawVal = row.raw[amountConfig.originalIndex] ?? ''
  const num = parseFloat(rawVal.replace(/[$,]/g, ''))
  if (isNaN(num)) return NaN
  const amount = amountConfig.negateAmount ? -num : num
  return Math.abs(amount)
}

function daysBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)
}

// ─── Core computation ───────────────────────────────────────────────────────

export function computeInsights(
  state: AppState,
  manualDateRange?: { start: Date; end: Date },
): InsightsData | null {
  const activeList = getActiveList(state)
  if (!activeList) return null

  const amountConfig = state.columnConfigs.find(c => c.role === 'amount')
  if (!amountConfig) return null

  const nonOmittedRows = state.expenseRows.filter(r => !r.omit)
  if (nonOmittedRows.length === 0) return null

  // Determine dates — manualDateRange always takes priority
  const allParsedDates = extractExpenseDates(state.expenseRows, state.columnConfigs)
  const hasDates = allParsedDates !== null
  let dateRange: { start: Date; end: Date } | null = null

  if (manualDateRange) {
    dateRange = manualDateRange
  } else if (allParsedDates) {
    dateRange = getDateRange(allParsedDates)
  }

  if (!dateRange) return null

  // Restrict parsed dates to within the selected range so out-of-range rows are excluded
  const parsedDates: Map<string, Date> | null = allParsedDates
    ? new Map([...allParsedDates].filter(([, d]) => d >= dateRange!.start && d <= dateRange!.end))
    : null

  // Ensure at least 1 day span
  const days = Math.max(1, daysBetween(dateRange.start, dateRange.end) + 1)
  const totalMonths = Math.max(0.1, days / PERIOD_DAYS.month)
  const months = getMonthsBetween(dateRange.start, dateRange.end)

  // Group expenses by subcategoryId and month
  const spendBySubcategory = new Map<string, number>()
  const spendBySubcategoryMonth = new Map<string, Map<string, number>>()
  let unassignedTotal = 0
  let unassignedCount = 0

  for (const row of nonOmittedRows) {
    const amount = getExpenseAmount(row, amountConfig)
    if (isNaN(amount)) continue

    // When dates are available, skip rows whose date is outside the selected range
    if (hasDates && allParsedDates) {
      const rowDate = allParsedDates.get(row.id)
      if (rowDate && (rowDate < dateRange.start || rowDate > dateRange.end)) continue
    }

    if (!row.categoryId) {
      unassignedTotal += amount
      unassignedCount++
      continue
    }

    const subId = row.categoryId
    spendBySubcategory.set(subId, (spendBySubcategory.get(subId) ?? 0) + amount)

    // Monthly breakdown
    let monthKey: string | null = null
    if (hasDates && parsedDates) {
      const date = parsedDates.get(row.id)
      if (date) monthKey = toMonthKey(date)
    }

    if (monthKey) {
      if (!spendBySubcategoryMonth.has(subId)) {
        spendBySubcategoryMonth.set(subId, new Map())
      }
      const monthMap = spendBySubcategoryMonth.get(subId)!
      monthMap.set(monthKey, (monthMap.get(monthKey) ?? 0) + amount)
    }
  }

  // Build category insights
  let totalBudgetMonthly = 0
  let totalActual = 0

  const categories: CategoryInsight[] = activeList.categories.map(category => {
    const subcategories: SubcategoryInsight[] = category.children.map(sub => {
      const entry = state.budgetEntries.find(e => e.subcategoryId === sub.id)
      const budgetMonthly = entry ? roundToTwo(fromWeekly(entry.weeklyAmount, 'month')) : 0
      const actualTotal = roundToTwo(spendBySubcategory.get(sub.id) ?? 0)
      const actualMonthly = roundToTwo(actualTotal / totalMonths)

      // Build monthly breakdown
      const actualByMonth = new Map<string, number>()
      if (hasDates) {
        const monthMap = spendBySubcategoryMonth.get(sub.id)
        if (monthMap) {
          for (const [k, v] of monthMap) actualByMonth.set(k, roundToTwo(v))
        }
      } else {
        // Spread evenly across months
        const perMonth = roundToTwo(actualTotal / months.length)
        for (const m of months) {
          const key = `${m.year}-${String(m.month + 1).padStart(2, '0')}`
          actualByMonth.set(key, perMonth)
        }
      }

      const proRatedBudget = budgetMonthly * totalMonths
      const variance = roundToTwo(proRatedBudget - actualTotal)
      const variancePercent = proRatedBudget > 0
        ? roundToTwo((actualTotal / proRatedBudget) * 100)
        : actualTotal > 0 ? Infinity : 0

      return {
        subcategoryId: sub.id,
        subcategoryName: sub.name,
        categoryId: category.id,
        categoryName: category.name,
        budgetMonthly,
        actualTotal,
        actualMonthly,
        actualByMonth,
        variance,
        variancePercent,
      }
    })

    const budgetMonthly = subcategories.reduce((s, sub) => s + sub.budgetMonthly, 0)
    const actualTotal = subcategories.reduce((s, sub) => s + sub.actualTotal, 0)
    const actualMonthly = roundToTwo(actualTotal / totalMonths)

    // Aggregate monthly breakdown
    const actualByMonth = new Map<string, number>()
    for (const sub of subcategories) {
      for (const [k, v] of sub.actualByMonth) {
        actualByMonth.set(k, roundToTwo((actualByMonth.get(k) ?? 0) + v))
      }
    }

    const proRatedBudget = budgetMonthly * totalMonths
    const variance = roundToTwo(proRatedBudget - actualTotal)
    const variancePercent = proRatedBudget > 0
      ? roundToTwo((actualTotal / proRatedBudget) * 100)
      : actualTotal > 0 ? Infinity : 0

    totalBudgetMonthly += budgetMonthly
    totalActual += actualTotal

    return {
      categoryId: category.id,
      categoryName: category.name,
      budgetMonthly: roundToTwo(budgetMonthly),
      actualTotal: roundToTwo(actualTotal),
      actualMonthly,
      actualByMonth,
      variance,
      variancePercent,
      subcategories,
    }
  })

  return {
    categories,
    months,
    dateRange,
    totalMonths: roundToTwo(totalMonths),
    hasDates,
    totalBudgetMonthly: roundToTwo(totalBudgetMonthly),
    totalActual: roundToTwo(totalActual),
    unassignedTotal: roundToTwo(unassignedTotal),
    unassignedCount,
  }
}

// ─── Variance helpers ───────────────────────────────────────────────────────

export function getTopOverspend(data: InsightsData, n = 3): SubcategoryInsight[] {
  return data.categories
    .flatMap(c => c.subcategories)
    .filter(s => s.budgetMonthly > 0 && s.variancePercent > 100)
    .sort((a, b) => Math.abs(a.variance) - Math.abs(b.variance))
    .reverse()
    .slice(0, n)
}

export function getTopUnderBudget(data: InsightsData, n = 3): SubcategoryInsight[] {
  return data.categories
    .flatMap(c => c.subcategories)
    .filter(s => s.budgetMonthly > 0 && s.variancePercent < 70 && s.variance > 0)
    .sort((a, b) => b.variance - a.variance)
    .slice(0, n)
}

// ─── Insight sentences ──────────────────────────────────────────────────────

export interface InsightSentence {
  text: string
  type: 'overspend' | 'underspend' | 'info' | 'positive'
}

export function generateInsightSentences(data: InsightsData): InsightSentence[] {
  const sentences: InsightSentence[] = []
  const proRatedTotal = data.totalBudgetMonthly * data.totalMonths
  const overallPercent = proRatedTotal > 0 ? (data.totalActual / proRatedTotal) * 100 : 0

  // Overall summary
  if (proRatedTotal > 0) {
    if (overallPercent <= 100) {
      sentences.push({
        text: `Overall spending is at ${Math.round(overallPercent)}% of budget (${formatCurrency(data.totalActual)} of ${formatCurrency(proRatedTotal)}) for this ${data.totalMonths.toFixed(1)}-month period.`,
        type: 'positive',
      })
    } else {
      sentences.push({
        text: `Overall spending is ${Math.round(overallPercent - 100)}% over budget (${formatCurrency(data.totalActual)} vs ${formatCurrency(proRatedTotal)} budgeted) for this ${data.totalMonths.toFixed(1)}-month period.`,
        type: 'overspend',
      })
    }
  }

  // Top overspend
  const overspend = getTopOverspend(data)
  for (const item of overspend) {
    sentences.push({
      text: `${item.categoryName} > ${item.subcategoryName} is ${formatCurrency(Math.abs(item.variance))} (${Math.round(item.variancePercent)}%) over budget. Consider reviewing spending in this area.`,
      type: 'overspend',
    })
  }

  // Top underspend
  const underspend = getTopUnderBudget(data)
  for (const item of underspend) {
    sentences.push({
      text: `${item.categoryName} > ${item.subcategoryName} is ${formatCurrency(item.variance)} under budget (only ${Math.round(item.variancePercent)}% used). You may be overbudgeting here.`,
      type: 'underspend',
    })
  }

  // Unassigned warning
  if (data.unassignedCount > 0) {
    sentences.push({
      text: `${data.unassignedCount} expense${data.unassignedCount > 1 ? 's' : ''} totalling ${formatCurrency(data.unassignedTotal)} ${data.unassignedCount > 1 ? 'have' : 'has'} not been assigned to a category. Assign them in the Expenses tab for more accurate insights.`,
      type: 'info',
    })
  }

  // Categories with no budget
  const noBudgetWithSpend = data.categories.filter(c => c.budgetMonthly === 0 && c.actualTotal > 0)
  if (noBudgetWithSpend.length > 0) {
    const names = noBudgetWithSpend.map(c => c.categoryName).join(', ')
    sentences.push({
      text: `${names} ${noBudgetWithSpend.length > 1 ? 'have' : 'has'} actual spending but no budget set. Add budget values in the Budget tab.`,
      type: 'info',
    })
  }

  return sentences
}
