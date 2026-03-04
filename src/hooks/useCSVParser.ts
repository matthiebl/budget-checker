import { useState, useCallback } from 'react'
import Papa from 'papaparse'
import type { ParsedCSV, ColumnConfig } from '../types'

interface UseCSVParserResult {
  parse: (file: File) => void
  loading: boolean
  error: string | null
}

function detectHeaders(firstRow: string[]): boolean {
  // If fewer than 2 cells parse as valid numbers, treat as headers
  const numericCount = firstRow.filter(cell => {
    const trimmed = cell.trim().replace(/[$,]/g, '')
    return trimmed !== '' && !isNaN(Number(trimmed))
  }).length
  return numericCount < 2
}

export function useCSVParser(
  onParsed: (csv: ParsedCSV, configs: ColumnConfig[]) => void
): UseCSVParserResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parse = useCallback((file: File) => {
    setLoading(true)
    setError(null)

    Papa.parse<string[]>(file, {
      skipEmptyLines: true,
      complete: (results) => {
        const allRows = results.data as string[][]
        if (allRows.length === 0) {
          setError('The CSV file appears to be empty.')
          setLoading(false)
          return
        }

        const hasHeaders = detectHeaders(allRows[0])
        const rawHeaders = hasHeaders
          ? allRows[0]
          : allRows[0].map((_, i) => `Column ${i + 1}`)
        const dataRows = hasHeaders ? allRows.slice(1) : allRows

        const csv: ParsedCSV = { hasHeaders, rawHeaders, rows: dataRows }

        const configs: ColumnConfig[] = rawHeaders.map((header, i) => ({
          originalIndex: i,
          originalHeader: header,
          displayName: header,
          role: 'other',
        }))

        onParsed(csv, configs)
        setLoading(false)
      },
      error: (err) => {
        setError(`Failed to parse CSV: ${err.message}`)
        setLoading(false)
      },
    })
  }, [onParsed])

  return { parse, loading, error }
}
