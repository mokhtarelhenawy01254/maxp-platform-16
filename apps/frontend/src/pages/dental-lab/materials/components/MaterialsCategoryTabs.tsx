import { CATEGORY_LABELS, type MaterialsCategoryTabsProps } from "../types/materialsTypes";

export function MaterialsCategoryTabs({
  selectedCategory,
  onSelectCategory,
  materials,
}: MaterialsCategoryTabsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-gray-200 dark:border-gray-700">
      <button
        type="button"
        onClick={() => onSelectCategory("ALL")}
        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
          selectedCategory === "ALL"
            ? "bg-cyan-600 text-white shadow-sm"
            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
        }`}
      >
        الكل ({materials.length})
      </button>
      {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
        const count = materials.filter((m) => m.category === key).length;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelectCategory(key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === key
                ? "bg-cyan-600 text-white shadow-sm"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {label} ({count})
          </button>
        );
      })}
    </div>
  );
}

export default MaterialsCategoryTabs;
