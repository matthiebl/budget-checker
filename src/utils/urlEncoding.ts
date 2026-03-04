import LZString from 'lz-string'
import type { PersistedState } from '../types'

const HASH_PREFIX = '#data='

export function encodeState(state: PersistedState): string {
  const json = JSON.stringify(state)
  const compressed = LZString.compressToEncodedURIComponent(json)
  return HASH_PREFIX + compressed
}

export function decodeState(hash: string): PersistedState | null {
  if (!hash.startsWith(HASH_PREFIX)) return null
  const encoded = hash.slice(HASH_PREFIX.length)
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded)
    if (!json) return null
    const parsed = JSON.parse(json)
    // Basic validation
    if (
      !Array.isArray(parsed.categoryLists) ||
      !Array.isArray(parsed.budgetEntries) ||
      !Array.isArray(parsed.expenseRows)
    ) {
      return null
    }
    return parsed as PersistedState
  } catch (e) {
    console.warn('Failed to decode state from URL:', e)
    return null
  }
}

export function buildShareURL(state: PersistedState): string {
  const hash = encodeState(state)
  return window.location.origin + window.location.pathname + hash
}
