import ExcelJS from 'exceljs'
import type { AppState, Period, CategoryList, BudgetEntry } from '../types'
import {
  displayAmount,
  getCategoryWeeklyTotal,
  roundToTwo,
} from './budgetCalculations'
import { findSubcategoryById, findCategoryForSubcategory } from './categoryHelpers'
import { appStateToPersistedState } from './storageHelpers'
import { buildShareURL } from './urlEncoding'
import { computeInsights, generateInsightSentences, type InsightsData } from './insightsCalculations'
import { extractExpenseDates, getDateRange, formatMonthLabel } from './dateParsing'

const PERIODS: Period[] = ['week', 'fortnight', 'month', 'year']
const PERIOD_LABELS = { week: 'Weekly', fortnight: 'Fortnightly', month: 'Monthly', year: 'Yearly' }

// ─── Colour constants ─────────────────────────────────────────────────────────
const BLUE_DARK = 'FF1E40AF'
const BLUE_LIGHT = 'FFDBEAFE'
const ROW_ALT = 'FFF8FAFC'
const YELLOW_LIGHT = 'FFFEFCE8'
const WHITE = 'FFFFFFFF'
const GREEN_FILL = 'FFD1FAE5'
const AMBER_FILL = 'FFFEF3C7'
const RED_FILL = 'FFFEE2E2'
const GREEN_TEXT = 'FF065F46'
const AMBER_TEXT = 'FF92400E'
const RED_TEXT = 'FF991B1B'
const GREEN_VARIANCE = 'FF16A34A'
const RED_VARIANCE = 'FFDC2626'

function headerFont(): Partial<ExcelJS.Font> {
  return { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
}

function applyHeaderStyle(cell: ExcelJS.Cell) {
  cell.font = headerFont()
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE_DARK } }
  cell.alignment = { vertical: 'middle', horizontal: 'center' }
  cell.border = {
    bottom: { style: 'thin', color: { argb: BLUE_DARK } },
  }
}

function setColumnWidths(sheet: ExcelJS.Worksheet, widths: number[]) {
  widths.forEach((w, i) => {
    sheet.getColumn(i + 1).width = w
  })
}

function currencyFormat(): string {
  return '"$"#,##0.00'
}

function getStatusText(percent: number): string {
  if (!isFinite(percent) || percent > 100) return 'Over'
  if (percent >= 90) return 'Near'
  return 'Under'
}

function applyStatusStyle(cell: ExcelJS.Cell, percent: number, bold = false) {
  const isOver = !isFinite(percent) || percent > 100
  const isNear = isFinite(percent) && percent >= 90 && percent <= 100
  if (isOver) {
    cell.font = { bold, color: { argb: RED_TEXT } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RED_FILL } }
  } else if (isNear) {
    cell.font = { bold, color: { argb: AMBER_TEXT } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AMBER_FILL } }
  } else {
    cell.font = { bold, color: { argb: GREEN_TEXT } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN_FILL } }
  }
  cell.alignment = { horizontal: 'center' }
}

// ─── Sheet 1: Categories & Budget ─────────────────────────────────────────────

