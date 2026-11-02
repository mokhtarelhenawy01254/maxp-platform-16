import React from "react";
import { Link } from "react-router-dom";
import { StorefrontSearchResults as SearchResults } from "../../StorefrontSearchResults";
import { StorefrontHomeLink } from "../storefrontHeaderHelpers";
import type { StorefrontHeaderController } from "../storefrontHeaderTypes";

interface KhemetLuxeHeaderProps {
  controller: StorefrontHeaderController;
}

export const KhemetLuxeHeader: React.FC<KhemetLuxeHeaderProps> = ({ controller }) => {
  const {
    isMinimal,
    theme,
    brandHomeLinkProps,
    displayLogoUrl,
    displayStoreName,
    showCart,
    isCheckoutPath,
    setIsOpen,
    totalItems,
    navLinks,
    shouldForceDocumentNavigation,
    isKhemetInnerNavActive,
    isIntruderNft,
    showSearch,
    setMobileMenuOpen,
    mobileMenuOpen,
    setSearchOpen,
    hideUtilityBar,
    showKhemetFreeShippingSignal,
    khemetFreeShippingThresholdText,
    khemetUtilityShopPath,
    legacyMenuLinks,
    searchOpen,
    query,
    setQuery,
    closeSearchOverlay,
    results,
    isLoading,
    moreResultsPath,
  } = controller;

  // Minimal Header Mode (e.g., checkout page)
  if (isMinimal) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-[#e6dccf] bg-white">
        <div className="container px-4 md:px-6">
          <div
            className="flex items-center justify-between gap-4 py-5"
            dir={theme.direction || "rtl"}
          >
            <StorefrontHomeLink
              {...brandHomeLinkProps}
              className="shrink-0"
            >
              {displayLogoUrl ? (
                <img
                  src={displayLogoUrl}
                  alt={displayStoreName}
                  className="h-10 w-auto object-contain md:h-11"
                />
              ) : (
                <span className="font-heading text-[2rem] font-black tracking-[-0.04em] text-[#1a1714]">
                  {displayStoreName}
                </span>
              )}
            </StorefrontHomeLink>

            {showCart && isCheckoutPath ? (
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#e6dccf] text-[#7b6747] transition-colors hover:border-[#b89255] hover:text-[#2c241b]"
                aria-label={
                  theme.direction === "rtl" ? "فتح السلة" : "Open cart"
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="8" cy="21" r="1" />
                  <circle cx="19" cy="21" r="1" />
                  <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                </svg>
                {totalItems > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#2c241b] px-1 text-[10px] font-black text-white">
                    {totalItems}
                  </span>
                ) : null}
              </button>
            ) : (
              <div className="h-11 w-11" aria-hidden="true" />
            )}
          </div>
        </div>
      </header>
    );
  }

  // Full / Unified Khemet Luxe Header
  const khemetUtilityBar = !hideUtilityBar ? (
    <div className="border-t border-white/10 bg-[#090b0e] text-white" dir="rtl">
      <div className="container px-3 sm:px-6">
        <div className="flex min-h-9 items-center justify-center sm:justify-between text-[11px] sm:text-xs text-white/80">
          <div className="flex items-center justify-center gap-2 sm:gap-3 overflow-x-auto py-1 no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden w-full sm:w-auto">
            {showKhemetFreeShippingSignal ? (
              <span className="font-semibold text-white tracking-wide shrink-0">
                شحن مجاني فوق <span className="tabular-nums font-medium text-white">{khemetFreeShippingThresholdText}</span>
              </span>
            ) : null}
            <span className="text-white/40 shrink-0">·</span>
            <span className="shrink-0 text-white/80">معاينة واستبدال المقاس عند الاستلام</span>
            <span className="hidden md:inline text-white/30 shrink-0">·</span>
            <span className="hidden md:inline text-white/70">تأكيد الطلب قبل التجهيز</span>
          </div>
          <Link
            to={khemetUtilityShopPath}
            reloadDocument={shouldForceDocumentNavigation}
            className="hidden sm:inline-flex shrink-0 items-center rounded-full bg-white px-3.5 py-1 text-[11px] font-bold text-black transition-all hover:bg-neutral-200 active:scale-[0.97]"
          >
            ابدئي الطلب
          </Link>
        </div>
      </div>
    </div>
  ) : null;

  const khemetSearchOverlay = searchOpen ? (
    <div
      className="fixed inset-0 z-[100] bg-[#1f1916]/35 px-4 py-6 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label={theme.direction === "rtl" ? "بحث المنتجات" : "Search products"}
    >
      <div className="mx-auto max-w-2xl pt-14 md:pt-20">
        <div
          className="rounded-[1.35rem] border border-[#e6dccf] bg-[#fffdfa] p-3 shadow-[0_38px_110px_-58px_rgba(44,36,27,0.42)]"
          dir={theme.direction}
        >
          <div className="relative">
            <svg
              className={`absolute ${theme.direction === "rtl" ? "right-4" : "left-4"} top-1/2 -translate-y-1/2 text-[#8a765f]`}
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              autoFocus
              type="text"
              placeholder={
                theme.direction === "rtl"
                  ? "ابحثي عن منتج أو مقاس..."
                  : "Search products or sizes..."
              }
              className={`h-14 w-full rounded-[1rem] border border-[#d9cbb8] bg-white text-base text-[#241d18] outline-none transition-colors placeholder:text-[#a8947b] focus:border-[#173f31] ${
                theme.direction === "rtl" ? "pe-12 ps-12" : "ps-12 pe-12"
              }`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) =>
                event.key === "Escape" && closeSearchOverlay()
              }
            />
            <button
              type="button"
              onClick={closeSearchOverlay}
              className={`absolute ${theme.direction === "rtl" ? "left-3" : "right-3"} top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[#725523] transition-colors hover:bg-[#f4ede6] hover:text-[#173f31]`}
              aria-label={theme.direction === "rtl" ? "إغلاق البحث" : "Close search"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          {query.length > 2 ? (
            <div className="mt-3 rounded-[1rem] border border-[#e7ddd0] bg-white p-3">
              <p className="mb-3 text-start text-sm font-semibold text-[#725523]">
                {theme.direction === "rtl"
                  ? `نتائج البحث عن "${query}"`
                  : `Results for "${query}"`}
              </p>
              <SearchResults
                results={results}
                isLoading={isLoading}
                close={closeSearchOverlay}
              />
              <Link
                to={moreResultsPath}
                onClick={closeSearchOverlay}
                className="mt-3 inline-flex items-center justify-center rounded-full border border-[#d9cbb8] px-4 py-2 text-sm font-bold text-[#173f31] transition-colors hover:border-[#173f31]"
              >
                {theme.direction === "rtl" ? "عرض كل النتائج" : "View all results"}
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-[#e6dccf] bg-[rgba(255,255,255,0.96)] backdrop-blur">
        <div className="container px-4 md:px-6">
          <div className="flex flex-nowrap items-center gap-3 py-4 md:gap-5 md:py-5">
            <StorefrontHomeLink
              {...brandHomeLinkProps}
              className="shrink-0"
            >
              {displayLogoUrl ? (
                <img
                  src={displayLogoUrl}
                  alt={displayStoreName}
                  className="h-9 w-auto object-contain md:h-10"
                />
              ) : (
                <span className="font-heading text-[1.9rem] font-black tracking-[-0.04em] text-[#1a1714] md:text-[2rem]">
                  {displayStoreName}
                </span>
              )}
            </StorefrontHomeLink>

            {navLinks.length > 0 ? (
              <nav className="hidden min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] md:block">
                <div className="flex min-w-max flex-nowrap items-center gap-1 whitespace-nowrap px-3 md:justify-center md:px-4">
                  {navLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      reloadDocument={shouldForceDocumentNavigation}
                      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1.5 text-[13px] font-medium transition-colors md:px-3 md:text-sm ${
                        isKhemetInnerNavActive(link.to)
                          ? "bg-[#1f1916] text-white"
                          : "text-[#6e6257] hover:bg-[#f4ede6] hover:text-[#241d18]"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </nav>
            ) : (
              <div className="hidden flex-1 md:block" />
            )}
            <div className="min-w-0 flex-1 md:hidden" aria-hidden="true" />

            <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
              {!isIntruderNft && showSearch ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setSearchOpen(true);
                  }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e6dccf] text-[#7b6747] transition-colors hover:border-[#b89255] hover:text-[#2c241b]"
                  aria-label={
                    theme.direction === "rtl" ? "فتح البحث" : "Open search"
                  }
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </button>
              ) : null}

              {!isIntruderNft && showCart ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsOpen(true);
                  }}
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e6dccf] text-[#7b6747] transition-colors hover:border-[#b89255] hover:text-[#2c241b]"
                  aria-label={
                    theme.direction === "rtl"
                      ? `سلة التسوق (${totalItems} منتجات)`
                      : `Shopping cart (${totalItems} items)`
                  }
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="8" cy="21" r="1" />
                    <circle cx="19" cy="21" r="1" />
                    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                  </svg>
                  {totalItems > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#2c241b] px-1 text-[10px] font-black text-white">
                      {totalItems}
                    </span>
                  ) : null}
                </button>
              ) : null}

              {navLinks.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e6dccf] text-[#7b6747] transition-colors hover:border-[#b89255] hover:text-[#2c241b] md:hidden"
                  aria-label={
                    theme.direction === "rtl"
                      ? mobileMenuOpen
                        ? "إغلاق القائمة"
                        : "فتح القائمة"
                      : mobileMenuOpen
                        ? "Close menu"
                        : "Open menu"
                  }
                >
                  {mobileMenuOpen ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="4" x2="20" y1="12" y2="12" />
                      <line x1="4" x2="20" y1="6" y2="6" />
                      <line x1="4" x2="20" y1="18" y2="18" />
                    </svg>
                  )}
                </button>
              ) : null}
            </div>
          </div>
        </div>
        {khemetUtilityBar}
      </header>

      {mobileMenuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[90] bg-[#1f1916]/30 backdrop-blur-[1px] md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-label={theme.direction === "rtl" ? "إغلاق القائمة" : "Close menu"}
          />
          <div
            className={`fixed inset-y-0 ${theme.direction === "rtl" ? "right-0 border-l" : "left-0 border-r"} z-[95] w-full max-w-sm overflow-y-auto border-[#e6dccf] bg-[#fffdfa] shadow-[0_36px_100px_-54px_rgba(44,36,27,0.46)] md:hidden`}
            role="dialog"
            aria-modal="true"
            aria-label={theme.direction === "rtl" ? "قائمة المتجر" : "Store navigation"}
            dir={theme.direction}
          >
            <div className="flex items-center justify-between border-b border-[#e6dccf] px-5 py-4">
              <div className="space-y-1">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#8a765f]">
                  {theme.direction === "rtl" ? "التصفح" : "Browse"}
                </p>
                <p className="font-heading text-xl font-black text-[#1a1714]">
                  {displayStoreName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e6dccf] text-[#725523] transition-colors hover:border-[#b89255] hover:text-[#173f31]"
                aria-label={theme.direction === "rtl" ? "إغلاق القائمة" : "Close menu"}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <nav className="px-5 py-5">
              <div className="space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={`khemet-mobile-menu-${link.to}`}
                    to={link.to}
                    reloadDocument={shouldForceDocumentNavigation}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block rounded-[1rem] px-4 py-3 text-sm font-bold transition-colors ${
                      isKhemetInnerNavActive(link.to)
                        ? "bg-[#173f31] text-[#fff7eb]"
                        : "text-[#5f4c38] hover:bg-[#f4ede6] hover:text-[#173f31]"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              {legacyMenuLinks.length > navLinks.length ? (
                <div className="mt-6 border-t border-[#e6dccf] pt-5">
                  <p className="mb-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#8a765f]">
                    {theme.direction === "rtl" ? "روابط مهمة" : "Useful links"}
                  </p>
                  <div className="space-y-1">
                    {legacyMenuLinks.slice(navLinks.length).map((link) => (
                      <Link
                        key={`khemet-mobile-policy-${link.to}`}
                        to={link.to}
                        reloadDocument={shouldForceDocumentNavigation}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block rounded-[0.9rem] px-4 py-2.5 text-sm font-semibold text-[#725523] transition-colors hover:bg-[#f4ede6] hover:text-[#173f31]"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </nav>
          </div>
        </>
      ) : null}

      {khemetSearchOverlay}
    </>
  );
};
