import type {
  AppState,
  Category,
  Subcategory,
  CategoryList,
  Period,
  ColumnConfig,
  ParsedCSV,
  ExpenseRow,
  PersistedState,
} from '../types'
import { toWeekly } from '../utils/budgetCalculations'
import { countAllItems } from '../utils/categoryHelpers'

// ─── Action Types ─────────────────────────────────────────────────────────────

export type Action =
  // Category list management
  | { type: 'CREATE_CATEGORY_LIST'; payload: { id: string; name: string } }
  | { type: 'DELETE_CATEGORY_LIST'; payload: { id: string } }
  | { type: 'RENAME_CATEGORY_LIST'; payload: { id: string; name: string } }
  | { type: 'SET_ACTIVE_CATEGORY_LIST'; payload: { id: string } }
  // Category tree
  | { type: 'ADD_CATEGORY'; payload: { id: string; name: string } }
  | { type: 'REMOVE_CATEGORY'; payload: { categoryId: string } }
  | { type: 'RENAME_CATEGORY'; payload: { categoryId: string; name: string } }
  | { type: 'ADD_SUBCATEGORY'; payload: { id: string; categoryId: string; name: string } }
  | { type: 'REMOVE_SUBCATEGORY'; payload: { categoryId: string; subcategoryId: string } }
  | { type: 'RENAME_SUBCATEGORY'; payload: { categoryId: string; subcategoryId: string; name: string } }
  | { type: 'REORDER_CATEGORIES'; payload: { ids: string[] } }
  | { type: 'REORDER_SUBCATEGORIES'; payload: { categoryId: string; ids: string[] } }
  // Budget
  | { type: 'SET_ACTIVE_PERIOD'; payload: { period: Period } }
  | { type: 'SET_BUDGET_AMOUNT'; payload: { subcategoryId: string; period: Period; value: number } }
  // CSV
  | { type: 'SET_PARSED_CSV'; payload: { csv: ParsedCSV } }
  | { type: 'SET_COLUMN_CONFIGS'; payload: { configs: ColumnConfig[] } }
  | { type: 'UPDATE_COLUMN_CONFIG'; payload: { index: number; update: Partial<ColumnConfig> } }
  | { type: 'CLEAR_CSV' }
  // Insights
  | { type: 'SET_INSIGHTS_DATE_OVERRIDE'; payload: { range: { start: string; end: string } | null } }
  // Expense rows
  | { type: 'SET_EXPENSE_ROWS'; payload: { rows: ExpenseRow[] } }
  | { type: 'TOGGLE_ROW_OMIT'; payload: { rowId: string } }
  | { type: 'ASSIGN_CATEGORY'; payload: { rowId: string; subcategoryId: string | null } }
  | { type: 'BULK_ASSIGN_CATEGORY'; payload: { rowIds: string[]; subcategoryId: string | null } }
  | { type: 'TOGGLE_ROW_SELECT'; payload: { rowId: string } }
  | { type: 'SELECT_ALL_ROWS' }
  | { type: 'CLEAR_SELECTION' }
  // Global
  | { type: 'LOAD_STATE'; payload: { state: PersistedState } }
  | { type: 'RESET_STATE'; payload: { initialState: AppState } }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function updateActiveList(
  state: AppState,
  updater: (list: CategoryList) => CategoryList
): AppState {
  if (!state.activeCategoryListId) return state
  return {
    ...state,
    categoryLists: state.categoryLists.map(list =>
      list.id === state.activeCategoryListId ? updater(list) : list
    ),
  }
}

