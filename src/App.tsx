import { useState } from 'react'
import { AppProvider, useAppContext } from './store/AppContext'
import { TabBar, type TabId } from './components/layout/TabBar'
import { Header } from './components/layout/Header'
import { CategoriesTab } from './components/categories/CategoriesTab'
import { BudgetTab } from './components/budget/BudgetTab'
import { ExpensesTab } from './components/expenses/ExpensesTab'
import { InsightsTab } from './components/insights/InsightsTab'
import { exportToExcel } from './utils/excelExport'

function AppContent() {
  const { state } = useAppContext()
  const [activeTab, setActiveTab] = useState<TabId>('categories')
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      await exportToExcel(state)
    } catch (e) {
      console.error('Export failed:', e)
      alert('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onExport={handleExport} exporting={exporting} />
      <TabBar activeTab={activeTab} onChange={setActiveTab} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {activeTab === 'categories' && <CategoriesTab />}
        {activeTab === 'budget' && <BudgetTab />}
        {activeTab === 'expenses' && <ExpensesTab />}
        {activeTab === 'insights' && <InsightsTab />}
      </main>
    </div>
  )
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}

export default App
