import { decodeState } from '../utils/urlEncoding'
import type { PersistedState } from '../types'

export function useURLState(): PersistedState | null {
  const hash = window.location.hash
  if (!hash.startsWith('#data=')) return null

  const decoded = decodeState(hash)
  if (decoded) {
    // Clean URL after reading
    history.replaceState({}, '', window.location.pathname)
  }
  return decoded
}
