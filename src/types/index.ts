// ─── Category Tree ────────────────────────────────────────────────────────────

export interface Category {
  id: string
  name: string
  children: Subcategory[]
}

export interface Subcategory {
  id: string
  name: string
  parentId: string
}

export interface CategoryList {
  id: string
  name: string
  categories: Category[]
}

// ─── Budget ───────────────────────────────────────────────────────────────────

export type Period = 'week' | 'fortnight' | 'month' | 'year'

export interface BudgetEntry {
  subcategoryId: string
  weeklyAmount: number // canonical internal unit = weekly
}

// ─── CSV / Expenses ───────────────────────────────────────────────────────────

export type ColumnRole = 'date' | 'amount' | 'description' | 'other' | 'omit'

export interface ColumnConfig {
  originalIndex: number
  originalHeader: string
  displayName: string
  role: ColumnRole
  dateFormat?: string
  negateAmount?: boolean
}

export interface ParsedCSV {
  hasHeaders: boolean
  rawHeaders: string[]
  rows: string[][]
}

export interface ExpenseRow {
  id: string
  raw: string[]
  omit: boolean
  categoryId: string | null
}

// ─── App State ────────────────────────────────────────────────────────────────

export interface AppState {
  categoryLists: CategoryList[] // up to 5
  activeCategoryListId: string | null
  activePeriod: Period
  budgetEntries: BudgetEntry[]
  columnConfigs: ColumnConfig[]
  parsedCSV: ParsedCSV | null
  expenseRows: ExpenseRow[]
  selectedRowIds: Set<string> // UI-only, not persisted
  insightsDateOverride: { start: string; end: string } | null
}

// Serialisable snapshot for localStorage and URL encoding
export interface PersistedState {
  categoryLists: CategoryList[]
  activeCategoryListId: string | null
  activePeriod: Period
  budgetEntries: BudgetEntry[]
  columnConfigs: ColumnConfig[]
  parsedCSV: ParsedCSV | null
  expenseRows: ExpenseRow[]
  insightsDateOverride: { start: string; end: string } | null
}

// ─── Dropdown ─────────────────────────────────────────────────────────────────

export type DropdownOptionType = 'top-suggestion' | 'category-header' | 'subcategory' | 'none'

export interface DropdownOption {
  type: DropdownOptionType
  id?: string // subcategoryId (for selectable items)
  label: string
  selectable: boolean
}
