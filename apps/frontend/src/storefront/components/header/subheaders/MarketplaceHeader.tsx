import React from "react";
import { Link } from "react-router-dom";
import { StorefrontHomeLink } from "../storefrontHeaderHelpers";
import { StorefrontSearchOverlay } from "./StorefrontSearchOverlay";
import type { StorefrontHeaderController } from "../storefrontHeaderTypes";
import { LanguageSwitcher } from "../../LanguageSwitcher";
import { useStorefrontLocale } from "../../../i18n/useStorefrontLocale";

interface MarketplaceHeaderProps {
  controller: StorefrontHeaderController;
}

/**
 * Department-store header: navy utility row (quick links + hotline), navy main row with a white
 * rounded search pill and cart, then the red category bar — the three-band anatomy of the
 * marketplace demo, mapped onto our header controller so search/cart/nav stay live.
 */
export const MarketplaceHeader: React.FC<MarketplaceHeaderProps> = ({ controller }) => {
  const {
    theme,
    displayStoreName,
    brandHomeLinkProps,
    navLinks,
    isActive,
    showSearch,
    showCart,
    totalItems,
    setIsOpen,
    query,
    setQuery,
    searchOpen,
    setSearchOpen,
    closeSearchOverlay,
    results,
    isLoading,
    moreResultsPath,
    setMobileMenuOpen,
    mobileMenuOpen,
  } = controller;

  // a theme that ships both locales follows the visitor's choice; a single-language theme keeps
  // its own direction so flipping ?lang never mirrors a layout that has no English copy.
  const bilingual = Array.isArray(theme.supportedLocales) && theme.supportedLocales.length > 1;
  const { locale } = useStorefrontLocale(theme.defaultLocale);
  const isRtl = bilingual ? locale === "ar" : theme.direction === "rtl";
  const headerDir = isRtl ? "rtl" : "ltr";
  const quickLinks = (theme.header?.actions || []).slice(0, 6);
  const categories = (theme.header?.dropdowns || []).slice(0, 5);
  const phone = (theme.footer && (theme.footer as { phoneText?: string }).phoneText) || "01000 000 000";

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setSearchOpen(true);
  };

  return (
    <>
      <header dir={headerDir} className="sticky top-0 z-50 w-full">
        {/* band 1 — utility */}
        <div className="hidden bg-[#0d0625] text-white md:block">
          <div className="container flex h-[42px] items-center justify-between gap-4 px-4 text-[12px] md:px-6">
            <div className="flex items-center gap-6">
              {quickLinks.map((action, index) => (
                <Link key={`${action.label}-${index}`} to={action.to} className="text-white/70 transition-colors hover:text-white">
                  {action.label}
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-5">
              <span className="text-white/60">{isRtl ? "خط ساخن 24/7" : "Hotline 24/7"}</span>
              <span className="font-semibold">{phone}</span>
              {bilingual ? (
                <span className="hidden items-center gap-1 rounded-full bg-white/10 px-2 py-1 md:inline-flex">
                  <LanguageSwitcher className="text-white" />
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* band 2 — brand + search */}
        <div className="bg-[#0d0625] text-white">
          <div className="container flex h-[95px] items-center gap-6 px-4 md:px-6">
            <button
              className="rounded-full p-2 text-white md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={isRtl ? "القائمة" : "Menu"}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            </button>

            <StorefrontHomeLink {...brandHomeLinkProps} className="flex shrink-0 items-center gap-2">
              <span className="font-heading text-[26px] font-bold tracking-tight text-white">{displayStoreName}</span>
            </StorefrontHomeLink>

            {showSearch ? (
              <form
                onSubmit={submitSearch}
                className="hidden min-w-0 flex-1 items-center overflow-hidden rounded-[30px] bg-white md:flex"
              >
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onFocus={() => setSearchOpen(true)}
                  placeholder={isRtl ? "ابحث عن منتج، ماركة، أو قسم..." : "Search products, brands, categories..."}
                  className="min-w-0 flex-1 bg-transparent px-5 py-[11px] text-[14px] text-[#333333] outline-none placeholder:text-[#9a9a9a]"
                />
                <button
                  type="submit"
                  className="m-[4px] flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[#e14a5c] text-white"
                  aria-label={isRtl ? "بحث" : "Search"}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </button>
              </form>
            ) : null}

            <div className="flex shrink-0 items-center gap-4">
              {showSearch ? (
                <button
                  onClick={() => setSearchOpen(true)}
                  className="rounded-full p-2 text-white md:hidden"
                  aria-label={isRtl ? "بحث" : "Search"}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </button>
              ) : null}
              {showCart ? (
                <button
                  onClick={() => setIsOpen(true)}
                  className="relative flex items-center gap-2 text-white"
                  aria-label={isRtl ? `السلة (${totalItems})` : `Cart (${totalItems})`}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <circle cx="8" cy="21" r="1" />
                    <circle cx="19" cy="21" r="1" />
                    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                  </svg>
                  <span className="hidden text-[12px] font-semibold sm:block">{totalItems}</span>
                  {totalItems > 0 ? (
                    <span className="absolute -end-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#e14a5c] text-[10px] font-bold text-white">
                      {totalItems}
                    </span>
                  ) : null}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* band 3 — categories + nav */}
        <div className="bg-[#e14a5c] text-white">
          <div className="container flex h-[51px] items-center gap-8 overflow-x-auto px-4 text-[15px] font-semibold md:px-6">
            {categories.map((dropdown) => (
              <Link
                key={dropdown.label}
                to={dropdown.items?.[0]?.to || "/collections"}
                className="whitespace-nowrap text-white/90 transition-colors hover:text-white"
              >
                {dropdown.label}
              </Link>
            ))}
            {navLinks?.slice(0, 4).map((link: { label: string; to: string }) => (
              <Link
                key={link.to + link.label}
                to={link.to}
                className={`whitespace-nowrap transition-colors ${
                  isActive?.(link.to) ? "text-white underline decoration-2 underline-offset-8" : "text-white/90 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <StorefrontSearchOverlay
        searchOpen={searchOpen}
        closeSearchOverlay={closeSearchOverlay}
        query={query}
        setQuery={setQuery}
        results={results}
        isLoading={isLoading}
        moreResultsPath={moreResultsPath}
      />
    </>
  );
};
