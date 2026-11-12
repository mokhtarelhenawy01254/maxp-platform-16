import React from 'react';
import type { Category } from '../../hooks/useCategories';

interface FiltersSidebarCategoriesProps {
  showCategories: boolean;
  shellClassName: string;
  headingClassName: string;
  categoryLabel: string;
  categoryStyle: 'list' | 'dropdown' | string;
  fieldPrefix: string;
  prefersArabicCopy: boolean;
  selectedCategoryId: string;
  allProductsLabel: string;
  categories: Category[];
  isLoading: boolean;
  isPcHub: boolean;
  isRoseBoutique: boolean;
  isDistrictMarket: boolean;
  isMarketplaceAvenue?: boolean;
  onCategorySelect: (id: string) => void;
}

export const FiltersSidebarCategories: React.FC<FiltersSidebarCategoriesProps> = ({
  showCategories,
  shellClassName,
  headingClassName,
  categoryLabel,
  categoryStyle,
  fieldPrefix,
  prefersArabicCopy,
  selectedCategoryId,
  allProductsLabel,
  categories,
  isLoading,
  isPcHub,
  isRoseBoutique,
  isDistrictMarket,
  isMarketplaceAvenue = false,
  onCategorySelect,
}) => {
  if (!showCategories) {
    return null;
  }

  return (
    <div className={shellClassName} data-testid="filters-sidebar-categories">
      <h3 className={`font-heading uppercase ${headingClassName}`}>{categoryLabel}</h3>
      {categoryStyle === 'dropdown' ? (
        <>
          <label htmlFor={`${fieldPrefix}-category`} className="sr-only">
            {prefersArabicCopy ? 'فلترة حسب الفئة' : 'Filter by category'}
          </label>
          <select
            id={`${fieldPrefix}-category`}
            value={selectedCategoryId}
            onChange={(event) => onCategorySelect(event.target.value)}
            className={`w-full px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
              isPcHub
                ? 'rounded-[1rem] border border-[#d9dee5] bg-[#fffdf8]'
                : isRoseBoutique
                  ? 'rounded-[1rem] border border-[#ead8cf] bg-[#fffaf7]'
                  : isDistrictMarket
                    ? 'rounded-[1rem] border border-[#ead8cb] bg-[#fffaf5]'
                    : 'rounded-[var(--radius)] border border-border bg-background'
            }`}
          >
            <option value="all">{allProductsLabel}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </>
      ) : (
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => onCategorySelect('all')}
            className={`w-full text-start px-3 py-2 text-sm transition-colors ${
              selectedCategoryId === 'all'
                ? isPcHub
                  ? 'rounded-[1rem] bg-[#1f242c] font-medium text-[#fff4d1] shadow-[0_16px_34px_-26px_rgba(31,36,44,0.55)]'
                  : isRoseBoutique
                    ? 'rounded-[1rem] bg-[linear-gradient(135deg,#3d2a2f,#8f4d41)] font-medium text-white shadow-[0_16px_32px_-24px_rgba(76,42,44,0.32)]'
                    : isDistrictMarket
                      ? 'rounded-[1rem] bg-[linear-gradient(135deg,#ee742f,#d95d1c)] font-medium text-white shadow-[0_16px_32px_-26px_rgba(217,93,28,0.55)]'
                      : isMarketplaceAvenue
                        ? 'rounded-[6px] bg-[#e14a5c]/10 font-bold text-[#e14a5c]'
                        : 'rounded-[var(--radius)] bg-primary text-primary-foreground font-medium'
                : isPcHub
                  ? 'rounded-[1rem] border border-[#d9dee5] text-[#1f242c] hover:border-[#facc15] hover:bg-[#fffdf5]'
                  : isRoseBoutique
                    ? 'rounded-[1rem] border border-[#ead8cf] text-[#5b4950] hover:border-[#d86b55] hover:bg-[#fff8f5]'
                    : isDistrictMarket
                      ? 'rounded-[1rem] text-foreground hover:bg-[#f7eee6]'
                      : isMarketplaceAvenue
                        ? 'rounded-[6px] text-[#444444] hover:bg-[#f7f7f7] hover:text-[#e14a5c]'
                        : 'rounded-[var(--radius)] text-foreground hover:bg-muted'
            }`}
          >
            {allProductsLabel}
          </button>

          {isLoading ? (
            <div className="space-y-2 py-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-8 bg-muted animate-pulse rounded-[var(--radius)] w-full"
                />
              ))}
            </div>
          ) : (
            categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onCategorySelect(cat.id)}
                className={`w-full text-start px-3 py-2 text-sm transition-colors ${
                  selectedCategoryId === cat.id
                    ? isPcHub
                      ? 'rounded-[1rem] bg-[#1f242c] font-medium text-[#fff4d1] shadow-[0_16px_34px_-26px_rgba(31,36,44,0.55)]'
                      : isRoseBoutique
                        ? 'rounded-[1rem] bg-[linear-gradient(135deg,#3d2a2f,#8f4d41)] font-medium text-white shadow-[0_16px_32px_-24px_rgba(76,42,44,0.32)]'
                        : isDistrictMarket
                          ? 'rounded-[1rem] bg-[linear-gradient(135deg,#ee742f,#d95d1c)] font-medium text-white shadow-[0_16px_32px_-26px_rgba(217,93,28,0.55)]'
                          : isMarketplaceAvenue
                            ? 'rounded-[6px] bg-[#e14a5c]/10 font-bold text-[#e14a5c]'
                            : 'rounded-[var(--radius)] bg-primary text-primary-foreground font-medium'
                    : isPcHub
                      ? 'rounded-[1rem] border border-[#d9dee5] text-[#1f242c] hover:border-[#facc15] hover:bg-[#fffdf5]'
                      : isRoseBoutique
                        ? 'rounded-[1rem] border border-[#ead8cf] text-[#5b4950] hover:border-[#d86b55] hover:bg-[#fff8f5]'
                        : isDistrictMarket
                          ? 'rounded-[1rem] text-foreground hover:bg-[#f7eee6]'
                          : isMarketplaceAvenue
                            ? 'rounded-[6px] text-[#444444] hover:bg-[#f7f7f7] hover:text-[#e14a5c]'
                            : 'rounded-[var(--radius)] text-foreground hover:bg-muted'
                }`}
              >
                {cat.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default FiltersSidebarCategories;
