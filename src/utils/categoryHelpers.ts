import type { AppState, CategoryList, Subcategory, DropdownOption } from '../types'

export function getActiveList(state: AppState): CategoryList | null {
  return state.categoryLists.find(l => l.id === state.activeCategoryListId) ?? null
}

export function getAllSubcategories(list: CategoryList): Subcategory[] {
  return list.categories.flatMap(c => c.children)
}

export function countAllItems(list: CategoryList): number {
  return list.categories.reduce((sum, c) => sum + 1 + c.children.length, 0)
}

export function findSubcategoryById(
  list: CategoryList,
  subcategoryId: string
): Subcategory | undefined {
  return list.categories.flatMap(c => c.children).find(s => s.id === subcategoryId)
}

export function findCategoryForSubcategory(
  list: CategoryList,
  subcategoryId: string
) {
  return list.categories.find(c => c.children.some(s => s.id === subcategoryId))
}

export function buildDropdownOptions(
  list: CategoryList | null,
  topSubcategoryIds: string[],
  searchQuery: string
): DropdownOption[] {
  if (!list) return []

  const options: DropdownOption[] = []
  const query = searchQuery.toLowerCase().trim()

  // Top picks section (only when not searching)
  if (!query && topSubcategoryIds.length > 0) {
    options.push({ type: 'category-header', label: 'Top Picks', selectable: false })
    for (const id of topSubcategoryIds) {
      const sub = findSubcategoryById(list, id)
      if (sub) {
        options.push({ type: 'top-suggestion', id: sub.id, label: sub.name, selectable: true })
      }
    }
  }

  // All categories and subcategories
  for (const category of list.categories) {
    if (query) {
      // Filter: show subcategories matching query, or all if category name matches
      const categoryMatches = category.name.toLowerCase().includes(query)
      const matchingChildren = categoryMatches
        ? category.children
        : category.children.filter(s => s.name.toLowerCase().includes(query))

      if (matchingChildren.length === 0) continue

      options.push({ type: 'category-header', label: category.name, selectable: false })
      for (const sub of matchingChildren) {
        options.push({ type: 'subcategory', id: sub.id, label: sub.name, selectable: true })
      }
    } else {
      options.push({ type: 'category-header', label: category.name, selectable: false })
      for (const sub of category.children) {
        options.push({ type: 'subcategory', id: sub.id, label: sub.name, selectable: true })
      }
    }
  }

  // None option
  options.push({ type: 'none', label: '(None)', selectable: true })

  return options
}