function getActiveList(state: AppState): CategoryList | null {
  return state.categoryLists.find(l => l.id === state.activeCategoryListId) ?? null
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    // ── Category Lists ────────────────────────────────────────────────────────
    case 'CREATE_CATEGORY_LIST': {
      if (state.categoryLists.length >= 5) return state
      const newList: CategoryList = {
        id: action.payload.id,
        name: action.payload.name,
        categories: [],
      }
      return {
        ...state,
        categoryLists: [...state.categoryLists, newList],
        activeCategoryListId: action.payload.id,
      }
    }

    case 'DELETE_CATEGORY_LIST': {
      const remaining = state.categoryLists.filter(l => l.id !== action.payload.id)
      const deletedList = state.categoryLists.find(l => l.id === action.payload.id)
      // Prune budget entries for deleted list's subcategories
      const subcategoryIds = new Set(
        deletedList?.categories.flatMap(c => c.children.map(s => s.id)) ?? []
      )
      return {
        ...state,
        categoryLists: remaining,
        activeCategoryListId:
          state.activeCategoryListId === action.payload.id
            ? remaining[0]?.id ?? null
            : state.activeCategoryListId,
        budgetEntries: state.budgetEntries.filter(e => !subcategoryIds.has(e.subcategoryId)),
      }
    }

    case 'RENAME_CATEGORY_LIST': {
      return {
        ...state,
        categoryLists: state.categoryLists.map(l =>
          l.id === action.payload.id ? { ...l, name: action.payload.name } : l
        ),
      }
    }

    case 'SET_ACTIVE_CATEGORY_LIST': {
      return { ...state, activeCategoryListId: action.payload.id }
    }

    // ── Category Tree ─────────────────────────────────────────────────────────
    case 'ADD_CATEGORY': {
      const activeList = getActiveList(state)
      if (!activeList) return state
      if (countAllItems(activeList) >= 100) return state
      const newCategory: Category = {
        id: action.payload.id,
        name: action.payload.name,
        children: [],
      }
      return updateActiveList(state, list => ({
        ...list,
        categories: [...list.categories, newCategory],
      }))
    }

    case 'REMOVE_CATEGORY': {
      const activeList = getActiveList(state)
      const category = activeList?.categories.find(c => c.id === action.payload.categoryId)
      const subcategoryIds = new Set(category?.children.map(s => s.id) ?? [])
      return {
        ...updateActiveList(state, list => ({
          ...list,
          categories: list.categories.filter(c => c.id !== action.payload.categoryId),
        })),
        budgetEntries: state.budgetEntries.filter(e => !subcategoryIds.has(e.subcategoryId)),
      }
    }

    case 'RENAME_CATEGORY': {
      return updateActiveList(state, list => ({
        ...list,
        categories: list.categories.map(c =>
          c.id === action.payload.categoryId ? { ...c, name: action.payload.name } : c
        ),
      }))
    }

    case 'ADD_SUBCATEGORY': {
      const activeList = getActiveList(state)
      if (!activeList) return state
      if (countAllItems(activeList) >= 100) return state
      const newSub: Subcategory = {
        id: action.payload.id,
        name: action.payload.name,
        parentId: action.payload.categoryId,
      }
      return updateActiveList(state, list => ({
        ...list,
        categories: list.categories.map(c =>
          c.id === action.payload.categoryId
            ? { ...c, children: [...c.children, newSub] }
            : c
        ),
      }))
    }

    case 'REMOVE_SUBCATEGORY': {
      return {
        ...updateActiveList(state, list => ({
          ...list,
          categories: list.categories.map(c =>
            c.id === action.payload.categoryId
              ? {
                  ...c,
                  children: c.children.filter(s => s.id !== action.payload.subcategoryId),
                }
              : c
          ),
        })),
        budgetEntries: state.budgetEntries.filter(
          e => e.subcategoryId !== action.payload.subcategoryId
        ),
      }
    }

    case 'RENAME_SUBCATEGORY': {
      return updateActiveList(state, list => ({
        ...list,
        categories: list.categories.map(c =>
          c.id === action.payload.categoryId
            ? {
                ...c,
                children: c.children.map(s =>
                  s.id === action.payload.subcategoryId
                    ? { ...s, name: action.payload.name }
                    : s
                ),
              }
            : c
        ),
      }))
    }

    case 'REORDER_CATEGORIES': {
      const idOrder = action.payload.ids
      return updateActiveList(state, list => ({
        ...list,
        categories: idOrder
          .map(id => list.categories.find(c => c.id === id))
          .filter((c): c is Category => c !== undefined),
      }))
    }

    case 'REORDER_SUBCATEGORIES': {
      const { categoryId, ids } = action.payload
      return updateActiveList(state, list => ({
        ...list,
        categories: list.categories.map(c => {
          if (c.id !== categoryId) return c
          return {
            ...c,
            children: ids
              .map(id => c.children.find(s => s.id === id))
              .filter((s): s is Subcategory => s !== undefined),
          }
        }),
      }))
    }

    // ── Budget ────────────────────────────────────────────────────────────────
    case 'SET_ACTIVE_PERIOD': {
      return { ...state, activePeriod: action.payload.period }
    }

    case 'SET_BUDGET_AMOUNT': {
      const weekly = toWeekly(action.payload.value, action.payload.period)
      const exists = state.budgetEntries.find(
        e => e.subcategoryId === action.payload.subcategoryId
      )
      if (exists) {
        return {
          ...state,
          budgetEntries: state.budgetEntries.map(e =>
            e.subcategoryId === action.payload.subcategoryId
              ? { ...e, weeklyAmount: weekly }
              : e
          ),
        }
      }
      return {
        ...state,
        budgetEntries: [
          ...state.budgetEntries,
          { subcategoryId: action.payload.subcategoryId, weeklyAmount: weekly },
        ],
      }
    }

    // ── CSV ───────────────────────────────────────────────────────────────────
    case 'SET_PARSED_CSV': {
      // Reset the date override when a new CSV is imported
      return { ...state, parsedCSV: action.payload.csv, insightsDateOverride: null }
    }

    case 'SET_COLUMN_CONFIGS': {
      return { ...state, columnConfigs: action.payload.configs }
    }

    case 'UPDATE_COLUMN_CONFIG': {
      const update = action.payload.update
      let configs = [...state.columnConfigs]

      // Enforce single-role constraint: clear previous if role is being set
      if (update.role && ['date', 'amount', 'description'].includes(update.role)) {
        configs = configs.map((c, i) =>
          i !== action.payload.index && c.role === update.role ? { ...c, role: 'other' as const } : c
        )
      }

      configs[action.payload.index] = { ...configs[action.payload.index], ...update }
      return { ...state, columnConfigs: configs }
    }

    case 'CLEAR_CSV': {
      return { ...state, parsedCSV: null, columnConfigs: [], expenseRows: [], selectedRowIds: new Set(), insightsDateOverride: null }
    }

    case 'SET_INSIGHTS_DATE_OVERRIDE': {
      return { ...state, insightsDateOverride: action.payload.range }
    }

    // ── Expense Rows ──────────────────────────────────────────────────────────
    case 'SET_EXPENSE_ROWS': {
      return { ...state, expenseRows: action.payload.rows, selectedRowIds: new Set() }
    }

    case 'TOGGLE_ROW_OMIT': {
      return {
        ...state,
        expenseRows: state.expenseRows.map(r =>
          r.id === action.payload.rowId ? { ...r, omit: !r.omit } : r
        ),
      }
    }

    case 'ASSIGN_CATEGORY': {
      return {
        ...state,
        expenseRows: state.expenseRows.map(r =>
          r.id === action.payload.rowId
            ? { ...r, categoryId: action.payload.subcategoryId }
            : r
        ),
      }
    }

    case 'BULK_ASSIGN_CATEGORY': {
      const ids = new Set(action.payload.rowIds)
      return {
        ...state,
        expenseRows: state.expenseRows.map(r =>
          ids.has(r.id) ? { ...r, categoryId: action.payload.subcategoryId } : r
        ),
      }
    }

    case 'TOGGLE_ROW_SELECT': {
      const next = new Set(state.selectedRowIds)
      if (next.has(action.payload.rowId)) {
        next.delete(action.payload.rowId)
      } else {
        next.add(action.payload.rowId)
      }
      return { ...state, selectedRowIds: next }
    }

    case 'SELECT_ALL_ROWS': {
      return {
        ...state,
        selectedRowIds: new Set(state.expenseRows.filter(r => !r.omit).map(r => r.id)),
      }
    }

    case 'CLEAR_SELECTION': {
      return { ...state, selectedRowIds: new Set() }
    }

    // ── Global ────────────────────────────────────────────────────────────────
    case 'LOAD_STATE': {
      return {
        ...action.payload.state,
        selectedRowIds: new Set(),
      }
    }

    case 'RESET_STATE': {
      return action.payload.initialState
    }

    default:
      return state
  }
}
