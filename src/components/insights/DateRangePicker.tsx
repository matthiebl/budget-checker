interface DateRangePickerProps {
  value: { start: string; end: string } | null
  onChange: (range: { start: string; end: string }) => void
  hasDetectedDates: boolean
  onReset?: () => void
}

export function DateRangePicker({ value, onChange, hasDetectedDates, onReset }: DateRangePickerProps) {
  const start = value?.start ?? ''
  const end = value?.end ?? ''

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3 mb-5 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
        Date range
        {hasDetectedDates && !onReset && (
          <span className="text-gray-400 font-normal">(detected from data)</span>
        )}
        {onReset && (
          <span className="text-gray-400 font-normal">(overridden)</span>
        )}
      </div>
      <label className="text-xs text-gray-600 flex items-center gap-1.5">
        From
        <input
          type="date"
          value={start}
          onChange={e => onChange({ start: e.target.value, end: end || e.target.value })}
          className="text-sm px-2 py-1 border border-gray-200 rounded bg-white focus:border-blue-400 focus:outline-none"
        />
      </label>
      <label className="text-xs text-gray-600 flex items-center gap-1.5">
        To
        <input
          type="date"
          value={end}
          min={start}
          onChange={e => onChange({ start: start || e.target.value, end: e.target.value })}
          className="text-sm px-2 py-1 border border-gray-200 rounded bg-white focus:border-blue-400 focus:outline-none"
        />
      </label>
      {onReset && (
        <button
          onClick={onReset}
          className="text-xs text-blue-500 hover:text-blue-700 underline"
        >
          Reset to detected
        </button>
      )}
      {!hasDetectedDates && (
        <span className="text-xs text-amber-600">No date column detected — spending will be spread evenly across months</span>
      )}
    </div>
  )
}
