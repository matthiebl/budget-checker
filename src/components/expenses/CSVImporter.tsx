import { useRef, useState } from 'react'
import { useAppContext } from '../../store/AppContext'
import { useCSVParser } from '../../hooks/useCSVParser'
import type { ParsedCSV, ColumnConfig } from '../../types'

export function CSVImporter() {
  const { state, dispatch } = useAppContext()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleParsed(csv: ParsedCSV, configs: ColumnConfig[]) {
    // Build expense rows from CSV
    const rows = csv.rows.map((raw, i) => ({
      id: `row-${i}-${Math.random().toString(36).slice(2, 7)}`,
      raw,
      omit: false,
      categoryId: null,
    }))
    dispatch({ type: 'SET_PARSED_CSV', payload: { csv } })
    dispatch({ type: 'SET_COLUMN_CONFIGS', payload: { configs } })
    dispatch({ type: 'SET_EXPENSE_ROWS', payload: { rows } })
  }

  const { parse, loading, error } = useCSVParser(handleParsed)

  function handleFile(file: File) {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      return
    }
    parse(file)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset input so same file can be re-imported
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleClear() {
    dispatch({ type: 'CLEAR_CSV' })
  }

  const hasData = !!state.parsedCSV

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
          CSV Import
        </h3>
        {hasData && (
          <button
            onClick={handleClear}
            className="text-xs text-red-500 hover:text-red-700 underline"
          >
            Clear &amp; re-import
          </button>
        )}
      </div>

      {!hasData && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={[
            'border-2 border-dashed rounded-xl py-10 text-center cursor-pointer transition-colors',
            dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50',
          ].join(' ')}
        >
          <div className="text-3xl mb-2">📄</div>
          <p className="text-sm text-gray-500">
            {loading ? 'Parsing CSV…' : 'Drop a CSV file here, or click to browse'}
          </p>
          <p className="text-xs text-gray-400 mt-1">Headers will be detected automatically</p>
        </div>
      )}

      {hasData && (
        <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm">
          <span className="text-green-600">✓</span>
          <span className="text-green-700 font-medium">
            {state.parsedCSV!.rows.length} rows imported
          </span>
          <span className="text-green-500">
            · {state.columnConfigs.length} columns detected
            {state.parsedCSV!.hasHeaders ? ' (with headers)' : ' (no headers detected)'}
          </span>
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  )
}
