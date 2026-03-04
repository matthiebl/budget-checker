import { useState, useCallback } from 'react'
import type { KeyboardEvent } from 'react'

interface UseKeyboardNavOptions {
  itemCount: number
  onSelect: (index: number) => void
  onClose: () => void
  isOpen: boolean
}

interface UseKeyboardNavResult {
  focusedIndex: number
  setFocusedIndex: (index: number) => void
  handleKeyDown: (e: KeyboardEvent) => void
  resetFocus: () => void
}

export function useKeyboardNav({
  itemCount,
  onSelect,
  onClose,
  isOpen,
}: UseKeyboardNavOptions): UseKeyboardNavResult {
  const [focusedIndex, setFocusedIndex] = useState(0)

  const resetFocus = useCallback(() => setFocusedIndex(0), [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          // Signal to open — handled by parent
        }
        return
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setFocusedIndex(i => (i + 1) % itemCount)
          break
        case 'ArrowUp':
          e.preventDefault()
          setFocusedIndex(i => (i - 1 + itemCount) % itemCount)
          break
        case 'Enter':
          e.preventDefault()
          if (itemCount > 0) {
            onSelect(focusedIndex)
          }
          break
        case 'Escape':
        case 'Tab':
          e.preventDefault()
          onClose()
          break
      }
    },
    [isOpen, itemCount, focusedIndex, onSelect, onClose]
  )

  return { focusedIndex, setFocusedIndex, handleKeyDown, resetFocus }
}
