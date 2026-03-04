import { useState } from 'react'
import { useAppContext } from '../../store/AppContext'
import { countAllItems } from '../../utils/categoryHelpers'

function nanoid(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function CategoryListSelector() {
  const { state, dispatch } = useAppContext()
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  function handleCreate() {
    if (state.categoryLists.length >= 5) return
    const name = `List ${state.categoryLists.length + 1}`
    dispatch({ type: 'CREATE_CATEGORY_LIST', payload: { id: nanoid(), name } })
  }

  function startRename(id: string, current: string) {
    setRenamingId(id)
    setRenameValue(current)
  }

  function commitRename(id: string) {
    const trimmed = renameValue.trim()
    if (trimmed) {
      dispatch({ type: 'RENAME_CATEGORY_LIST', payload: { id, name: trimmed } })
    }
    setRenamingId(null)
  }

  function handleDelete(id: string) {
    dispatch({ type: 'DELETE_CATEGORY_LIST', payload: { id } })
    setConfirmDeleteId(null)
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 flex-wrap">
        {state.categoryLists.map(list => {
          const isActive = list.id === state.activeCategoryListId
          const itemCount = countAllItems(list)
          return (
            <div
              key={list.id}
              className={[
                'flex items-center gap-1 rounded-lg border px-2 py-1.5 transition-colors',
                isActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300',
              ].join(' ')}
            >
              {renamingId === list.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onBlur={() => commitRename(list.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitRename(list.id)
                    if (e.key === 'Escape') setRenamingId(null)
                  }}
                  className="text-sm font-medium w-28 px-1 border border-blue-400 rounded outline-none"
                />
              ) : (
                <button
                  onClick={() => dispatch({ type: 'SET_ACTIVE_CATEGORY_LIST', payload: { id: list.id } })}
                  onDoubleClick={() => startRename(list.id, list.name)}
                  className={[
                    'text-sm font-medium',
                    isActive ? 'text-blue-700' : 'text-gray-700',
                  ].join(' ')}
                  title="Double-click to rename"
                >
                  {list.name}
                  <span className={['ml-1.5 text-xs', isActive ? 'text-blue-400' : 'text-gray-400'].join(' ')}>
                    ({itemCount}/100)
                  </span>
                </button>
              )}
              {confirmDeleteId === list.id ? (
                <div className="flex items-center gap-1 ml-1">
                  <span className="text-xs text-red-600">Delete?</span>
                  <button
                    onClick={() => handleDelete(list.id)}
                    className="text-xs text-red-600 hover:text-red-800 font-medium"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(list.id)}
                  className="ml-1 text-gray-300 hover:text-red-400 text-xs transition-colors"
                  title="Delete list"
                >
                  ✕
                </button>
              )}
            </div>
          )
        })}

        {state.categoryLists.length < 5 && (
          <button
            onClick={handleCreate}
            className="px-3 py-1.5 text-sm text-blue-600 border border-dashed border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
          >
            + New List
          </button>
        )}
      </div>

      {state.categoryLists.length === 0 && (
        <p className="mt-3 text-sm text-gray-400 italic">
          Create a category list to get started.
        </p>
      )}
    </div>
  )
}
