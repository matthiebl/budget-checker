import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useCallback, useRef } from 'react'
import { useAppContext } from '../../store/AppContext'
import type { Category, Subcategory } from '../../types'

function nanoid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function DragHandle(props: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...props}
      className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing select-none px-0.5 touch-none text-base leading-none"
      title="Drag to reorder"
    >
      ⠿
    </span>
  )
}

// ─── Subcategory row (sortable) ───────────────────────────────────────────────

interface SortableSubcategoryRowProps {
  subcategory: Subcategory
  categoryId: string
  onEnter: () => void
}

function SortableSubcategoryRow({
  subcategory,
  categoryId,
  onEnter,
}: SortableSubcategoryRowProps) {
  const { dispatch } = useAppContext()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subcategory.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  function handleRename(e: React.FocusEvent<HTMLInputElement>) {
    const trimmed = e.target.value.trim()
    if (trimmed && trimmed !== subcategory.name) {
      dispatch({
        type: 'RENAME_SUBCATEGORY',
        payload: { categoryId, subcategoryId: subcategory.id, name: trimmed },
      })
    } else {
      e.target.value = subcategory.name
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const trimmed = e.currentTarget.value.trim()
      if (trimmed && trimmed !== subcategory.name) {
        dispatch({
          type: 'RENAME_SUBCATEGORY',
          payload: { categoryId, subcategoryId: subcategory.id, name: trimmed },
        })
      }
      onEnter()
    }
    if (e.key === 'Escape') {
      e.currentTarget.value = subcategory.name
      e.currentTarget.blur()
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-1 py-0.5 pl-4 pr-2 group"
    >
      <DragHandle {...attributes} {...listeners} />
      <span className="text-gray-300 text-sm select-none">└</span>
      <input
        defaultValue={subcategory.name}
        onBlur={handleRename}
        onKeyDown={handleKeyDown}
        className="flex-1 min-w-0 text-sm px-1.5 py-0.5 text-gray-700 bg-transparent border border-transparent rounded hover:border-gray-200 focus:border-blue-400 focus:outline-none focus:bg-white transition-colors"
      />
      <button
        onClick={() =>
          dispatch({
            type: 'REMOVE_SUBCATEGORY',
            payload: { categoryId, subcategoryId: subcategory.id },
          })
        }
        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 text-sm transition-all shrink-0 w-5 text-center"
        title="Remove subcategory"
      >
        ✕
      </button>
    </div>
  )
}

// ─── New subcategory input (always visible) ───────────────────────────────────

interface NewSubcategoryInputProps {
  categoryId: string
  inputRef: React.RefObject<HTMLInputElement | null>
  atLimit: boolean
}

function NewSubcategoryInput({
  categoryId,
  inputRef,
  atLimit,
}: NewSubcategoryInputProps) {
  const { dispatch } = useAppContext()

  function commit(input: HTMLInputElement) {
    const trimmed = input.value.trim()
    if (!trimmed || atLimit) {
      input.value = ''
      return
    }
    dispatch({
      type: 'ADD_SUBCATEGORY',
      payload: { id: nanoid(), categoryId, name: trimmed },
    })
    input.value = ''
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

  if (atLimit) return null

  return (
    <div className="flex items-center gap-1 py-0.5 pl-4 pr-2">
      <span className="text-gray-200 text-base leading-none px-0.5">⠿</span>
      <span className="text-gray-200 text-sm select-none">└</span>
      <input
        ref={inputRef}
        type="text"
        onKeyDown={handleKeyDown}
        onBlur={e => commit(e.currentTarget)}
        placeholder="Add subcategory…"
        className="flex-1 min-w-0 text-sm px-1.5 py-0.5 text-gray-700 bg-transparent border border-transparent rounded placeholder-gray-300 hover:border-gray-200 focus:border-blue-400 focus:outline-none focus:bg-white transition-colors"
      />
    </div>
  )
}

// ─── Category Node (exported) ─────────────────────────────────────────────────

export interface CategoryNodeProps {
  category: Category
  totalItemCount: number
  dragHandleProps?: React.HTMLAttributes<HTMLSpanElement>
  dragRef?: (node: HTMLElement | null) => void
  dragStyle?: React.CSSProperties
  isDragging?: boolean
}

export function CategoryNode({
  category,
  totalItemCount,
  dragHandleProps,
  dragRef,
  dragStyle,
  isDragging,
}: CategoryNodeProps) {
  const { dispatch } = useAppContext()
  const newSubInputRef = useRef<HTMLInputElement>(null)
  const atLimit = totalItemCount >= 100

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  const handleSubDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = category.children.findIndex(s => s.id === active.id)
      const newIndex = category.children.findIndex(s => s.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      const newOrder = arrayMove(category.children, oldIndex, newIndex).map(
        s => s.id,
      )
      dispatch({
        type: 'REORDER_SUBCATEGORIES',
        payload: { categoryId: category.id, ids: newOrder },
      })
    },
    [category.children, category.id, dispatch],
  )

  function handleCategoryRename(e: React.FocusEvent<HTMLInputElement>) {
    const trimmed = e.target.value.trim()
    if (trimmed && trimmed !== category.name) {
      dispatch({
        type: 'RENAME_CATEGORY',
        payload: { categoryId: category.id, name: trimmed },
      })
    } else {
      e.target.value = category.name
    }
  }

  function handleCategoryKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.currentTarget.value = category.name
      e.currentTarget.blur()
    }
    // Enter is handled by CategoryTree via onEnter prop
  }

  return (
    <div
      ref={dragRef}
      style={dragStyle}
      className={[
        'mb-1.5 rounded-lg border transition-shadow',
        isDragging
          ? 'shadow-lg border-blue-300 bg-blue-50/20'
          : 'border-gray-150 bg-white',
      ].join(' ')}
    >
      {/* Category header */}
      <div className="flex items-center gap-1 py-1.5 px-2 group border-b border-gray-100">
        {dragHandleProps && <DragHandle {...dragHandleProps} />}
        <input
          defaultValue={category.name}
          onBlur={handleCategoryRename}
          onKeyDown={handleCategoryKeyDown}
          placeholder="Category name…"
          className="flex-1 min-w-0 text-sm font-semibold text-gray-800 bg-transparent border border-transparent rounded px-1.5 py-0.5 hover:border-gray-200 focus:border-blue-400 focus:outline-none focus:bg-white transition-colors"
        />
        <button
          onClick={() =>
            dispatch({
              type: 'REMOVE_CATEGORY',
              payload: { categoryId: category.id },
            })
          }
          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 text-sm transition-all shrink-0 w-5 text-center"
          title="Remove category"
        >
          ✕
        </button>
      </div>

      {/* Subcategories + new input */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleSubDragEnd}
      >
        <SortableContext
          items={category.children.map(s => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {category.children.map(sub => (
            <SortableSubcategoryRow
              key={sub.id}
              subcategory={sub}
              categoryId={category.id}
              onEnter={() => newSubInputRef.current?.focus()}
            />
          ))}
        </SortableContext>
      </DndContext>

      <NewSubcategoryInput
        categoryId={category.id}
        inputRef={newSubInputRef}
        atLimit={atLimit}
      />
    </div>
  )
}