function buildCategoriesSheet(
  wb: ExcelJS.Workbook,
  categoryList: CategoryList | null,
  budgetEntries: BudgetEntry[]
): void {
  const sheet = wb.addWorksheet('Categories & Budget')

  if (!categoryList) {
    sheet.addRow(['No category list selected'])
    return
  }

  // Title row
  const titleRow = sheet.addRow(['Budget Tracker – ' + categoryList.name])
  sheet.mergeCells('A1:G1')
  const titleCell = sheet.getCell('A1')
  titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE_DARK } }
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' }
  titleRow.height = 30

  // Date row
  sheet.addRow([`Generated: ${new Date().toLocaleDateString('en-AU', { dateStyle: 'long' })}`])
  sheet.getCell('A2').font = { italic: true, color: { argb: 'FF6B7280' } }
  sheet.addRow([]) // blank

  // Headers
  const headerRow = sheet.addRow(['Category', 'Subcategory', ...PERIODS.map(p => PERIOD_LABELS[p]), 'Annual'])
  headerRow.eachCell(cell => applyHeaderStyle(cell))
  headerRow.height = 22

  const dataStartRow = 5
  let currentRow = dataStartRow
  let altRow = 0

  for (const category of categoryList.categories) {
    const categoryRowNum = currentRow
    const subcategoryStart = currentRow + 1
    const subcategoryEnd = currentRow + category.children.length

    // Category header row
    const catRow = sheet.addRow([
      category.name,
      '',
      ...PERIODS.map(period => {
        const weekly = getCategoryWeeklyTotal(category.id, categoryList, budgetEntries)
        return weekly > 0 ? displayAmount(weekly, period) : 0
      }),
      getCategoryWeeklyTotal(category.id, categoryList, budgetEntries) > 0
        ? displayAmount(getCategoryWeeklyTotal(category.id, categoryList, budgetEntries), 'year')
        : 0,
    ])

    catRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
      cell.font = { bold: true, size: 11 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE_LIGHT } }
      if (colNum >= 3) {
        cell.numFmt = currencyFormat()
        cell.alignment = { horizontal: 'right' }
      }
    })
    catRow.height = 20
    currentRow++

    // Subcategory rows
    for (const sub of category.children) {
      const entry = budgetEntries.find(e => e.subcategoryId === sub.id)
      const weekly = entry?.weeklyAmount ?? 0

      const subRow = sheet.addRow([
        '',
        sub.name,
        ...PERIODS.map(p => weekly > 0 ? displayAmount(weekly, p) : ''),
        weekly > 0 ? displayAmount(weekly, 'year') : '',
      ])

      const isAlt = altRow++ % 2 === 1
      subRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isAlt ? ROW_ALT : WHITE } }
        if (colNum >= 3 && typeof cell.value === 'number') {
          cell.numFmt = currencyFormat()
          cell.alignment = { horizontal: 'right' }
        }
      })
      subRow.height = 18
      currentRow++
    }

    // Overwrite category row values with SUM formulas if there are subcategories
    if (category.children.length > 0) {
      for (let pi = 0; pi < PERIODS.length; pi++) {
        const col = pi + 3 // columns C, D, E, F
        const colLetter = String.fromCharCode(64 + col)
        const catCell = sheet.getCell(categoryRowNum, col)
        catCell.value = {
          formula: `SUM(${colLetter}${subcategoryStart}:${colLetter}${subcategoryEnd})`,
          result: catCell.value as number,
        }
        catCell.numFmt = currencyFormat()
      }
      // Annual column (G)
      const annualCell = sheet.getCell(categoryRowNum, 7)
      annualCell.value = {
        formula: `SUM(G${subcategoryStart}:G${subcategoryEnd})`,
        result: annualCell.value as number,
      }
      annualCell.numFmt = currencyFormat()
    }
  }

  // Grand total row
  const grandWeekly = budgetEntries
    .filter(e => categoryList.categories.flatMap(c => c.children).some(s => s.id === e.subcategoryId))
    .reduce((sum, e) => sum + e.weeklyAmount, 0)

  if (grandWeekly > 0) {
    sheet.addRow([]) // blank
    const totalRow = sheet.addRow([
      'TOTAL', '',
      ...PERIODS.map(p => displayAmount(grandWeekly, p)),
      displayAmount(grandWeekly, 'year'),
    ])
    totalRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
      cell.font = { bold: true }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } }
      if (colNum >= 3 && typeof cell.value === 'number') {
        cell.numFmt = currencyFormat()
        cell.alignment = { horizontal: 'right' }
      }
    })
    totalRow.height = 22
  }

  setColumnWidths(sheet, [20, 24, 14, 14, 14, 14, 16])
}

// ─── Sheet 2: Raw Expenses ────────────────────────────────────────────────────

