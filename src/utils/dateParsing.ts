import type { ExpenseRow, ColumnConfig } from '../types'

/**
 * Parse a date string according to a format pattern.
 * Supported tokens: DD, D, MM, M, YYYY, YY
 * Supported separators: / - . space
 */
export function parseDate(value: string, format: string): Date | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const sep = detectSeparator(format)
  if (!sep) return null

  const formatParts = format.split(sep)
  const valueParts = trimmed.split(sep)
  if (formatParts.length !== valueParts.length) return null

  let day = 1
  let month = 0 // 0-indexed
  let year = 2000

  for (let i = 0; i < formatParts.length; i++) {
    const token = formatParts[i].toUpperCase()
    const raw = valueParts[i]
    const num = parseInt(raw, 10)
    if (isNaN(num)) return null

    switch (token) {
      case 'DD':
      case 'D':
        day = num
        break
      case 'MM':
      case 'M':
        month = num - 1
        break
      case 'YYYY':
        year = num
        break
      case 'YY':
        year = num < 70 ? 2000 + num : 1900 + num
        break
      default:
        return null
    }
  }

  // Validate
  if (month < 0 || month > 11) return null
  if (day < 1 || day > 31) return null
  if (year < 1900 || year > 2100) return null

  const date = new Date(year, month, day)
  // Check the date is valid (e.g. Feb 30 would roll over)
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null
  }
  return date
}

function detectSeparator(format: string): string | null {
  for (const sep of ['/', '-', '.', ' ']) {
    if (format.includes(sep)) return sep
  }
  return null
}

/**
 * Extract and parse dates from expense rows using the date column config.
 * Returns null if no date column is configured.
 */
export function extractExpenseDates(
  rows: ExpenseRow[],
  columnConfigs: ColumnConfig[],
): Map<string, Date> | null {
  const dateConfig = columnConfigs.find(c => c.role === 'date')
  if (!dateConfig) return null

  const format = dateConfig.dateFormat ?? 'DD/MM/YYYY'
  const dates = new Map<string, Date>()

  for (const row of rows) {
    if (row.omit) continue
    const rawVal = row.raw[dateConfig.originalIndex] ?? ''
    const parsed = parseDate(rawVal, format)
    if (parsed) {
      dates.set(row.id, parsed)
    }
  }

  return dates.size > 0 ? dates : null
}

/**
 * Get the min and max dates from a date map.
 */
export function getDateRange(dates: Map<string, Date>): { start: Date; end: Date } | null {
  if (dates.size === 0) return null

  let min = Infinity
  let max = -Infinity
  for (const d of dates.values()) {
    const t = d.getTime()
    if (t < min) min = t
    if (t > max) max = t
  }
  return { start: new Date(min), end: new Date(max) }
}

/**
 * Generate an array of { year, month } spanning a date range (inclusive of both endpoints' months).
 */
export function getMonthsBetween(start: Date, end: Date): Array<{ year: number; month: number }> {
  const months: Array<{ year: number; month: number }> = []
  let y = start.getFullYear()
  let m = start.getMonth()
  const endY = end.getFullYear()
  const endM = end.getMonth()

  while (y < endY || (y === endY && m <= endM)) {
    months.push({ year: y, month: m })
    m++
    if (m > 11) { m = 0; y++ }
  }
  return months
}

/**
 * Format a month as "Mar 2024".
 */
export function formatMonthLabel(year: number, month: number): string {
  const d = new Date(year, month, 1)
  return d.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })
}

/**
 * Get a "YYYY-MM" key for a Date.
 */
export function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}
