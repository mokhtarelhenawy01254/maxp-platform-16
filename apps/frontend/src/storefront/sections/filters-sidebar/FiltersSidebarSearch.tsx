import React from 'react';

interface FiltersSidebarSearchProps {
  showSearch: boolean;
  shellClassName: string;
  headingClassName: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchButtonText: string;
  fieldPrefix: string;
  searchValue: string;
  isPcHub: boolean;
  isRoseBoutique: boolean;
  isDistrictMarket: boolean;
  isMarketplaceAvenue?: boolean;
  onSearchChange: (value: string) => void;
  onSearchSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export const FiltersSidebarSearch: React.FC<FiltersSidebarSearchProps> = ({
  showSearch,
  shellClassName,
  headingClassName,
  searchLabel,
  searchPlaceholder,
  searchButtonText,
  fieldPrefix,
  searchValue,
  isPcHub,
  isRoseBoutique,
  isDistrictMarket,
  isMarketplaceAvenue = false,
  onSearchChange,
  onSearchSubmit,
}) => {
  if (!showSearch) {
    return null;
  }

  return (
    <div className={shellClassName} data-testid="filters-sidebar-search">
      <h3 className={`font-heading uppercase ${headingClassName}`}>
        {searchLabel}
      </h3>
      <form onSubmit={onSearchSubmit} className="space-y-3">
        <label htmlFor={`${fieldPrefix}-search`} className="sr-only">
          {searchPlaceholder}
        </label>
        <input
          id={`${fieldPrefix}-search`}
          type="search"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className={`w-full px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
            isPcHub
              ? 'rounded-[1rem] border border-[#d9dee5] bg-[#fffdf8]'
              : isRoseBoutique
                ? 'rounded-[1rem] border border-[#ead8cf] bg-[#fffaf7]'
                : isDistrictMarket
                  ? 'rounded-[1rem] border border-[#ead8cb] bg-[#fffaf5]'
                  : isMarketplaceAvenue
                    ? 'rounded-[6px] border border-[#e2e8f0] bg-white focus:border-[#e14a5c] focus:ring-[#e14a5c]/20'
                    : 'rounded-[var(--radius)] border border-border bg-background'
          }`}
        />
        <button
          type="submit"
          className={`w-full px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-95 ${
            isPcHub
              ? 'rounded-[999px] bg-[#1f242c] text-[#fff4d1] shadow-[0_18px_38px_-28px_rgba(31,36,44,0.55)]'
              : isRoseBoutique
                ? 'rounded-[999px] bg-[linear-gradient(135deg,#3d2a2f,#8f4d41)] shadow-[0_18px_38px_-28px_rgba(76,42,44,0.42)]'
                : isDistrictMarket
                  ? 'rounded-[999px] bg-[linear-gradient(135deg,#ee742f,#d95d1c)] shadow-[0_18px_40px_-30px_rgba(217,93,28,0.55)]'
                  : isMarketplaceAvenue
                    ? 'rounded-[6px] bg-[#e14a5c] text-white shadow-xs hover:bg-[#cf3c4e]'
                    : 'rounded-[var(--button-radius)] bg-primary'
          }`}
        >
          {searchButtonText}
        </button>
      </form>
    </div>
  );
};

export default FiltersSidebarSearch;
