export type TabId = 'categories' | 'budget' | 'expenses'

interface TabBarProps {
  activeTab: TabId
  onChange: (tab: TabId) => void
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'categories', label: 'Categories' },
  { id: 'budget', label: 'Budget' },
  { id: 'expenses', label: 'Expenses' },
]

export function TabBar({ activeTab, onChange }: TabBarProps) {
  return (
    <div className="border-b border-gray-200 bg-white">
      <nav className="flex gap-0 max-w-7xl mx-auto px-4">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={[
              'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
