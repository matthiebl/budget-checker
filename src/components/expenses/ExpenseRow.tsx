import { useAppContext } from '../../store/AppContext'
import type { ExpenseRow as ExpenseRowType, ColumnConfig, CategoryList } from '../../types'
import { CategoryDropdown } from './CategoryDropdown'

interface ExpenseRowProps {
  row: ExpenseRowType
  columnConfigs: ColumnConfig[]
  categoryList: CategoryList | null
  topSubcategoryIds: string[]
  isSelected: boolean
  isAlt: boolean
}

function formatCellValue(value: string, config: ColumnConfig): string {
  if (config.role === 'amount') {
    const num = parseFloat(value.replace(/[$,]/g, ''))
    if (!isNaN(num)) {
      const amount = config.negateAmount ? -num : num
      return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
        minimumFractionDigits: 2,
      }).format(amount)
    }
  }
  return value
}

function isNegativeAmount(value: string, config: ColumnConfig): boolean {
  if (config.role !== 'amount') return false
  const num = parseFloat(value.replace(/[$,]/g, ''))
  if (isNaN(num)) return false
  const amount = config.negateAmount ? -num : num
  return amount < 0
}

export function ExpenseRow({
  row,
  columnConfigs,
  categoryList,
  topSubcategoryIds,
  isSelected,
  isAlt,
}: ExpenseRowProps) {
  const { dispatch } = useAppContext()

  const visibleConfigs = columnConfigs.filter(c => c.role !== 'omit')

  return (
    <tr
      className={[
        'border-b border-gray-100 transition-colors',
        row.omit ? 'opacity-40' : '',
        isSelected ? 'border-l-2 border-l-blue-400' : '',
        isAlt && !isSelected ? 'bg-gray-50/40' : 'bg-white',
        isSelected ? 'bg-blue-50/40' : '',
      ].join(' ')}
    >
      {/* Omit checkbox */}
      <td className="pl-3 pr-1 py-2 w-8">
        <input
          type="checkbox"
          checked={row.omit}
          onChange={() => dispatch({ type: 'TOGGLE_ROW_OMIT', payload: { rowId: row.id } })}
          className="rounded border-gray-300 text-gray-400"
          title="Omit this row"
        />
      </td>

      {/* Multi-select checkbox */}
      <td className="px-1 py-2 w-8">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => dispatch({ type: 'TOGGLE_ROW_SELECT', payload: { rowId: row.id } })}
          className="rounded border-gray-300 text-blue-600"
          disabled={row.omit}
          title="Select for bulk assign"
        />
      </td>

      {/* Data cells */}
      {visibleConfigs.map(config => {
        const value = row.raw[config.originalIndex] ?? ''
        const formatted = formatCellValue(value, config)
        const isNeg = isNegativeAmount(value, config)

        return (
          <td
            key={config.originalIndex}
            className={[
              'px-3 py-2 text-sm max-w-xs truncate',
              config.role === 'amount' ? 'text-right tabular-nums' : '',
              isNeg ? 'text-red-600' : 'text-gray-700',
              row.omit ? 'line-through' : '',
            ].join(' ')}
            title={value}
          >
            {formatted}
          </td>
        )
      })}

      {/* Category dropdown */}
      <td className="px-2 py-1.5 w-44">
        <CategoryDropdown
          value={row.categoryId}
          onChange={id => dispatch({ type: 'ASSIGN_CATEGORY', payload: { rowId: row.id, subcategoryId: id } })}
          categoryList={categoryList}
          topSubcategoryIds={topSubcategoryIds}
          disabled={row.omit}
        />
      </td>
    </tr>
  )
}
