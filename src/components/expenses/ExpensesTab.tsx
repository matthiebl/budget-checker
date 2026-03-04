import { useAppContext } from '../../store/AppContext'
import { getActiveList } from '../../utils/categoryHelpers'
import { CSVImporter } from './CSVImporter'
import { ColumnConfigurator } from './ColumnConfigurator'
import { BulkAssignBar } from './BulkAssignBar'
import { ExpenseTable } from './ExpenseTable'

export function ExpensesTab() {
  const { state } = useAppContext()
  const activeList = getActiveList(state)

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-gray-800">Expense Categorisation</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Import a CSV file of expenses, configure columns, then assign categories to each row.
        </p>
        {!activeList && (
          <div className="mt-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            ⚠ No category list selected. Go to the Categories tab to create one so you can assign expenses.
          </div>
        )}
      </div>

      <CSVImporter />

      {state.parsedCSV && (
        <>
          <ColumnConfigurator />
          <BulkAssignBar />
          <ExpenseTable />
        </>
      )}
    </div>
  )
}
