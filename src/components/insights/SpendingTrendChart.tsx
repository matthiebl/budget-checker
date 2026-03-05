import { useMemo } from 'react'
import {
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area,
  AreaChart,
} from 'recharts'
import { roundToTwo } from '../../utils/budgetCalculations'
import { formatMonthLabel } from '../../utils/dateParsing'
import type { InsightsData } from '../../utils/insightsCalculations'

interface SpendingTrendChartProps {
  data: InsightsData
}

export function SpendingTrendChart({ data }: SpendingTrendChartProps) {
  const chartData = useMemo(() => {
    let cumulativeBudget = 0
    let cumulativeActual = 0

    return data.months.map(m => {
      const key = `${m.year}-${String(m.month + 1).padStart(2, '0')}`
      const label = formatMonthLabel(m.year, m.month)

      cumulativeBudget += data.totalBudgetMonthly
      let monthActual = 0
      for (const cat of data.categories) {
        monthActual += cat.actualByMonth.get(key) ?? 0
      }
      cumulativeActual += monthActual

      return {
        month: label,
        'Cumulative Budget': roundToTwo(cumulativeBudget),
        'Cumulative Actual': roundToTwo(cumulativeActual),
      }
    })
  }, [data])

  // Only show when there are 3+ months
  if (data.months.length < 3) return null

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Spending Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
          <Tooltip
            formatter={(value: number | string | undefined) => [`$${Number(value ?? 0).toFixed(2)}`, undefined]}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            type="monotone"
            dataKey="Cumulative Budget"
            stroke="#93C5FD"
            fill="#DBEAFE"
            strokeWidth={2}
            strokeDasharray="6 3"
            fillOpacity={0.3}
          />
          <Area
            type="monotone"
            dataKey="Cumulative Actual"
            stroke="#3B82F6"
            fill="#3B82F6"
            strokeWidth={2}
            fillOpacity={0.1}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
