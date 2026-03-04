import type { Period, BudgetEntry, CategoryList } from '../types'

export const PERIOD_MULTIPLIERS: Record<Period, number> = {
  week: 1,
  fortnight: 2,
  month: 52 / 12,
  year: 52,
}

export const PERIOD_LABELS: Record<Period, string> = {
  week: 'Weekly',
  fortnight: 'Fortnightly',
  month: 'Monthly',
  year: 'Yearly',
}

export function toWeekly(amount: number, fromPeriod: Period): number {
  return amount / PERIOD_MULTIPLIERS[fromPeriod]
}

export function fromWeekly(weeklyAmount: number, toPeriod: Period): number {
  return weeklyAmount * PERIOD_MULTIPLIERS[toPeriod]
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
