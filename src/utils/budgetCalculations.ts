import type { Period, BudgetEntry, CategoryList } from '../types'

// Days in each period (365-day year, exact day counts)
export const PERIOD_DAYS: Record<Period, number> = {
  week: 7,
  fortnight: 14,
  month: 365 / 12, // ≈30.4375
  year: 365,
}

// Weeks-per-period multipliers, derived from PERIOD_DAYS so all three are consistent
export const PERIOD_MULTIPLIERS: Record<Period, number> = {
  week: PERIOD_DAYS.week / 7,      // 1
  fortnight: PERIOD_DAYS.fortnight / 7, // 2
  month: PERIOD_DAYS.month / 7,   // 365/84 ≈ 4.3452
  year: PERIOD_DAYS.year / 7,     // 365/7 ≈ 52.1429
}

export const PERIOD_LABELS: Record<Period, string> = {
  week: 'Weekly',
  fortnight: 'Fortnightly',
  month: 'Monthly',
  year: 'Yearly',
}

// All conversions go through a per-day rate for consistency.
// daily = weeklyAmount / 7
export function toWeekly(amount: number, fromPeriod: Period): number {
  return (amount / PERIOD_DAYS[fromPeriod]) * 7
}

export function fromWeekly(weeklyAmount: number, toPeriod: Period): number {
  return (weeklyAmount / 7) * PERIOD_DAYS[toPeriod]
}

export function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100
}

export function displayAmount(weeklyAmount: number, period: Period): number {
  return roundToTwo(fromWeekly(weeklyAmount, period))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function getCategoryWeeklyTotal(
  categoryId: string,
  categoryList: CategoryList,
  budgetEntries: BudgetEntry[]
): number {
  const category = categoryList.categories.find(c => c.id === categoryId)
  if (!category) return 0
  const subcategoryIds = new Set(category.children.map(s => s.id))
  return budgetEntries
    .filter(e => subcategoryIds.has(e.subcategoryId))
    .reduce((sum, e) => sum + e.weeklyAmount, 0)
}

export function getGrandWeeklyTotal(
  categoryList: CategoryList | null,
  budgetEntries: BudgetEntry[]
): number {
  if (!categoryList) return 0
  const allSubIds = new Set(
    categoryList.categories.flatMap(c => c.children.map(s => s.id))
  )
  return budgetEntries
    .filter(e => allSubIds.has(e.subcategoryId))
    .reduce((sum, e) => sum + e.weeklyAmount, 0)
}
