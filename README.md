# Budget Checker

A client-side personal budget tracker. Set up your category structure, enter budget amounts, import bank/credit card CSV exports, and compare actual spending against your budget — all in the browser with no account or server required.

**Live app:** https://matthiebl.github.io/budget-checker/

---

## Features

- **Categories** — Create named category lists with hierarchical categories and subcategories. Drag to reorder.
- **Budget** — Enter budget amounts for each subcategory in any period (weekly, fortnightly, monthly, yearly). All values stay in sync.
- **Expenses** — Import a CSV export from your bank or credit card. Map columns to roles (date, amount, description), then assign each transaction to a subcategory. Bulk-assign selected rows.
- **Insights** — Visual comparison of budget vs actual spend over a date range, with charts and auto-generated insights highlighting where you're over or under budget.
- **Export** — Download a formatted `.xlsx` workbook with budget breakdown, raw and formatted expenses, budget vs actual analysis, and a monthly breakdown.
- **Share / Restore** — Copy a shareable URL that encodes your full state (categories, budget, and expenses) into the hash. The same URL restores everything when opened.

---

## Usage

### 1. Categories tab

1. Click **+ New List** to create a category list (up to 5 lists, 100 items each).
2. Click a list to make it active. Double-click its name to rename it.
3. Type a category name in the bottom input and press **Enter** to add it.
4. Under each category, type subcategory names and press **Enter**. Subcategories are what budget entries and expense assignments are attached to.
5. Drag the `⠿` handle to reorder categories or subcategories.

### 2. Budget tab

1. Select a category list — your categories and subcategories appear as a table.
2. Type an amount in any period column (Weekly / Fortnightly / Monthly / Yearly). The other columns update automatically using a 365-day year.
3. Use the period selector (top right) to change which column is shown prominently.

### 3. Expenses tab

1. Click **Import CSV** and select a CSV file exported from your bank or card provider.
2. In the column configurator, set the role for each column:
   - **Date** — the transaction date (set the date format, e.g. `DD/MM/YYYY`)
   - **Amount** — the transaction amount (tick *Negate* if your bank exports debits as positive numbers)
   - **Description** — free-text description shown in the table
   - **Omit** — hide this column entirely
3. Each row gets a category dropdown. Type to search, use arrow keys to navigate, Enter to select.
4. Check rows and use the **Bulk Assign** bar to assign many rows at once.
5. Tick the **Omit** checkbox on a row to exclude it from analysis (e.g. transfers, refunds).

### 4. Insights tab

1. A date range is auto-detected from your expense dates. Adjust start/end if needed.
2. The **Budget vs Actual** table shows each subcategory's monthly budget, pro-rated budget for the selected period, actual spend, variance, and status (Under / Near / Over).
3. **Monthly Spend** chart — bar chart of actual vs budget per month. Use the dropdown to filter by category.
4. **Spending by Category** donut chart — toggle between actual and budget view.
5. **Spending Trend** chart — cumulative actual vs cumulative budget over time (shown when 3+ months of data).
6. **Key Insights** — auto-generated sentences calling out top overspends, underspends, and unassigned transactions.

### Export to Excel

Click the **Export** button (available when a category list is active) to download a `.xlsx` file containing:

- **Categories & Budget** — full budget table with SUM formulas
- **Raw Expenses** — unmodified CSV data
- **Formatted Expenses** — visible columns with category assignments
- **Budget vs Actual** — full insights table with colour-coded status and key insights
- **Monthly Breakdown** — month-by-month budget vs actual totals (when date data is available)

### Sharing & restoring state

Click **Share** in the header to copy a URL. The entire app state (categories, budget, expense assignments, and column config) is compressed into the URL hash. Opening the link in any browser restores your session exactly. The raw CSV data is included only if it's under ~100 KB.

---

## Privacy

Everything runs in your browser. No data is sent to any server. Your state is saved to `localStorage` automatically and persists between sessions.

---

## Tech stack

- React 19 + TypeScript
- Tailwind CSS v4
- Vite
- [Recharts](https://recharts.org) — charts
- [ExcelJS](https://github.com/exceljs/exceljs) — Excel export
- [PapaParse](https://www.papaparse.com) — CSV parsing
- [lz-string](https://github.com/pieroxy/lz-string) — URL state compression
- [@dnd-kit](https://dndkit.com) — drag and drop

## Development

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```
