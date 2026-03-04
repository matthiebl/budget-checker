import { useTopCategories } from '../../hooks/useTopCategories'
import { useAppContext } from '../../store/AppContext'
import { getActiveList } from '../../utils/categoryHelpers'
import { isCSVTooLargeToStore } from '../../utils/storageHelpers'
import { ExpenseRow } from './ExpenseRow'

export function ExpenseTable() {
  const { state, dispatch } = useAppContext()
  const activeList = getActiveList(state)
  const topIds = useTopCategories(state.expenseRows)

  if (state.expenseRows.length === 0) return null

  const visibleConfigs = state.columnConfigs.filter(c => c.role !== 'omit')
  const allNonOmittedIds = state.expenseRows.filter(r => !r.omit).map(r => r.id)
  const allSelected =
    allNonOmittedIds.length > 0 &&
    allNonOmittedIds.every(id => state.selectedRowIds.has(id))
  const csvTooLarge = isCSVTooLargeToStore(state)

  const categorisedCount = state.expenseRows.filter(
    r => !r.omit && r.categoryId,
  ).length
  const totalNonOmitted = state.expenseRows.filter(r => !r.omit).length

  return (
    <div>
      {/* Stats bar */}
      <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
        <div className="flex gap-4">
          <span>{state.expenseRows.length} rows total</span>
          <span>{state.expenseRows.filter(r => r.omit).length} omitted</span>
          <span
            className={
              categorisedCount === totalNonOmitted
                ? 'text-green-600 font-medium'
                : ''
            }
          >
            {categorisedCount}/{totalNonOmitted} categorised
          </span>
        </div>
        {csvTooLarge && (
          <span className="text-amber-600">
            ⚠ Raw CSV data too large to save — only category assignments will
            persist on refresh
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
              {/* Select all */}
              <th className="px-1 py-2.5 w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => {
                    if (allSelected) {
                      dispatch({ type: 'CLEAR_SELECTION' })
                    } else {
                      dispatch({ type: 'SELECT_ALL_ROWS' })
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600"
                  title="Select all"
                />
              </th>
              {/* Column headers */}
              {visibleConfigs.map(config => (
                <th
                  key={config.originalIndex}
                  className={[
                    'px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider',
                    config.role === 'amount' ? 'text-right' : '',
                  ].join(' ')}
                >
                  <span
                    className={[
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
                  </span>
                </th>
              ))}
              {/* Category */}
              <th className="px-2 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-44">
                Category
              </th>
            </tr>
          </thead>
          <tbody>
            {state.expenseRows.map((row, i) => (
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
