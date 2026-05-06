import { useState, useMemo } from 'react'
import { useTopCategories } from '../../hooks/useTopCategories'
import { useAppContext } from '../../store/AppContext'
import { getActiveList } from '../../utils/categoryHelpers'
import { isCSVTooLargeToStore } from '../../utils/storageHelpers'
import { parseDate } from '../../utils/dateParsing'
import { formatCurrency } from '../../utils/budgetCalculations'
import type { ExpenseRow as ExpenseRowType, ColumnConfig, CategoryList } from '../../types'
import { ExpenseRow } from './ExpenseRow'
import { ExpenseFilters, defaultFilters } from './ExpenseFilters'
import type { FiltersState } from './ExpenseFilters'

type SortDir = 'asc' | 'desc'
type SortConfig = { key: string; dir: SortDir } | null

const SORTABLE_ROLES = new Set(['date', 'amount', 'description'])

function applySort(
  rows: ExpenseRowType[],
  sort: SortConfig,
  columnConfigs: ColumnConfig[],
  activeList: CategoryList | null,
): ExpenseRowType[] {
  if (!sort) return rows
  return [...rows].sort((a, b) => {
    let cmp = 0
    if (sort.key === '__category__') {
      const name = (row: ExpenseRowType) => {
        if (!row.categoryId) return ''
        for (const cat of activeList?.categories ?? []) {
          const sub = cat.children.find(s => s.id === row.categoryId)
          if (sub) return `${cat.name} ${sub.name}`
        }
        return ''
      }
      cmp = name(a).localeCompare(name(b))
    } else {
      const idx = parseInt(sort.key)
      const config = columnConfigs.find(c => c.originalIndex === idx)
      if (!config) return 0
      const rawA = a.raw[idx] ?? ''
      const rawB = b.raw[idx] ?? ''
      if (config.role === 'amount') {
        const parse = (raw: string) => {
          const n = parseFloat(raw.replace(/[$,]/g, ''))
          return isNaN(n) ? 0 : (config.negateAmount ? -n : n)
        }
        cmp = parse(rawA) - parse(rawB)
      } else if (config.role === 'date') {
        const tA = parseDate(rawA, config.dateFormat ?? 'DD/MM/YYYY')?.getTime() ?? 0
        const tB = parseDate(rawB, config.dateFormat ?? 'DD/MM/YYYY')?.getTime() ?? 0
        cmp = tA - tB
      } else {
        cmp = rawA.localeCompare(rawB)
      }
    }
    return sort.dir === 'asc' ? cmp : -cmp
  })
}

function SortIcon({ dir }: { dir: SortDir | null }) {
  if (!dir) return <span className="ml-1 text-gray-300 text-[10px]">↕</span>
  return <span className="ml-1 text-[10px]">{dir === 'asc' ? '↑' : '↓'}</span>
}

