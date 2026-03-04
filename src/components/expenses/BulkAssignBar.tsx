import { useState } from 'react'
import { useAppContext } from '../../store/AppContext'
import { getActiveList } from '../../utils/categoryHelpers'
import { useTopCategories } from '../../hooks/useTopCategories'
import { CategoryDropdown } from './CategoryDropdown'

export function BulkAssignBar() {
  const { state, dispatch } = useAppContext()
  const activeList = getActiveList(state)
  const topCategoryIds = useTopCategories(state.expenseRows)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const count = state.selectedRowIds.size
  if (count === 0) return null

  function handleApply() {
    dispatch({
      type: 'BULK_ASSIGN_CATEGORY',
      payload: {
        rowIds: Array.from(state.selectedRowIds),
        subcategoryId: pendingId,
      },
    })
    dispatch({ type: 'CLEAR_SELECTION' })
    setPendingId(null)
  }

  return (
    <div className="mb-3 flex items-center gap-3 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
      <span className="text-sm font-medium text-blue-700">
        {count} row{count !== 1 ? 's' : ''} selected
      </span>
      <span className="text-blue-300">·</span>
      <span className="text-sm text-blue-600">Assign to:</span>
      <div className="w-48">
        <CategoryDropdown
          value={pendingId}
          onChange={setPendingId}
          categoryList={activeList}
          topSubcategoryIds={topCategoryIds}
        />
      </div>
      <button
        onClick={handleApply}
        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Apply
      </button>
      <button
        onClick={() => dispatch({ type: 'CLEAR_SELECTION' })}
        className="px-3 py-1 text-sm text-blue-500 hover:text-blue-700 transition-colors"
      >
        Clear selection
      </button>
    </div>
  )
}
