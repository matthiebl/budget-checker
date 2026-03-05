import { CategoryListSelector } from './CategoryListSelector'
import { CategoryTree } from './CategoryTree'

export function CategoriesTab() {
  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Category Lists</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Create up to 5 named category lists. Each list can contain up to 100 total items.
          Double-click a list name to rename it.
        </p>
      </div>

      <CategoryListSelector />

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Categories &amp; Subcategories
        </h3>
        <CategoryTree />
      </div>
    </div>
  )
}
