import { useState, useMemo, useEffect, useRef } from 'react'
import type { ColumnConfig, CategoryList } from '../../types'
import { useDebounce } from '../../hooks/useDebounce'

export interface FiltersState {
  dateStart: string
  dateEnd: string
  amountMin: string
  amountMax: string
  description: string
  categoryId: string
  showOmitted: boolean
}

export const defaultFilters: FiltersState = {
  dateStart: '',
  dateEnd: '',
  amountMin: '',
  amountMax: '',
  description: '',
  categoryId: '',
  showOmitted: true,
}

interface Props {
  onActiveFiltersChange: (f: FiltersState) => void
  columnConfigs: ColumnConfig[]
  categoryList: CategoryList | null
}

export function ExpenseFilters({ onActiveFiltersChange, columnConfigs, categoryList }: Props) {
  const [expanded, setExpanded] = useState(true)
  const [inputs, setInputs] = useState<FiltersState>(defaultFilters)

  const debouncedDescription = useDebounce(inputs.description, 300)
  const debouncedAmountMin = useDebounce(inputs.amountMin, 300)
  const debouncedAmountMax = useDebounce(inputs.amountMax, 300)

  const activeFilters = useMemo<FiltersState>(
    () => ({
      dateStart: inputs.dateStart,
      dateEnd: inputs.dateEnd,
      categoryId: inputs.categoryId,
      showOmitted: inputs.showOmitted,
      description: debouncedDescription,
      amountMin: debouncedAmountMin,
      amountMax: debouncedAmountMax,
    }),
    // Primitives only — avoids a new object reference (and a table re-render) on every keystroke
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inputs.dateStart, inputs.dateEnd, inputs.categoryId, inputs.showOmitted, debouncedDescription, debouncedAmountMin, debouncedAmountMax],
  )

  // Notify parent only when activeFilters changes, skip the initial mount
  // since ExpenseTable initialises with defaultFilters already
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    onActiveFiltersChange(activeFilters)
  }, [activeFilters]) // onActiveFiltersChange is a stable setState setter

  const hasDate = columnConfigs.some(c => c.role === 'date')
  const hasAmount = columnConfigs.some(c => c.role === 'amount')
  const hasDescription = columnConfigs.some(c => c.role === 'description')

  // Use inputs (not activeFilters) so the badge appears while the user is typing
  const isActive =
    !!inputs.dateStart ||
    !!inputs.dateEnd ||
    inputs.amountMin !== '' ||
    inputs.amountMax !== '' ||
    !!inputs.description ||
    !!inputs.categoryId ||
    !inputs.showOmitted

  const set = <K extends keyof FiltersState>(key: K, value: FiltersState[K]) =>
    setInputs(prev => ({ ...prev, [key]: value }))

  const clear = () => setInputs(defaultFilters)

  const inputClass =
    'text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 bg-white'

  return (
    <div className="mb-4 border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-700">Filters</span>
          {isActive && (
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
              Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <button
              onClick={e => {
                e.stopPropagation()
                clear()
              }}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-0.5 rounded hover:bg-gray-200 transition-colors"
            >
              Clear
            </button>
          )}
          <span className="text-gray-400 text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 py-3 flex flex-wrap gap-4 items-end">
          {hasDate && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-blue-600">Date range</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={inputs.dateStart}
                  onChange={e => set('dateStart', e.target.value)}
                  className={`${inputClass} focus:ring-blue-300 w-36`}
                />
                <span className="text-gray-400 text-xs">to</span>
                <input
                  type="date"
                  value={inputs.dateEnd}
                  onChange={e => set('dateEnd', e.target.value)}
                  className={`${inputClass} focus:ring-blue-300 w-36`}
                />
              </div>
            </div>
          )}

          {hasAmount && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-green-600">Amount range</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  placeholder="Min"
                  value={inputs.amountMin}
                  onChange={e => set('amountMin', e.target.value)}
                  className={`${inputClass} focus:ring-green-300 w-24`}
                />
                <span className="text-gray-400 text-xs">to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={inputs.amountMax}
                  onChange={e => set('amountMax', e.target.value)}
                  className={`${inputClass} focus:ring-green-300 w-24`}
                />
              </div>
            </div>
          )}

          {hasDescription && (
            <div className="flex flex-col gap-1 flex-1 min-w-35">
              <label className="text-xs font-medium text-purple-600">Description</label>
              <input
                type="text"
                placeholder="Search description..."
                value={inputs.description}
                onChange={e => set('description', e.target.value)}
                className={`${inputClass} focus:ring-purple-300 w-full`}
              />
            </div>
          )}

          <div className="flex flex-col gap-1 min-w-40">
            <label className="text-xs font-medium text-gray-500">Category</label>
            <select
              value={inputs.categoryId}
              onChange={e => set('categoryId', e.target.value)}
              disabled={!categoryList}
              className={`${inputClass} focus:ring-gray-300 w-full`}
            >
              <option value="">All categories</option>
              {categoryList?.categories.map(cat => (
                <optgroup key={cat.id} label={cat.name}>
                  <option value={`cat:${cat.id}`}>All {cat.name}</option>
                  {cat.children.map(sub => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </optgroup>
              ))}
              <option value="__uncategorised__">Uncategorised</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pb-1.5">
            <input
              type="checkbox"
              id="filter-show-omitted"
              checked={inputs.showOmitted}
              onChange={e => set('showOmitted', e.target.checked)}
              className="rounded border-gray-300 text-gray-400"
            />
            <label
              htmlFor="filter-show-omitted"
              className="text-sm text-gray-600 select-none cursor-pointer whitespace-nowrap"
            >
              Show omitted
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
