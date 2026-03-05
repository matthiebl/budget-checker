import { useMemo } from 'react'
import { useAppContext } from '../../store/AppContext'
import { getActiveList } from '../../utils/categoryHelpers'
import { computeInsights } from '../../utils/insightsCalculations'
import { extractExpenseDates, getDateRange } from '../../utils/dateParsing'
import { DateRangePicker } from './DateRangePicker'
import { InsightsSummary } from './InsightsSummary'
import { BudgetVsActualTable } from './BudgetVsActualTable'
import { MonthlySpendChart } from './MonthlySpendChart'
import { CategoryBreakdownChart } from './CategoryBreakdownChart'
import { SpendingTrendChart } from './SpendingTrendChart'

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-sm text-gray-400 italic py-8 text-center">
      {message}
    </div>
  )
}

function toInputDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function InsightsTab() {
  const { state, dispatch } = useAppContext()
  const activeList = getActiveList(state)

  const hasAmountColumn = state.columnConfigs.some(c => c.role === 'amount')
  const hasDateColumn = state.columnConfigs.some(c => c.role === 'date')

  // Auto-detect date range from data
  const detectedRange = useMemo(() => {
    if (!hasDateColumn) return null
    const dates = extractExpenseDates(state.expenseRows, state.columnConfigs)
    if (!dates) return null
    const range = getDateRange(dates)
    if (!range) return null
    return { start: toInputDate(range.start), end: toInputDate(range.end) }
  }, [state.expenseRows, state.columnConfigs, hasDateColumn])

  // Persisted override takes priority over detected
  const manualRange = state.insightsDateOverride
  const effectiveRange = manualRange ?? detectedRange

  function handleRangeChange(range: { start: string; end: string }) {
    dispatch({ type: 'SET_INSIGHTS_DATE_OVERRIDE', payload: { range } })
  }

  function handleReset() {
    dispatch({ type: 'SET_INSIGHTS_DATE_OVERRIDE', payload: { range: null } })
  }

  const parsedEffectiveRange = useMemo(() => {
    if (!effectiveRange?.start || !effectiveRange?.end) return undefined
    const start = new Date(effectiveRange.start)
    const end = new Date(effectiveRange.end)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return undefined
    if (end < start) return undefined
    return { start, end }
  }, [effectiveRange])

  const insights = useMemo(() => {
    return computeInsights(state, parsedEffectiveRange)
  }, [state, parsedEffectiveRange])

  // Guards
  if (!activeList) {
    return <EmptyState message="Select or create a category list in the Categories tab to begin." />
  }
  if (state.expenseRows.length === 0) {
    return <EmptyState message="Import expenses in the Expenses tab to see insights." />
  }
  if (!hasAmountColumn) {
    return <EmptyState message="Configure an amount column in the Expenses tab to enable insights." />
  }

  const needsDateRange = !hasDateColumn && !parsedEffectiveRange
  if (needsDateRange) {
    return (
      <div>
        <DateRangePicker value={effectiveRange} onChange={handleRangeChange} hasDetectedDates={false} />
        <EmptyState message="Select a date range above to generate insights." />
      </div>
    )
  }

  if (!insights) {
    return <EmptyState message="Unable to compute insights. Check your data in other tabs." />
  }

  return (
    <div>
      <DateRangePicker
        value={effectiveRange}
        onChange={handleRangeChange}
        hasDetectedDates={hasDateColumn && detectedRange !== null}
        onReset={hasDateColumn && manualRange !== null ? handleReset : undefined}
      />

      <InsightsSummary data={insights} />
      <BudgetVsActualTable data={insights} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <MonthlySpendChart data={insights} />
        <CategoryBreakdownChart data={insights} />
      </div>

      <SpendingTrendChart data={insights} />
    </div>
  )
}
