import { useState } from 'react'
import { useAppContext } from '../../store/AppContext'
import { buildShareURL } from '../../utils/urlEncoding'
import { appStateToPersistedState } from '../../utils/storageHelpers'

interface HeaderProps {
  onExport: () => void
  exporting: boolean
}

export function Header({ onExport, exporting }: HeaderProps) {
  const { state } = useAppContext()
  const [copied, setCopied] = useState(false)

  function handleCopyURL() {
    const persisted = appStateToPersistedState(state)
    const url = buildShareURL(persisted)
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <header className="bg-blue-700 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Budget Tracker</h1>
          <p className="text-blue-200 text-xs mt-0.5">Client-side budget planner</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopyURL}
            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 rounded border border-blue-500 transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy Share URL'}
          </button>
          <button
            onClick={onExport}
            disabled={exporting}
            className="px-3 py-1.5 text-sm bg-white text-blue-700 hover:bg-blue-50 rounded font-medium transition-colors disabled:opacity-50"
          >
            {exporting ? 'Exporting…' : 'Export to Excel'}
          </button>
        </div>
      </div>
    </header>
  )
}
