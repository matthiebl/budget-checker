import { useState, useMemo } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { formatCurrency, roundToTwo } from '../../utils/budgetCalculations'
import type { InsightsData } from '../../utils/insightsCalculations'
import { CHART_COLORS } from '../../utils/insightsCalculations'

interface CategoryBreakdownChartProps {
  data: InsightsData
}

export function CategoryBreakdownChart({ data }: CategoryBreakdownChartProps) {
  const [view, setView] = useState<'actual' | 'budget'>('actual')

  const chartData = useMemo(() => {
    return data.categories
      .map((cat, i) => ({
        name: cat.categoryName,
        value: roundToTwo(view === 'actual' ? cat.actualTotal : cat.budgetMonthly * data.totalMonths),
        color: CHART_COLORS[i % CHART_COLORS.length],
      }))
      .filter(d => d.value > 0)
  }, [data, view])

  const total = chartData.reduce((s, d) => s + d.value, 0)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Spending by Category</h3>
        <div className="flex text-xs border border-gray-200 rounded overflow-hidden">
          <button
            onClick={() => setView('actual')}
            className={`px-2.5 py-1 transition-colors ${view === 'actual' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Actual
          </button>
          <button
            onClick={() => setView('budget')}
            className={`px-2.5 py-1 transition-colors ${view === 'budget' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Budget
          </button>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="h-80 flex items-center justify-center text-sm text-gray-400">
          No data to display
        </div>
      ) : (
        <div className="relative">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="80%"
                paddingAngle={2}
                strokeWidth={0}
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number | string | undefined) => formatCurrency(Number(value ?? 0))}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                formatter={(value: string, _entry) => {
                  const item = chartData.find(d => d.name === value)
                  const pct = item && total > 0 ? Math.round((item.value / total) * 100) : 0
                  return `${value} (${pct}%)`
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginBottom: 40 }}>
            <div className="text-center">
              <p className="text-xs text-gray-400">{view === 'actual' ? 'Total Spend' : 'Total Budget'}</p>
              <p className="text-base font-bold text-gray-700">{formatCurrency(total)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
