import { useAppContext } from '../../store/AppContext'
import { getActiveList } from '../../utils/categoryHelpers'
import { PeriodSelector } from './PeriodSelector'
import { BudgetTable } from './BudgetTable'

export function BudgetTab() {
  const { state, dispatch } = useAppContext()
  const activeList = getActiveList(state)

  if (!activeList) {
    return (
      <div className="text-sm text-gray-400 italic py-8 text-center">
        Create a category list in the Categories tab first.
      </div>
    )
  }

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{activeList.name}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Enter budget amounts per subcategory. Editing any period column will update all others automatically.
          </p>
        </div>
        <PeriodSelector
          value={state.activePeriod}
          onChange={period => dispatch({ type: 'SET_ACTIVE_PERIOD', payload: { period } })}
        />
      </div>

      <BudgetTable categoryList={activeList} budgetEntries={state.budgetEntries} />
    </div>
  )
}