function parseDateInput(s: string): Date | null {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function applyFilters(
  rows: ExpenseRowType[],
  filters: FiltersState,
  columnConfigs: ColumnConfig[],
  activeList: CategoryList | null,
): ExpenseRowType[] {
  const dateConfig = columnConfigs.find(c => c.role === 'date')
  const amountConfig = columnConfigs.find(c => c.role === 'amount')
  const descConfig = columnConfigs.find(c => c.role === 'description')

  const dateStart = parseDateInput(filters.dateStart)
  const dateEnd = parseDateInput(filters.dateEnd)

  return rows.filter(row => {
    if (!filters.showOmitted && row.omit) return false

    if ((dateStart || dateEnd) && dateConfig) {
      const raw = row.raw[dateConfig.originalIndex] ?? ''
      const parsed = parseDate(raw, dateConfig.dateFormat ?? 'DD/MM/YYYY')
      if (parsed) {
        if (dateStart && parsed < dateStart) return false
        if (dateEnd && parsed > dateEnd) return false
      }
    }

    if ((filters.amountMin !== '' || filters.amountMax !== '') && amountConfig) {
      const raw = row.raw[amountConfig.originalIndex] ?? ''
      const num = parseFloat(raw.replace(/[$,]/g, ''))
      if (!isNaN(num)) {
        const amount = amountConfig.negateAmount ? -num : num
        if (filters.amountMin !== '' && amount < parseFloat(filters.amountMin)) return false
        if (filters.amountMax !== '' && amount > parseFloat(filters.amountMax)) return false
      }
    }

    if (filters.description && descConfig) {
      const raw = row.raw[descConfig.originalIndex] ?? ''
      if (!raw.toLowerCase().includes(filters.description.toLowerCase())) return false
    }

    if (filters.categoryId) {
      if (filters.categoryId === '__uncategorised__') {
        if (row.categoryId) return false
      } else if (filters.categoryId.startsWith('cat:')) {
        const catId = filters.categoryId.slice(4)
        const cat = activeList?.categories.find(c => c.id === catId)
        if (!cat || !cat.children.some(s => s.id === row.categoryId)) return false
      } else {
        if (row.categoryId !== filters.categoryId) return false
      }
    }

    return true
  })
}

export function ExpenseTable() {
  const { state, dispatch } = useAppContext()
  const activeList = getActiveList(state)
  const topIds = useTopCategories(state.expenseRows)
  const [activeFilters, setActiveFilters] = useState<FiltersState>(defaultFilters)
  const [sort, setSort] = useState<SortConfig>(null)

  function handleSort(key: string) {
    setSort(prev => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' }
      if (prev.dir === 'asc') return { key, dir: 'desc' }
      return null
    })
  }

  if (state.expenseRows.length === 0) return null

  const visibleConfigs = useMemo(
    () => state.columnConfigs.filter(c => c.role !== 'omit'),
    [state.columnConfigs],
  )
  const filteredRows = useMemo(
    () => applyFilters(state.expenseRows, activeFilters, state.columnConfigs, activeList),
    [state.expenseRows, activeFilters, state.columnConfigs, activeList],
  )
  const sortedRows = useMemo(
    () => applySort(filteredRows, sort, state.columnConfigs, activeList),
    [filteredRows, sort, state.columnConfigs, activeList],
  )
  const filteredNonOmittedIds = useMemo(
    () => sortedRows.filter(r => !r.omit).map(r => r.id),
    [sortedRows],
  )

  const allSelected =
    filteredNonOmittedIds.length > 0 &&
    filteredNonOmittedIds.every(id => state.selectedRowIds.has(id))
  const csvTooLarge = isCSVTooLargeToStore(state)

  const amountConfig = useMemo(
    () => state.columnConfigs.find(c => c.role === 'amount'),
    [state.columnConfigs],
  )
  const filteredTotal = useMemo(() => {
    if (!amountConfig) return null
    return filteredRows
      .filter(r => !r.omit)
      .reduce((sum, row) => {
        const raw = row.raw[amountConfig.originalIndex] ?? ''
        const num = parseFloat(raw.replace(/[$,]/g, ''))
        if (isNaN(num)) return sum
        return sum + (amountConfig.negateAmount ? -num : num)
      }, 0)
  }, [filteredRows, amountConfig])

  const categorisedCount = state.expenseRows.filter(r => !r.omit && r.categoryId).length
  const totalNonOmitted = state.expenseRows.filter(r => !r.omit).length
  const isFiltered = filteredRows.length !== state.expenseRows.length

  return (
    <div>
      <ExpenseFilters
        onActiveFiltersChange={setActiveFilters}
        columnConfigs={state.columnConfigs}
        categoryList={activeList}
      />

      {/* Stats bar */}
      <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
        <div className="flex gap-4">
          {isFiltered ? (
            <span>
              {filteredRows.length} of {state.expenseRows.length} rows
            </span>
          ) : (
            <span>{state.expenseRows.length} rows total</span>
          )}
          <span>{state.expenseRows.filter(r => r.omit).length} omitted</span>
          <span
            className={
              categorisedCount === totalNonOmitted ? 'text-green-600 font-medium' : ''
            }
          >
            {categorisedCount}/{totalNonOmitted} categorised
          </span>
          {filteredTotal !== null && (
            <span className={filteredTotal < 0 ? 'text-green-600 font-medium' : 'font-medium'}>
              {isFiltered ? 'Filtered net: ' : 'Net total: '}
              {formatCurrency(filteredTotal)}
            </span>
          )}
        </div>
        {csvTooLarge && (
          <span className="text-amber-600">
            ⚠ Raw CSV data too large to save — only category assignments will persist on refresh
          </span>
        )}
      </div>

      <div className="overflow-auto max-h-[80vh] rounded-xl border border-gray-200">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-100 border-b border-gray-200">
              {/* Omit */}
              <th className="pl-3 pr-1 py-2.5 w-8">
                <span className="text-xs text-gray-400" title="Omit row">
                  ✕
                </span>
              </th>
              {/* Select all (filtered) */}
              <th className="px-1 py-2.5 w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => {
                    if (allSelected) {
                      dispatch({ type: 'CLEAR_SELECTION' })
                    } else {
                      dispatch({ type: 'SELECT_ROWS', payload: { rowIds: filteredNonOmittedIds } })
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600"
                  title="Select all visible"
                />
              </th>
              {/* Column headers */}
              {visibleConfigs.map(config => {
                const sortable = SORTABLE_ROLES.has(config.role)
                const key = config.originalIndex.toString()
                const activeDir = sort?.key === key ? sort.dir : null
                return (
                  <th
                    key={config.originalIndex}
                    className={[
                      'px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider',
                      config.role === 'amount' ? 'text-right' : '',
                      sortable ? 'cursor-pointer select-none hover:bg-gray-200/60' : '',
                    ].join(' ')}
                    onClick={sortable ? () => handleSort(key) : undefined}
                  >
                    <span
                      className={[
                        'inline-flex items-center',
                        config.role === 'date'
                          ? 'text-blue-600'
                          : config.role === 'amount'
                            ? 'text-green-600'
                            : config.role === 'description'
                              ? 'text-purple-600'
                              : 'text-gray-500',
                      ].join(' ')}
                    >
                      {config.displayName}
                      {sortable && <SortIcon dir={activeDir} />}
                    </span>
                  </th>
                )
              })}
              {/* Category */}
              <th
                className="px-2 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-44 cursor-pointer select-none hover:bg-gray-200/60"
                onClick={() => handleSort('__category__')}
              >
                <span className="inline-flex items-center">
                  Category
                  <SortIcon dir={sort?.key === '__category__' ? sort.dir : null} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, i) => (
              <ExpenseRow
                key={row.id}
                row={row}
                columnConfigs={state.columnConfigs}
                categoryList={activeList}
                topSubcategoryIds={topIds}
                isSelected={state.selectedRowIds.has(row.id)}
                isAlt={i % 2 === 1}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
