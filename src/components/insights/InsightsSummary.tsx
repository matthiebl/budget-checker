import { formatCurrency } from '../../utils/budgetCalculations'
import type { InsightsData, InsightSentence } from '../../utils/insightsCalculations'
import { generateInsightSentences } from '../../utils/insightsCalculations'

interface InsightsSummaryProps {
  data: InsightsData
}

function MetricCard({ label, value, sub, color }: {
  label: string
  value: string
  sub?: string
  color: 'blue' | 'green' | 'red' | 'amber'
}) {
  const colorMap = {
    blue: 'border-blue-200 bg-blue-50/50',
    green: 'border-green-200 bg-green-50/50',
    red: 'border-red-200 bg-red-50/50',
    amber: 'border-amber-200 bg-amber-50/50',
  }
  const textColor = {
    blue: 'text-blue-700',
    green: 'text-green-700',
    red: 'text-red-700',
    amber: 'text-amber-700',
  }

  return (
    <div className={`rounded-lg border p-3 ${colorMap[color]}`}>
      <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
      <p className={`text-lg font-bold ${textColor[color]}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

const ICON_MAP: Record<InsightSentence['type'], string> = {
  overspend: '!',
  underspend: '~',
  info: 'i',
  positive: '✓',
}

const ICON_COLOR_MAP: Record<InsightSentence['type'], string> = {
  overspend: 'bg-red-100 text-red-600 border-red-200',
  underspend: 'bg-amber-100 text-amber-600 border-amber-200',
  info: 'bg-blue-100 text-blue-600 border-blue-200',
  positive: 'bg-green-100 text-green-600 border-green-200',
}

export function InsightsSummary({ data }: InsightsSummaryProps) {
  const proRatedBudget = data.totalBudgetMonthly * data.totalMonths
  const totalVariance = proRatedBudget - data.totalActual
  const isOver = totalVariance < 0

  const sentences = generateInsightSentences(data)

  return (
    <div className="mb-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <MetricCard
          label={`Budget (${data.totalMonths.toFixed(1)} months)`}
          value={formatCurrency(proRatedBudget)}
          sub={`${formatCurrency(data.totalBudgetMonthly)}/month`}
          color="blue"
        />
        <MetricCard
          label="Total Actual Spend"
          value={formatCurrency(data.totalActual)}
          sub={`${formatCurrency(data.totalActual / data.totalMonths)}/month`}
          color={isOver ? 'red' : 'green'}
        />
        <MetricCard
          label="Variance"
          value={`${isOver ? '-' : '+'}${formatCurrency(Math.abs(totalVariance))}`}
          sub={isOver ? 'Over budget' : 'Under budget'}
          color={isOver ? 'red' : 'green'}
        />
        {data.unassignedCount > 0 ? (
          <MetricCard
            label="Unassigned Expenses"
            value={String(data.unassignedCount)}
            sub={formatCurrency(data.unassignedTotal)}
            color="amber"
          />
        ) : (
          <MetricCard
            label="Categories Tracked"
            value={String(data.categories.filter(c => c.actualTotal > 0).length)}
            sub={`of ${data.categories.length} categories`}
            color="blue"
          />
        )}
      </div>

      {/* Insight sentences */}
      {sentences.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Key Insights</h3>
          <div className="space-y-2">
            {sentences.map((s, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className={`shrink-0 w-5 h-5 rounded-full border text-xs font-bold flex items-center justify-center mt-0.5 ${ICON_COLOR_MAP[s.type]}`}>
                  {ICON_MAP[s.type]}
                </span>
                <p className="text-sm text-gray-600 leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
