import type { AppState } from '../types'

export function createInitialState(): AppState {
  return {
    categoryLists: [],
    activeCategoryListId: null,
    activePeriod: 'month',
    budgetEntries: [],
    columnConfigs: [],
    parsedCSV: null,
    expenseRows: [],
    selectedRowIds: new Set(),
  }
}