function buildRawExpensesSheet(wb: ExcelJS.Workbook, state: AppState): void {
  const sheet = wb.addWorksheet('Raw Expenses')

  if (!state.parsedCSV) {
    sheet.addRow(['No CSV data imported'])
    return
  }

  const headerRow = sheet.addRow(state.parsedCSV.rawHeaders)
  headerRow.eachCell(cell => applyHeaderStyle(cell))
  headerRow.height = 22

  state.parsedCSV.rows.forEach((rawRow, i) => {
    const row = sheet.addRow(rawRow)
    const isAlt = i % 2 === 1
    row.eachCell({ includeEmpty: true }, cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isAlt ? ROW_ALT : WHITE } }
    })
    row.height = 16
  })

  const maxWidths = state.parsedCSV.rawHeaders.map(h => h.length)
  state.parsedCSV.rows.forEach(row => {
    row.forEach((cell, i) => {
      maxWidths[i] = Math.max(maxWidths[i] ?? 0, (cell ?? '').length)
    })
  })
  maxWidths.forEach((w, i) => {
    sheet.getColumn(i + 1).width = Math.min(40, Math.max(8, w * 1.1))
  })
}

// ─── Sheet 3: Formatted Expenses ─────────────────────────────────────────────

function buildFormattedExpensesSheet(wb: ExcelJS.Workbook, state: AppState): void {
  const sheet = wb.addWorksheet('Formatted Expenses')

  const activeList = state.categoryLists.find(l => l.id === state.activeCategoryListId) ?? null
  const visibleConfigs = state.columnConfigs.filter(c => c.role !== 'omit')

  const headers = [...visibleConfigs.map(c => c.displayName), 'Category', 'Subcategory']
  const headerRow = sheet.addRow(headers)
  headerRow.eachCell(cell => applyHeaderStyle(cell))
  headerRow.height = 22

  const activeExpenses = state.expenseRows.filter(r => !r.omit)
  activeExpenses.forEach((expRow, i) => {
    const cells: (string | number)[] = visibleConfigs.map(config => {
      const raw = expRow.raw[config.originalIndex] ?? ''
      if (config.role === 'amount') {
        const num = parseFloat(raw.replace(/[$,]/g, ''))
        if (!isNaN(num)) return config.negateAmount ? -num : num
      }
      return raw
    })

    const subcategory = expRow.categoryId && activeList
      ? findSubcategoryById(activeList, expRow.categoryId)
      : null
    const category = expRow.categoryId && activeList
      ? findCategoryForSubcategory(activeList, expRow.categoryId)
      : null

    cells.push(category?.name ?? '')
    cells.push(subcategory?.name ?? '')

    const row = sheet.addRow(cells)
    const isAlt = i % 2 === 1

    row.eachCell({ includeEmpty: true }, (cell, colNum) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isAlt ? ROW_ALT : WHITE } }
      const configIdx = colNum - 1
      if (configIdx < visibleConfigs.length && visibleConfigs[configIdx].role === 'amount' && typeof cell.value === 'number') {
        cell.numFmt = currencyFormat()
        cell.alignment = { horizontal: 'right' }
        if ((cell.value as number) < 0) {
          cell.font = { color: { argb: 'FFDC2626' } }
        }
      }
    })
    row.height = 16
  })

  headers.forEach((h, i) => {
    const col = sheet.getColumn(i + 1)
    col.width = Math.min(40, Math.max(10, h.length * 1.2))
  })
}

// ─── Sheet 4: Budget vs Actual ────────────────────────────────────────────────

