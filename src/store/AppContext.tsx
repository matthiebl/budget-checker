import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  type ReactNode,
  type Dispatch,
} from 'react'
import { reducer, type Action } from './reducer'
import { createInitialState } from './initialState'
import { saveState, loadState } from '../utils/storageHelpers'
import { decodeState } from '../utils/urlEncoding'
import type { AppState } from '../types'

interface AppContextValue {
  state: AppState
  dispatch: Dispatch<Action>
}

const AppContext = createContext<AppContextValue | null>(null)

function bootstrapState(): AppState {
  // 1. URL hash takes priority
  const hash = window.location.hash
  if (hash.startsWith('#data=')) {
    const decoded = decodeState(hash)
    if (decoded) {
      history.replaceState({}, '', window.location.pathname)
      return { ...decoded, selectedRowIds: new Set() }
    }
  }
  // 2. localStorage fallback
  const stored = loadState()
  if (stored) {
    return { ...stored, selectedRowIds: new Set() }
  }
  // 3. Blank state
  return createInitialState()
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, bootstrapState)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveState(state)
    }, 300)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [state])

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used within AppProvider')
  return ctx
}
