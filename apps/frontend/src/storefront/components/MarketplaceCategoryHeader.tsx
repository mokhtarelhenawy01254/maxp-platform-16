import React, { createContext, useContext } from 'react';
import { Link, useInRouterContext, useSearchParams } from 'react-router-dom';
import { useCategories } from '../hooks/useCategories';
import { useStorefrontTheme } from '../engine/ThemeProvider';
import {
  findActiveMarketplaceContext,
  getMarketplaceCategoryImage,
  resolveMarketplaceDepartments,
} from '../utils/marketplaceCategories';

const MarketplaceHeaderRenderedContext = createContext<boolean>(false);

export const MarketplaceHeaderRenderedProvider: React.FC<{
  rendered?: boolean;
  children: React.ReactNode;
}> = ({ rendered = true, children }) => (
  <MarketplaceHeaderRenderedContext.Provider value={rendered}>
    {children}
  </MarketplaceHeaderRenderedContext.Provider>
);

export const useMarketplaceHeaderRendered = () => useContext(MarketplaceHeaderRenderedContext);

const MarketplaceCategoryHeaderContent: React.FC<{
  activeCategoryParam: string | null;
}> = ({ activeCategoryParam }) => {
  const { theme } = useStorefrontTheme();
  const { categories: dbCategories } = useCategories();

  const isRtl = theme.direction === 'rtl';

  const departments = React.useMemo(
    () => resolveMarketplaceDepartments(theme, dbCategories, isRtl),
    [theme, dbCategories, isRtl],
  );

  const {
    matchedDepartment,
    activeSubcategory,
    activeHeadingTitle,
    circularItems,
  } = React.useMemo(
    () => findActiveMarketplaceContext(departments, activeCategoryParam, dbCategories, isRtl),
    [departments, activeCategoryParam, dbCategories, isRtl],
  );

  return (
    <section className="mb-7" dir={theme.direction} data-testid="marketplace-category-header">
      {/* 1. Category / Page Title (WoodMart Marketplace 2: Title first) */}
      <h1 className="font-heading text-[26px] sm:text-[32px] font-bold leading-tight tracking-tight text-[#222222]">
        {activeHeadingTitle}
      </h1>

      {/* 2. Breadcrumbs right under the title (WoodMart Marketplace 2) */}
      <nav
        className="mt-1.5 mb-6 flex flex-wrap items-center gap-1.5 text-[13px] text-[#777777]"
        aria-label="Breadcrumb"
      >
        <Link to="/" className="transition-colors hover:text-[#e14a5c]">
          {isRtl ? 'الرئيسية' : 'Home'}
        </Link>
        <span className="text-[#c4c4c4] text-xs">/</span>
        {matchedDepartment ? (
          <Link to="/shop" className="transition-colors hover:text-[#e14a5c]">
            {isRtl ? 'المتجر' : 'Shop'}
          </Link>
        ) : (
          <span className="font-medium text-[#333333]">{isRtl ? 'المتجر' : 'Shop'}</span>
        )}
        {matchedDepartment && (
          <>
            <span className="text-[#c4c4c4] text-xs">/</span>
            {activeSubcategory ? (
              <Link to={matchedDepartment.to} className="transition-colors hover:text-[#e14a5c]">
                {matchedDepartment.label}
              </Link>
            ) : (
              <span className="font-semibold text-[#333333]">{matchedDepartment.label}</span>
            )}
          </>
        )}
        {activeSubcategory && (
          <>
            <span className="text-[#c4c4c4] text-xs">/</span>
            <span className="font-semibold text-[#333333]">{activeSubcategory.label}</span>
          </>
        )}
      </nav>

      {/* 3. Circular Subcategories Carousel / Row (WoodMart Marketplace 2 .wd-cats) */}
      {circularItems.length > 0 && (
        <div className="overflow-x-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max items-start gap-5 sm:gap-7 md:gap-8 pb-2">
            {circularItems.map((item) => {
              const fallbackImg = getMarketplaceCategoryImage(item.slug);
              return (
                <Link
                  key={`${item.slug}-${item.label}`}
                  to={item.to || '/shop'}
                  className="group flex w-[96px] sm:w-[116px] md:w-[126px] shrink-0 flex-col items-center text-center transition-transform duration-200 hover:-translate-y-1"
                >
                  <div
                    className={`relative h-[96px] w-[96px] sm:h-[116px] sm:w-[116px] md:h-[126px] md:w-[126px] overflow-hidden rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] border transition-all ${
                      item.active
                        ? 'border-[#e14a5c] ring-2 ring-[#e14a5c] ring-offset-2'
                        : 'border-[#ececec] group-hover:border-[#e14a5c]'
                    }`}
                  >
                    <img
                      src={item.image || fallbackImg}
                      alt={item.label}
                      loading="eager"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src !== fallbackImg) {
                          target.src = fallbackImg;
                        }
                      }}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <span
                    className={`mt-2.5 text-[13px] sm:text-[14px] font-semibold leading-snug line-clamp-2 transition-colors ${
                      item.active ? 'text-[#e14a5c] font-bold' : 'text-[#222222] group-hover:text-[#e14a5c]'
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};

const MarketplaceCategoryHeaderWithRouter: React.FC = () => {
  const [searchParams] = useSearchParams();
  return <MarketplaceCategoryHeaderContent activeCategoryParam={searchParams.get('category')} />;
};

export const MarketplaceCategoryHeader: React.FC = () => {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return <MarketplaceCategoryHeaderWithRouter />;
  }
  const fallbackCategory =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('category')
      : null;
  return <MarketplaceCategoryHeaderContent activeCategoryParam={fallbackCategory} />;
};

export default MarketplaceCategoryHeader;
