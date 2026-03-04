import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { CategoryList, DropdownOption } from '../../types'
import { buildDropdownOptions, findSubcategoryById } from '../../utils/categoryHelpers'
import { useKeyboardNav } from '../../hooks/useKeyboardNav'

interface CategoryDropdownProps {
  value: string | null
  onChange: (id: string | null) => void
  categoryList: CategoryList | null
  topSubcategoryIds: string[]
  disabled?: boolean
}

interface DropdownPosition {
  top: number
  left: number
  width: number
  optionsMaxHeight: number
}

export function CategoryDropdown({
  value,
  onChange,
  categoryList,
  topSubcategoryIds,
  disabled,
}: CategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState<DropdownPosition>({ top: 0, left: 0, width: 200, optionsMaxHeight: 240 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const options = buildDropdownOptions(categoryList, topSubcategoryIds, search)
  const selectableOptions = options.filter(o => o.selectable)

  const currentLabel = value && categoryList
    ? findSubcategoryById(categoryList, value)?.name ?? 'Unknown'
    : 'Unassigned'

  function openDropdown() {
    if (disabled || !categoryList) return
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) {
      const SEARCH_HEIGHT = 52
      const MAX_OPTIONS = 240
      const MIN_OPTIONS = 80
      const GAP = 4

      const spaceBelow = window.innerHeight - rect.bottom - GAP
      const spaceAbove = rect.top - GAP

      let top: number
      let optionsMaxHeight: number

      if (spaceBelow >= MIN_OPTIONS + SEARCH_HEIGHT || spaceBelow >= spaceAbove) {
        // Open below
        top = rect.bottom + window.scrollY + GAP
        optionsMaxHeight = Math.max(MIN_OPTIONS, Math.min(MAX_OPTIONS, spaceBelow - SEARCH_HEIGHT))
      } else {
        // Flip above
        optionsMaxHeight = Math.max(MIN_OPTIONS, Math.min(MAX_OPTIONS, spaceAbove - SEARCH_HEIGHT))
        top = rect.top + window.scrollY - optionsMaxHeight - SEARCH_HEIGHT - GAP
      }

      const width = Math.max(220, rect.width)
      // Clamp horizontally so dropdown stays within the viewport
      let left = rect.left + window.scrollX
      left = Math.min(left, window.scrollX + window.innerWidth - width - GAP)
      left = Math.max(window.scrollX + GAP, left)

      setPosition({ top, left, width, optionsMaxHeight })
    }
    setIsOpen(true)
    setSearch('')
    setTimeout(() => searchRef.current?.focus(), 10)
  }

  function closeDropdown() {
    setIsOpen(false)
    setSearch('')
  }

  const handleSelect = useCallback(
    (selectableIndex: number) => {
      const option = selectableOptions[selectableIndex]
      if (!option) return
      onChange(option.type === 'none' ? null : option.id ?? null)
      closeDropdown()
    },
    [selectableOptions, onChange]
  )

  const { focusedIndex, setFocusedIndex, handleKeyDown, resetFocus } = useKeyboardNav({
    itemCount: selectableOptions.length,
    onSelect: handleSelect,
    onClose: closeDropdown,
    isOpen,
  })

  useEffect(() => {
    resetFocus()
  }, [search, resetFocus])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    function handleOutside(e: MouseEvent) {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        listRef.current?.contains(e.target as Node)
      ) return
      closeDropdown()
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [isOpen])

  // Close on scroll (but not when scrolling inside the dropdown itself).
  // Delayed attachment avoids mobile tap events that briefly fire a scroll.
  useEffect(() => {
    if (!isOpen) return
    let active = false
    const timer = setTimeout(() => { active = true }, 150)
    function handleScroll(e: Event) {
      if (!active) return
      if (listRef.current?.contains(e.target as Node)) return
      closeDropdown()
    }
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [isOpen])

  // Map flat option index → selectable index
  function getSelectableIndex(option: DropdownOption): number {
    return selectableOptions.indexOf(option)
  }

  return (
    <>
      <button
        ref={triggerRef}
        onClick={openDropdown}
        onKeyDown={e => {
          if (e.key === 'ArrowDown' && !isOpen) { e.preventDefault(); openDropdown() }
          else if (isOpen) handleKeyDown(e)
        }}
        disabled={disabled || !categoryList}
        className={[
          'w-full text-left text-sm px-2 py-1 rounded border transition-colors truncate',
          value
            ? 'border-blue-200 bg-blue-50 text-blue-800'
            : 'border-gray-200 text-gray-400 bg-white hover:border-gray-300',
          disabled || !categoryList ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
      >
        {currentLabel}
      </button>

      {isOpen && createPortal(
        <div
          ref={listRef}
          style={{
            position: 'absolute',
            top: position.top,
            left: position.left,
            width: position.width,
            zIndex: 9999,
          }}
          className="bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
        >
          {/* Search */}
          <div className="px-3 py-2 border-b border-gray-100">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search categories…"
              className="w-full text-sm px-2 py-1 border border-gray-200 rounded focus:border-blue-400 focus:outline-none"
            />
          </div>

          {/* Options */}
          <div style={{ maxHeight: position.optionsMaxHeight }} className="overflow-y-auto">
            {options.length === 0 && (
              <div className="px-3 py-3 text-sm text-gray-400 text-center">No matches</div>
            )}
            {options.map((option, i) => {
              if (!option.selectable) {
                return (
                  <div
                    key={`header-${i}`}
                    className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 sticky top-0"
                  >
                    {option.label}
                  </div>
                )
              }

              const selectableIdx = getSelectableIndex(option)
              const isFocused = selectableIdx === focusedIndex

              return (
                <button
                  key={`opt-${i}`}
                  onClick={() => handleSelect(selectableIdx)}
                  onMouseEnter={() => setFocusedIndex(selectableIdx)}
                  className={[
                    'w-full text-left px-4 py-1.5 text-sm transition-colors',
                    option.type === 'none' ? 'text-gray-400 italic' : 'text-gray-700',
                    option.type === 'top-suggestion' ? 'font-medium' : '',
                    isFocused ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50',
                  ].join(' ')}
                >
                  {option.type === 'top-suggestion' && (
                    <span className="text-amber-400 mr-1.5">★</span>
                  )}
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
