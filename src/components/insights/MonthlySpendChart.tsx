import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { roundToTwo } from '../../utils/budgetCalculations'
import { formatMonthLabel } from '../../utils/dateParsing'
import type { InsightsData } from '../../utils/insightsCalculations'

interface MonthlySpendChartProps {
  data: InsightsData
}

export function MonthlySpendChart({ data }: MonthlySpendChartProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all')

  const chartData = useMemo(() => {
    return data.months.map(m => {
      const key = `${m.year}-${String(m.month + 1).padStart(2, '0')}`
      const label = formatMonthLabel(m.year, m.month)

      let actual = 0
      let budget = 0

      if (selectedCategoryId === 'all') {
        for (const cat of data.categories) {
          actual += cat.actualByMonth.get(key) ?? 0
          budget += cat.budgetMonthly
        }
      } else {
        const cat = data.categories.find(c => c.categoryId === selectedCategoryId)
        if (cat) {
          actual = cat.actualByMonth.get(key) ?? 0
          budget = cat.budgetMonthly
        }
      }

      return {
        month: label,
        Actual: roundToTwo(actual),
        Budget: roundToTwo(budget),
      }
    })
  }, [data, selectedCategoryId])

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Monthly Spend vs Budget</h3>
        <select
          value={selectedCategoryId}
          onChange={e => setSelectedCategoryId(e.target.value)}
          className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 focus:border-blue-400 focus:outline-none"
        >
          <option value="all">All Categories</option>
          {data.categories.map(c => (
            <option key={c.categoryId} value={c.categoryId}>{c.categoryName}</option>
          ))}
        </select>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
          <Tooltip
            formatter={(value: number | string | undefined) => [`$${Number(value ?? 0).toFixed(2)}`, undefined]}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Budget" fill="#93C5FD" radius={[3, 3, 0, 0]} />
          <Bar dataKey="Actual" fill="#3B82F6" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