function buildBudgetVsActualSheet(
  wb: ExcelJS.Workbook,
  state: AppState,
  insights: InsightsData | null,
  restoreURL: string
): void {
  const sheet = wb.addWorksheet('Budget vs Actual')
  const activeList = state.categoryLists.find(l => l.id === state.activeCategoryListId) ?? null
  const COLS = 8 // A–H

  // Title
  const titleRow = sheet.addRow([`Budget vs Actual${activeList ? ' – ' + activeList.name : ''}`])
  sheet.mergeCells(1, 1, 1, COLS)
  titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } }
  titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE_DARK } }
  titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' }
  titleRow.height = 30

  if (!insights) {
    sheet.addRow([])
    const msgRow = sheet.addRow(['No insights data available. Import expenses and configure columns in the Expenses tab.'])
    sheet.mergeCells(msgRow.number, 1, msgRow.number, COLS)
    msgRow.getCell(1).font = { italic: true, color: { argb: 'FF6B7280' } }
    addRestoreURL(sheet, restoreURL, COLS)
    setColumnWidths(sheet, [22, 26, 14, 14, 14, 14, 10, 10])
    return
  }

  // Period info row
  const startLabel = insights.dateRange.start.toLocaleDateString('en-AU', { dateStyle: 'medium' })
  const endLabel = insights.dateRange.end.toLocaleDateString('en-AU', { dateStyle: 'medium' })
  const periodInfo = `Period: ${startLabel} – ${endLabel}  (${insights.totalMonths.toFixed(1)} months${insights.hasDates ? ', actual dates' : ', estimated – dates spread evenly'})`
  const periodRow = sheet.addRow([periodInfo])
  sheet.mergeCells(2, 1, 2, COLS)
  periodRow.getCell(1).font = { italic: true, color: { argb: 'FF374151' } }
  periodRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F9FF' } }
  periodRow.height = 18

  sheet.addRow([]) // blank

  // Headers: Category | Subcategory | Budget/Month | Budget (Period) | Actual Spend | Variance | % Used | Status
  const headerRow = sheet.addRow([
    'Category', 'Subcategory', 'Budget/Month', 'Budget (Period)', 'Actual Spend', 'Variance', '% Used', 'Status',
  ])
  headerRow.eachCell(cell => applyHeaderStyle(cell))
  headerRow.getCell(3).alignment = { horizontal: 'right' }
  headerRow.getCell(4).alignment = { horizontal: 'right' }
  headerRow.getCell(5).alignment = { horizontal: 'right' }
  headerRow.getCell(6).alignment = { horizontal: 'right' }
  headerRow.getCell(7).alignment = { horizontal: 'right' }
  headerRow.height = 22

  const dataStartRow = 5
  let rowNum = dataStartRow
  let altRow = 0

  for (const category of insights.categories) {
    const proRatedCat = roundToTwo(category.budgetMonthly * insights.totalMonths)
    const hasData = category.budgetMonthly > 0 || category.actualTotal > 0
    const varianceVal = hasData ? category.variance : ''
    const pctUsed = category.budgetMonthly > 0 ? category.variancePercent / 100 : ''

    const catRow = sheet.addRow([
      category.categoryName,
      '—',
      category.budgetMonthly || '',
      proRatedCat || '',
      category.actualTotal || '',
      varianceVal,
      pctUsed,
      category.budgetMonthly > 0 ? getStatusText(category.variancePercent) : '',
    ])

    catRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
      if (colNum !== 8) cell.font = { bold: true, size: 11 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE_LIGHT } }
      if (colNum >= 3) {
        switch (colNum) {
          case 6:
            cell.numFmt = currencyFormat()
            cell.alignment = { horizontal: 'right' }
            if (typeof cell.value === 'number') {
              cell.font = { bold: true, color: { argb: cell.value < 0 ? RED_VARIANCE : GREEN_VARIANCE } }
            }
            break
          case 7:
            if (typeof cell.value === 'number') {
              cell.numFmt = '0%'
              cell.alignment = { horizontal: 'right' }
              cell.font = { bold: true }
            }
            break
          case 8:
            if (cell.value) applyStatusStyle(cell, category.variancePercent, true)
            break
          default:
            if (typeof cell.value === 'number') {
              cell.numFmt = currencyFormat()
              cell.alignment = { horizontal: 'right' }
              cell.font = { bold: true }
            }
        }
      }
    })
    catRow.height = 20
    rowNum++

    // Subcategory rows
    for (const sub of category.subcategories) {
      if (sub.budgetMonthly === 0 && sub.actualTotal === 0) continue
      const proRatedSub = roundToTwo(sub.budgetMonthly * insights.totalMonths)
      const subVariance = sub.budgetMonthly > 0 || sub.actualTotal > 0 ? sub.variance : ''
      const subPct = sub.budgetMonthly > 0 ? sub.variancePercent / 100 : ''
      const isAlt = altRow++ % 2 === 1

      const subRow = sheet.addRow([
        '',
        sub.subcategoryName,
        sub.budgetMonthly || '',
        proRatedSub || '',
        sub.actualTotal || '',
        subVariance,
        subPct,
        sub.budgetMonthly > 0 ? getStatusText(sub.variancePercent) : '',
      ])

      subRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
        if (colNum !== 8) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isAlt ? ROW_ALT : WHITE } }
        }
        if (colNum >= 3) {
          switch (colNum) {
            case 6:
              cell.numFmt = currencyFormat()
              cell.alignment = { horizontal: 'right' }
              if (typeof cell.value === 'number') {
                cell.font = { color: { argb: cell.value < 0 ? RED_VARIANCE : GREEN_VARIANCE } }
              }
              break
            case 7:
              if (typeof cell.value === 'number') {
                cell.numFmt = '0%'
                cell.alignment = { horizontal: 'right' }
              }
              break
            case 8:
              if (cell.value) applyStatusStyle(cell, sub.variancePercent)
              break
            default:
              if (typeof cell.value === 'number') {
                cell.numFmt = currencyFormat()
                cell.alignment = { horizontal: 'right' }
              }
          }
        }
      })
      subRow.height = 18
      rowNum++
    }
  }

  // Grand total row
  const proRatedTotal = roundToTwo(insights.totalBudgetMonthly * insights.totalMonths)
  const totalVariance = roundToTwo(proRatedTotal - insights.totalActual)
  const totalPercent = proRatedTotal > 0 ? roundToTwo((insights.totalActual / proRatedTotal) * 100) : 0

  sheet.addRow([]) // blank before total
  rowNum++

  const totalRow = sheet.addRow([
    'TOTAL', '',
    insights.totalBudgetMonthly || '',
    proRatedTotal || '',
    insights.totalActual || '',
    totalVariance,
    proRatedTotal > 0 ? totalPercent / 100 : '',
    proRatedTotal > 0 ? getStatusText(totalPercent) : '',
  ])
  totalRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
    if (colNum !== 8) cell.font = { bold: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } }
    if (colNum >= 3) {
      switch (colNum) {
        case 6:
          cell.numFmt = currencyFormat()
          cell.alignment = { horizontal: 'right' }
          if (typeof cell.value === 'number') {
            cell.font = { bold: true, color: { argb: cell.value < 0 ? RED_VARIANCE : GREEN_VARIANCE } }
          }
          break
        case 7:
          if (typeof cell.value === 'number') {
            cell.numFmt = '0%'
            cell.alignment = { horizontal: 'right' }
            cell.font = { bold: true }
          }
          break
        case 8:
          if (cell.value) applyStatusStyle(cell, totalPercent, true)
          break
        default:
          if (typeof cell.value === 'number') {
            cell.numFmt = currencyFormat()
            cell.alignment = { horizontal: 'right' }
            cell.font = { bold: true }
          }
      }
    }
  })
  totalRow.height = 22

  // Data bar on % Used column (G = col 7) for data rows
  const lastDataRow = rowNum - 1
  if (lastDataRow >= dataStartRow) {
    sheet.addConditionalFormatting({
      ref: `G${dataStartRow}:G${lastDataRow}`,
      rules: [
        {
          type: 'dataBar',
          priority: 1,
          minLength: 0,
          maxLength: 100,
          cfvo: [
            { type: 'num', value: 0 },
            { type: 'num', value: 1 },
          ],
          showValue: true,
          gradient: true,
        } as ExcelJS.DataBarRuleType,
      ],
    })
  }

  // Unassigned expenses note
  if (insights.unassignedCount > 0) {
    sheet.addRow([])
    const noteRow = sheet.addRow([
      `ℹ  ${insights.unassignedCount} unassigned expense${insights.unassignedCount > 1 ? 's' : ''} totalling $${insights.unassignedTotal.toFixed(2)} are excluded from the table above.`,
    ])
    sheet.mergeCells(noteRow.number, 1, noteRow.number, COLS)
    noteRow.getCell(1).font = { italic: true, color: { argb: 'FF1D4ED8' } }
    noteRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } }
    noteRow.height = 18
  }

  // Key Insights section
  sheet.addRow([])
  const insightHeader = sheet.addRow(['Key Insights'])
  sheet.mergeCells(insightHeader.number, 1, insightHeader.number, COLS)
  insightHeader.getCell(1).font = { bold: true, size: 12 }
  insightHeader.height = 22

  const sentenceFills: Record<string, string> = {
    overspend: 'FFFEE2E2',
    underspend: 'FFD1FAE5',
    info: 'FFEFF6FF',
    positive: 'FFD1FAE5',
  }
  const sentenceIcons: Record<string, string> = {
    overspend: '⚠  ',
    underspend: '✓  ',
    info: 'ℹ  ',
    positive: '✓  ',
  }

  for (const sentence of generateInsightSentences(insights)) {
    const sRow = sheet.addRow([`${sentenceIcons[sentence.type]}${sentence.text}`])
    sheet.mergeCells(sRow.number, 1, sRow.number, COLS)
    sRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: sentenceFills[sentence.type] } }
    sRow.getCell(1).alignment = { wrapText: true }
    sRow.height = 28
  }

  addRestoreURL(sheet, restoreURL, COLS)
  setColumnWidths(sheet, [22, 26, 14, 14, 14, 14, 10, 10])
}

