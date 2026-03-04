import ExcelJS from 'exceljs'
import type { AppState, Period, CategoryList, BudgetEntry } from '../types'
import {
  displayAmount,
  getCategoryWeeklyTotal,
} from './budgetCalculations'
import { findSubcategoryById, findCategoryForSubcategory } from './categoryHelpers'
import { appStateToPersistedState } from './storageHelpers'
import { buildShareURL } from './urlEncoding'

const PERIODS: Period[] = ['week', 'fortnight', 'month', 'year']
const PERIOD_LABELS = { week: 'Weekly', fortnight: 'Fortnightly', month: 'Monthly', year: 'Yearly' }

// ─── Colour constants ─────────────────────────────────────────────────────────
const BLUE_DARK = 'FF1E40AF'
const BLUE_LIGHT = 'FFDBEAFE'
const ROW_ALT = 'FFF8FAFC'
const YELLOW_LIGHT = 'FFFEFCE8'
const WHITE = 'FFFFFFFF'

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

    // Style category row
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

  // Headers
  const headerRow = sheet.addRow(state.parsedCSV.rawHeaders)
  headerRow.eachCell(cell => applyHeaderStyle(cell))
  headerRow.height = 22

  // Data rows
  state.parsedCSV.rows.forEach((rawRow, i) => {
    const row = sheet.addRow(rawRow)
    const isAlt = i % 2 === 1
    row.eachCell({ includeEmpty: true }, cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isAlt ? ROW_ALT : WHITE } }
    })
    row.height = 16
  })

  // Auto-size columns (approximate)
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
      // Format amount cells
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

  // Auto-size
  headers.forEach((h, i) => {
    const col = sheet.getColumn(i + 1)
    col.width = Math.min(40, Math.max(10, h.length * 1.2))
  })
}

// ─── Sheet 4: Summary ─────────────────────────────────────────────────────────

function buildSummarySheet(
  wb: ExcelJS.Workbook,
  state: AppState,
  restoreURL: string
): void {
  const sheet = wb.addWorksheet('Summary')
  const activeList = state.categoryLists.find(l => l.id === state.activeCategoryListId) ?? null

  // Title
  const titleRow = sheet.addRow(['Budget vs Actual Summary'])
  sheet.mergeCells('A1:F1')
  titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } }
  titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE_DARK } }
  titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' }
  titleRow.height = 30

  sheet.addRow([]) // blank

  // Headers
  const headerRow = sheet.addRow(['Category', 'Subcategory', 'Budget (Monthly)', 'Actual Spend', 'Variance', '% Used'])
  headerRow.eachCell(cell => applyHeaderStyle(cell))
  headerRow.height = 22

  const dataStartRow = 4

  if (!activeList) {
    sheet.addRow(['No category list selected'])
  } else {
    // Compute actual spend per subcategory
    const amountConfig = state.columnConfigs.find(c => c.role === 'amount')
    const actualSpend = new Map<string, number>()
    if (amountConfig) {
      state.expenseRows
        .filter(r => !r.omit && r.categoryId)
        .forEach(r => {
          const rawVal = r.raw[amountConfig.originalIndex] ?? ''
          const num = parseFloat(rawVal.replace(/[$,]/g, ''))
          if (!isNaN(num)) {
            const amount = amountConfig.negateAmount ? -num : num
            const current = actualSpend.get(r.categoryId!) ?? 0
            actualSpend.set(r.categoryId!, current + Math.abs(amount))
          }
        })
    }

    let rowNum = dataStartRow
    let altRow = 0

    for (const category of activeList.categories) {
      // Category summary row
      const catWeekly = getCategoryWeeklyTotal(category.id, activeList, state.budgetEntries)
      const catMonthly = catWeekly > 0 ? displayAmount(catWeekly, 'month') : 0
      const catActual = category.children.reduce((sum, s) => sum + (actualSpend.get(s.id) ?? 0), 0)

      const catRow = sheet.addRow([
        category.name, '',
        catMonthly || '',
        catActual || '',
        catMonthly > 0 || catActual > 0 ? { formula: `C${rowNum}-D${rowNum}`, result: catMonthly - catActual } : '',
        catMonthly > 0 ? { formula: `D${rowNum}/C${rowNum}`, result: catMonthly > 0 ? catActual / catMonthly : 0 } : '',
      ])
      catRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.font = { bold: true }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE_LIGHT } }
        if (colNum >= 3) {
          if (colNum === 6) {
            cell.numFmt = '0%'
          } else if (typeof cell.value === 'number' || (cell.value as ExcelJS.CellFormulaValue)?.formula) {
            cell.numFmt = currencyFormat()
          }
          cell.alignment = { horizontal: 'right' }
        }
      })
      catRow.height = 20
      rowNum++

      for (const sub of category.children) {
        const entry = state.budgetEntries.find(e => e.subcategoryId === sub.id)
        const monthly = entry ? displayAmount(entry.weeklyAmount, 'month') : 0
        const actual = actualSpend.get(sub.id) ?? 0
        const isAlt = altRow++ % 2 === 1

        const subRow = sheet.addRow([
          '',
          sub.name,
          monthly || '',
          actual || '',
          monthly > 0 || actual > 0 ? { formula: `C${rowNum}-D${rowNum}`, result: monthly - actual } : '',
          monthly > 0 ? { formula: `D${rowNum}/C${rowNum}`, result: monthly > 0 ? actual / monthly : 0 } : '',
        ])

        subRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isAlt ? ROW_ALT : WHITE } }
          if (colNum >= 3) {
            if (colNum === 6) {
              cell.numFmt = '0%'
            } else if (typeof cell.value === 'number' || (cell.value as ExcelJS.CellFormulaValue)?.formula) {
              cell.numFmt = currencyFormat()
            }
            cell.alignment = { horizontal: 'right' }
          }
        })
        subRow.height = 18
        rowNum++
      }
    }

    // Add conditional formatting (data bars) on % Used column (F)
    const lastDataRow = rowNum - 1
    if (lastDataRow >= dataStartRow) {
      sheet.addConditionalFormatting({
        ref: `F${dataStartRow}:F${lastDataRow}`,
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
  }

  // Blank spacer rows
  sheet.addRow([])
  sheet.addRow([])

  // Restore URL
  const urlLabelRow = sheet.addRow(['Restore URL:', restoreURL])
  urlLabelRow.getCell(1).font = { bold: true }
  urlLabelRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW_LIGHT } }
  const urlCell = urlLabelRow.getCell(2)
  urlCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW_LIGHT } }
  urlCell.alignment = { wrapText: true }
  urlCell.font = { color: { argb: 'FF1D4ED8' } }
  sheet.getRow(urlLabelRow.number).height = 40

  setColumnWidths(sheet, [20, 24, 16, 16, 14, 10])
  sheet.getColumn(2).width = 30 // wider for URL
}

// ─── Main export function ─────────────────────────────────────────────────────

export async function exportToExcel(state: AppState): Promise<void> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Budget Tracker'
  wb.created = new Date()

  const activeList = state.categoryLists.find(l => l.id === state.activeCategoryListId) ?? null
  const persisted = appStateToPersistedState(state)
  const restoreURL = buildShareURL(persisted)

  buildCategoriesSheet(wb, activeList, state.budgetEntries)
  buildRawExpensesSheet(wb, state)
  buildFormattedExpensesSheet(wb, state)
  buildSummarySheet(wb, state, restoreURL)

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
