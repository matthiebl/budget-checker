import { useRef, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAppContext } from '../../store/AppContext'
import { getActiveList, countAllItems } from '../../utils/categoryHelpers'
import { CategoryNode, type CategoryNodeProps } from './CategoryNode'
import type { Category } from '../../types'

function nanoid(): string {
  return Math.random().toString(36).slice(2, 10)
}

// ─── Sortable category wrapper ────────────────────────────────────────────────

function SortableCategoryNode(
  props: Omit<CategoryNodeProps, 'dragHandleProps' | 'dragRef' | 'dragStyle' | 'isDragging'>
) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.category.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <CategoryNode
      {...props}
      dragRef={setNodeRef}
      dragStyle={style}
      dragHandleProps={{ ...attributes, ...listeners }}
      isDragging={isDragging}
    />
  )
}

// ─── New category input (always visible) ─────────────────────────────────────

interface NewCategoryInputProps {
  inputRef: React.RefObject<HTMLInputElement | null>
  atLimit: boolean
}

function NewCategoryInput({ inputRef, atLimit }: NewCategoryInputProps) {
  const { dispatch } = useAppContext()

  function commit(input: HTMLInputElement) {
    const trimmed = input.value.trim()
    if (!trimmed || atLimit) { input.value = ''; return }
    dispatch({ type: 'ADD_CATEGORY', payload: { id: nanoid(), name: trimmed } })
    input.value = ''
    // Keep focus so user can type another category immediately
    input.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit(e.currentTarget)
    }
    if (e.key === 'Escape') {
      e.currentTarget.value = ''
      e.currentTarget.blur()
    }
  }

  if (atLimit) {
    return (
      <p className="mt-2 text-xs text-amber-600 px-1">
        Maximum of 100 items reached for this list.
      </p>
    )
  }

  return (
    <div className="mt-1.5 rounded-lg border border-dashed border-gray-200 bg-white">
      <div className="flex items-center gap-1 py-1.5 px-2">
        <span className="text-gray-200 text-base leading-none px-0.5 select-none">⠿</span>
        <input
          ref={inputRef}
          type="text"
          onKeyDown={handleKeyDown}
          onBlur={e => commit(e.currentTarget)}
          placeholder="Add category…"
          className="flex-1 min-w-0 text-sm font-semibold text-gray-700 bg-transparent border border-transparent rounded px-1.5 py-0.5 placeholder-gray-300 hover:border-gray-200 focus:border-blue-400 focus:outline-none focus:bg-white transition-colors"
        />
      </div>
    </div>
  )
}

// ─── Category Tree ────────────────────────────────────────────────────────────

export function CategoryTree() {
  const { state, dispatch } = useAppContext()
  const activeList = getActiveList(state)
  const newCategoryInputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleCategoryDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || !activeList || active.id === over.id) return
      const oldIndex = activeList.categories.findIndex(c => c.id === active.id)
      const newIndex = activeList.categories.findIndex(c => c.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      const newOrder = arrayMove(activeList.categories, oldIndex, newIndex).map(
        (c: Category) => c.id
      )
      dispatch({ type: 'REORDER_CATEGORIES', payload: { ids: newOrder } })
    },
    [activeList, dispatch]
  )

  if (!activeList) {
    return (
      <div className="text-sm text-gray-400 italic py-4 text-center">
        Select or create a category list above.
      </div>
    )
  }

  const totalItems = countAllItems(activeList)
  const atLimit = totalItems >= 100

  return (
    <div>
      {activeList.categories.length === 0 && (
        <p className="text-sm text-gray-400 italic mb-2">
          No categories yet — type one in the field below.
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleCategoryDragEnd}
      >
        <SortableContext
          items={activeList.categories.map(c => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {activeList.categories.map(category => (
            <SortableCategoryNode
              key={category.id}
              category={category}
              totalItemCount={totalItems}
            />
          ))}
        </SortableContext>
      </DndContext>

      <NewCategoryInput inputRef={newCategoryInputRef} atLimit={atLimit} />
    </div>
  )
}