// ─── Sheet 5: Monthly Breakdown ───────────────────────────────────────────────

function buildMonthlyBreakdownSheet(
  wb: ExcelJS.Workbook,
  insights: InsightsData
): void {
  if (!insights.hasDates || insights.months.length < 2) return

  const sheet = wb.addWorksheet('Monthly Breakdown')
  const COLS = 6

  // Title
  const titleRow = sheet.addRow(['Monthly Breakdown'])
  sheet.mergeCells(1, 1, 1, COLS)
  titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } }
  titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE_DARK } }
  titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' }
  titleRow.height = 30

  sheet.addRow([]) // blank

  // Headers
  const headerRow = sheet.addRow(['Month', 'Budget', 'Actual', 'Variance', '% Used', 'Status'])
  headerRow.eachCell(cell => applyHeaderStyle(cell))
  headerRow.getCell(2).alignment = { horizontal: 'right' }
  headerRow.getCell(3).alignment = { horizontal: 'right' }
  headerRow.getCell(4).alignment = { horizontal: 'right' }
  headerRow.getCell(5).alignment = { horizontal: 'right' }
  headerRow.height = 22

  const dataStartRow = 4
  let rowNum = dataStartRow
  let altRow = 0

  for (const mk of insights.months) {
    const key = `${mk.year}-${String(mk.month + 1).padStart(2, '0')}`
    const monthBudget = insights.totalBudgetMonthly
    const monthActual = roundToTwo(
      insights.categories.reduce((sum, cat) => sum + (cat.actualByMonth.get(key) ?? 0), 0)
    )
    const monthVariance = roundToTwo(monthBudget - monthActual)
    const monthPercent = monthBudget > 0 ? roundToTwo((monthActual / monthBudget) * 100) : 0
    const isAlt = altRow++ % 2 === 1

    const row = sheet.addRow([
      formatMonthLabel(mk.year, mk.month),
      monthBudget || '',
      monthActual || '',
      monthBudget > 0 || monthActual > 0 ? monthVariance : '',
      monthBudget > 0 ? monthPercent / 100 : '',
      monthBudget > 0 ? getStatusText(monthPercent) : '',
    ])

    row.eachCell({ includeEmpty: true }, (cell, colNum) => {
      if (colNum !== 6) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isAlt ? ROW_ALT : WHITE } }
      }
      switch (colNum) {
        case 1:
          cell.font = { bold: true }
          break
        case 2:
        case 3:
          if (typeof cell.value === 'number') {
            cell.numFmt = currencyFormat()
            cell.alignment = { horizontal: 'right' }
          }
          break
        case 4:
          if (typeof cell.value === 'number') {
            cell.numFmt = currencyFormat()
            cell.alignment = { horizontal: 'right' }
            cell.font = { color: { argb: cell.value < 0 ? RED_VARIANCE : GREEN_VARIANCE } }
          }
          break
        case 5:
          if (typeof cell.value === 'number') {
            cell.numFmt = '0%'
            cell.alignment = { horizontal: 'right' }
          }
          break
        case 6:
          if (cell.value) applyStatusStyle(cell, monthPercent)
          break
      }
    })
    row.height = 18
    rowNum++
  }

  // Totals row
  const totalActual = roundToTwo(insights.totalActual)
  const totalBudget = roundToTwo(insights.totalBudgetMonthly * insights.months.length)
  const totalVariance = roundToTwo(totalBudget - totalActual)
  const totalPercent = totalBudget > 0 ? roundToTwo((totalActual / totalBudget) * 100) : 0

  sheet.addRow([]) // spacer
  const totalRow = sheet.addRow([
    'TOTAL',
    totalBudget || '',
    totalActual || '',
    totalVariance,
    totalBudget > 0 ? totalPercent / 100 : '',
    totalBudget > 0 ? getStatusText(totalPercent) : '',
  ])
  totalRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
    if (colNum !== 6) cell.font = { bold: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } }
    switch (colNum) {
      case 2:
      case 3:
        if (typeof cell.value === 'number') {
          cell.numFmt = currencyFormat()
          cell.alignment = { horizontal: 'right' }
          cell.font = { bold: true }
        }
        break
      case 4:
        if (typeof cell.value === 'number') {
          cell.numFmt = currencyFormat()
          cell.alignment = { horizontal: 'right' }
          cell.font = { bold: true, color: { argb: cell.value < 0 ? RED_VARIANCE : GREEN_VARIANCE } }
        }
        break
      case 5:
        if (typeof cell.value === 'number') {
          cell.numFmt = '0%'
          cell.alignment = { horizontal: 'right' }
          cell.font = { bold: true }
        }
        break
      case 6:
        if (cell.value) applyStatusStyle(cell, totalPercent, true)
        break
    }
  })
  totalRow.height = 22

  // Data bar on % Used column (E = col 5)
  const lastDataRow = rowNum - 1
  if (lastDataRow >= dataStartRow) {
    sheet.addConditionalFormatting({
      ref: `E${dataStartRow}:E${lastDataRow}`,
      rules: [
        {
          type: 'dataBar',
          priority: 1,
          minLength: 0,
          maxLength: 100,
          cfvo: [
            { type: 'num', value: 0 },
            { type: 'num', value: 1 },
          ],
          showValue: true,
          gradient: true,
        } as ExcelJS.DataBarRuleType,
      ],
    })
  }

  setColumnWidths(sheet, [14, 14, 14, 14, 10, 10])
}

