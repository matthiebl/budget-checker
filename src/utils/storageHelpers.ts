import type { AppState, PersistedState } from '../types'

const STORAGE_KEY = 'budget-tracker-state'
const MAX_CSV_SIZE_BYTES = 100_000

export function appStateToPersistedState(state: AppState): PersistedState {
  // Check if parsedCSV is too large to persist
  const csvSize = state.parsedCSV ? JSON.stringify(state.parsedCSV).length : 0
  return {
    categoryLists: state.categoryLists,
    activeCategoryListId: state.activeCategoryListId,
    activePeriod: state.activePeriod,
    budgetEntries: state.budgetEntries,
    columnConfigs: state.columnConfigs,
    parsedCSV: csvSize > MAX_CSV_SIZE_BYTES ? null : state.parsedCSV,
    expenseRows: state.expenseRows,
  }
}

export function isCSVTooLargeToStore(state: AppState): boolean {
  if (!state.parsedCSV) return false
  return JSON.stringify(state.parsedCSV).length > MAX_CSV_SIZE_BYTES
}

export function saveState(state: AppState): void {
  try {
    const persisted = appStateToPersistedState(state)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))
  } catch (e) {
    console.warn('Failed to save state to localStorage:', e)
  }
}

export function loadState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (
      !Array.isArray(parsed.categoryLists) ||
      !Array.isArray(parsed.budgetEntries) ||
      !Array.isArray(parsed.expenseRows)
    ) {
      return null
    }
    return parsed as PersistedState
  } catch (e) {
    console.warn('Failed to load state from localStorage:', e)
    return null
  }
}

export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY)
}
