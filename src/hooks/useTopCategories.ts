import { useMemo } from 'react'
import type { ExpenseRow } from '../types'

export function useTopCategories(expenseRows: ExpenseRow[], limit = 3): string[] {
  return useMemo(() => {
    const counts = new Map<string, number>()
    for (const row of expenseRows) {
      if (row.categoryId && !row.omit) {
        counts.set(row.categoryId, (counts.get(row.categoryId) ?? 0) + 1)
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id)
  }, [expenseRows, limit])
}