// ─── Restore URL helper ───────────────────────────────────────────────────────

function addRestoreURL(sheet: ExcelJS.Worksheet, restoreURL: string, cols: number) {
  sheet.addRow([])
  sheet.addRow([])
  const urlRow = sheet.addRow(['Restore URL:', restoreURL])
  urlRow.getCell(1).font = { bold: true }
  urlRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW_LIGHT } }
  const urlCell = urlRow.getCell(2)
  urlCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW_LIGHT } }
  urlCell.alignment = { wrapText: true }
  urlCell.font = { color: { argb: 'FF1D4ED8' } }
  if (cols > 2) {
    sheet.mergeCells(urlRow.number, 2, urlRow.number, cols)
  }
  sheet.getRow(urlRow.number).height = 40
}

// ─── Date range resolution ────────────────────────────────────────────────────

function resolveInsightsDateRange(state: AppState): { start: Date; end: Date } | undefined {
  if (state.insightsDateOverride) {
    const start = new Date(state.insightsDateOverride.start)
    const end = new Date(state.insightsDateOverride.end)
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
      return { start, end }
    }
  }
  const parsedDates = extractExpenseDates(state.expenseRows, state.columnConfigs)
  if (parsedDates) {
    return getDateRange(parsedDates) ?? undefined
  }
  return undefined
}

// ─── Main export function ─────────────────────────────────────────────────────

export async function exportToExcel(state: AppState): Promise<void> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Budget Tracker'
  wb.created = new Date()

  const activeList = state.categoryLists.find(l => l.id === state.activeCategoryListId) ?? null
  const persisted = appStateToPersistedState(state)
  const restoreURL = buildShareURL(persisted)

  const dateRange = resolveInsightsDateRange(state)
  const insights = computeInsights(state, dateRange)

  buildCategoriesSheet(wb, activeList, state.budgetEntries)
  buildRawExpensesSheet(wb, state)
  buildFormattedExpensesSheet(wb, state)
  buildBudgetVsActualSheet(wb, state, insights, restoreURL)
  if (insights) buildMonthlyBreakdownSheet(wb, insights)

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `budget-tracker-${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
