import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { StorefrontHomeLink } from "../storefrontHeaderHelpers";
import { StorefrontSearchOverlay } from "./StorefrontSearchOverlay";
import type { StorefrontHeaderController } from "../storefrontHeaderTypes";
import { LanguageSwitcher } from "../../LanguageSwitcher";
import { useStorefrontLocale } from "../../../i18n/useStorefrontLocale";
import { useCartStore } from "../../../store/useCartStore";
import { formatStorefrontCurrency } from "../../../utils/currency";

interface MarketplaceHeaderProps {
  controller: StorefrontHeaderController;
}

/**
 * Department-store header: navy utility row (quick links + hotline), navy main row with a white
 * rounded search pill and cart, then the red category bar — the three-band anatomy of the
 * marketplace demo, mapped onto our header controller so search/cart/nav stay live.
 */
export const MarketplaceHeader: React.FC<MarketplaceHeaderProps> = ({ controller }) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"categories" | "menu">("categories");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

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
    location,
  } = controller;

  // a theme that ships both locales follows the visitor's choice; a single-language theme keeps
  // its own direction so flipping ?lang never mirrors a layout that has no English copy.
  const bilingual = Array.isArray(theme.supportedLocales) && theme.supportedLocales.length > 1;
  const { locale } = useStorefrontLocale(theme.defaultLocale);
  const isRtl = bilingual ? locale === "ar" : theme.direction === "rtl";
  const headerDir = isRtl ? "rtl" : "ltr";
  const quickLinks = (theme.header?.actions || []).slice(0, 6);
  const allDropdownCategories = theme.header?.dropdowns || [];
  const categories = allDropdownCategories.slice(0, 8);
  const drawerCategories = allDropdownCategories.length ? allDropdownCategories : categories;
  const phone = (theme.footer && (theme.footer as { phoneText?: string }).phoneText) || "01000 000 000";

  const cartSubtotal = useCartStore((state) => state.getSubtotal());
  const storeCurrency =
    (controller.settings?.storefront?.settings?.currency as string) ||
    (controller.settings?.company?.currency as string) ||
    "EGP";
  const formattedCartTotal = formatStorefrontCurrency(cartSubtotal, storeCurrency);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setSearchOpen(true);
  };

  const toggleCategoryExpand = (label: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  // Close mobile menu when pathname changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location?.pathname, setMobileMenuOpen]);

  // Close mobile menu on Escape key press
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen, setMobileMenuOpen]);

  // Lock body scroll while mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Automatically close mobile menu if viewport becomes desktop
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mobileMenuOpen, setMobileMenuOpen]);

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
              type="button"
              className="rounded-full p-2 text-white transition-colors hover:bg-white/10 md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? (isRtl ? "إغلاق القائمة" : "Close menu") : (isRtl ? "القائمة" : "Menu")}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="4" x2="20" y1="6" y2="6" />
                  <line x1="4" x2="20" y1="12" y2="12" />
                  <line x1="4" x2="20" y1="18" y2="18" />
                </svg>
              )}
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

            <div className="flex shrink-0 items-center gap-5">
              {/* Hotline next to search (WoodMart Marketplace 2 style) */}
              <div className="hidden items-center gap-2.5 xl:flex">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                <div className="flex flex-col text-start leading-none">
                  <span className="text-[11px] text-white/60">{isRtl ? "خط ساخن 24/7" : "Hotline 24/7"}</span>
                  <span className="mt-1 text-[13px] font-bold text-white">{phone}</span>
                </div>
              </div>

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
                  className="relative flex items-center gap-2.5 text-white transition-opacity hover:opacity-90"
                  aria-label={isRtl ? `السلة (${totalItems})` : `Cart (${totalItems})`}
                >
                  <div className="relative flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <circle cx="8" cy="21" r="1" />
                      <circle cx="19" cy="21" r="1" />
                      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                    </svg>
                    {totalItems > 0 ? (
                      <span className="absolute -end-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#e14a5c] text-[10px] font-bold text-white shadow">
                        {totalItems}
                      </span>
                    ) : null}
                  </div>
                  <div className="hidden flex-col items-start leading-none sm:flex">
                    <span className="text-[11px] text-white/60">{totalItems} {isRtl ? "منتج" : "items"}</span>
                    <span className="mt-1 text-[13px] font-bold text-white">{formattedCartTotal}</span>
                  </div>
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* band 3 — categories + nav */}
        <div className="bg-[#e14a5c] text-white">
          <div className="container flex h-[51px] items-center justify-between gap-6 px-4 text-[15px] font-semibold md:px-6">
            <div className="flex items-center gap-7 overflow-x-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {categories.map((dropdown) => {
                const items = (dropdown.items || []).filter(
                  (item): item is { label: string; to: string } => Boolean(item?.label && item?.to),
                );
                const label = dropdown.label || items[0]?.label || "";
                const currentCategory = new URLSearchParams(location?.search || "").get("category");
                const getCatParam = (url?: string) => {
                  if (!url || typeof url !== 'string') return '';
                  try {
                    const q = url.includes('?') ? url.split('?')[1] : url;
                    return new URLSearchParams(q || '').get('category') || '';
                  } catch { return ''; }
                };
                const isCatActive = Boolean(
                  currentCategory &&
                  (getCatParam(dropdown.to).toLowerCase() === currentCategory.toLowerCase() ||
                   items.some((item) => getCatParam(item?.to).toLowerCase() === currentCategory.toLowerCase()))
                );
                return (
                  <div key={label} className="group relative shrink-0">
                    <Link
                      to={dropdown.to || items[0]?.to || "/collections"}
                      className={`flex items-center gap-1 whitespace-nowrap transition-colors ${
                        isCatActive
                          ? "text-white font-bold underline decoration-2 underline-offset-8"
                          : "text-white/95 hover:text-white"
                      }`}
                    >
                      {label}
                      {items.length ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      ) : null}
                    </Link>
                    {/* department flyout */}
                    {items.length ? (
                      <div className="pointer-events-none invisible absolute start-0 top-full z-50 w-[250px] translate-y-1 rounded-b-xl border border-border bg-white p-2 text-[14px] font-medium text-foreground opacity-0 shadow-xl transition-all duration-150 group-hover:pointer-events-auto group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:opacity-100">
                        <ul className="flex flex-col">
                          {items.map((item: { label: string; to: string }) => (
                            <li key={item.to + item.label}>
                              <Link
                                to={item.to}
                                className="block rounded-lg px-3 py-1.5 text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                              >
                                {item.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                );
              })}
              {/* overflow menu — the categories/nav that do not fit are reachable here
                  instead of a raw horizontal scrollbar */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setMoreOpen((open) => !open)}
                  aria-label={isRtl ? "المزيد من الأقسام" : "More departments"}
                  aria-expanded={moreOpen}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <circle cx="5" cy="12" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="19" cy="12" r="2" />
                  </svg>
                </button>
                {moreOpen ? (
                  <div className="absolute start-0 top-full z-50 mt-1 w-[240px] rounded-b-xl border border-border bg-white p-2 text-[14px] font-medium text-foreground shadow-xl">
                    <ul className="flex max-h-[320px] flex-col overflow-y-auto">
                      {categories.map((dropdown) => {
                        const items = (dropdown.items || []).filter(
                          (item): item is { label: string; to: string } => Boolean(item?.label && item?.to),
                        );
                        const label = dropdown.label || items[0]?.label || "";
                        return (
                          <li key={`more-${label}`}>
                            <Link
                              to={dropdown.to || items[0]?.to || "/collections"}
                              onClick={() => setMoreOpen(false)}
                              className="block rounded-lg px-3 py-1.5 text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                            >
                              {label}
                            </Link>
                          </li>
                        );
                      })}
                      <li className="my-1 border-t border-border" />
                      {(navLinks || []).map((link: { label: string; to: string }) => (
                        <li key={`more-nav-${link.to}-${link.label}`}>
                          <Link
                            to={link.to}
                            onClick={() => setMoreOpen(false)}
                            className="block rounded-lg px-3 py-1.5 text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
              {/* When categories exist (WoodMart Marketplace 2 style), the red bar focuses purely on categories and keeps nav in the more dropdown/drawer */}
              {categories.length === 0 && navLinks?.slice(0, 4).map((link: { label: string; to: string }) => (
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

            {/* Right side of red bar (WoodMart Marketplace 2: Wishlist + Account) */}
            <div className="ms-auto hidden shrink-0 items-center gap-4 text-[13px] font-medium lg:flex">
              <Link
                to="/shop"
                className="flex items-center gap-1.5 text-white/90 transition-colors hover:text-white"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
                <span>{isRtl ? "قائمة الرغبات" : "Wishlist"}</span>
              </Link>
              <span className="h-3.5 w-px bg-white/30" />
              <Link
                to="/contact"
                className="flex items-center gap-1.5 text-white/90 transition-colors hover:text-white"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>{isRtl ? "تسجيل الدخول / حسابي" : "Login / Register"}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen ? (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[99] bg-black/60 backdrop-blur-[2px] transition-opacity md:hidden"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Slide-in Drawer */}
            <aside
              className={`fixed inset-y-0 ${
                isRtl ? "right-0 border-l" : "left-0 border-r"
              } z-[100] flex w-full max-w-[320px] flex-col bg-white text-slate-800 shadow-2xl md:hidden animate-in ${
                isRtl ? "slide-in-from-right" : "slide-in-from-left"
              } duration-200`}
              role="dialog"
              aria-modal="true"
              aria-label={isRtl ? "قائمة التصفح" : "Navigation menu"}
              dir={headerDir}
            >
              {/* Drawer Top Bar */}
              <div className="flex h-[64px] shrink-0 items-center justify-between border-b border-white/10 bg-[#0d0625] px-4 text-white">
                <StorefrontHomeLink
                  {...brandHomeLinkProps}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 min-w-0"
                >
                  <span className="truncate font-heading text-lg font-bold text-white tracking-tight">
                    {displayStoreName}
                  </span>
                </StorefrontHomeLink>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label={isRtl ? "إغلاق القائمة" : "Close menu"}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Drawer Tabs: Categories / Menu */}
              <div className="grid shrink-0 grid-cols-2 border-b border-slate-200 bg-slate-50 text-[13px] font-bold">
                <button
                  type="button"
                  onClick={() => setMobileTab("categories")}
                  className={`flex items-center justify-center gap-1.5 py-3 transition-colors ${
                    mobileTab === "categories"
                      ? "border-b-2 border-[#e14a5c] bg-white text-[#e14a5c]"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="7" height="7" x="3" y="3" rx="1" />
                    <rect width="7" height="7" x="14" y="3" rx="1" />
                    <rect width="7" height="7" x="14" y="14" rx="1" />
                    <rect width="7" height="7" x="3" y="14" rx="1" />
                  </svg>
                  <span>{isRtl ? "الأقسام" : "Categories"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab("menu")}
                  className={`flex items-center justify-center gap-1.5 py-3 transition-colors ${
                    mobileTab === "menu"
                      ? "border-b-2 border-[#e14a5c] bg-white text-[#e14a5c]"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="4" x2="20" y1="6" y2="6" />
                    <line x1="4" x2="20" y1="12" y2="12" />
                    <line x1="4" x2="20" y1="18" y2="18" />
                  </svg>
                  <span>{isRtl ? "القائمة" : "Menu"}</span>
                </button>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {mobileTab === "categories" ? (
                  <div className="space-y-1">
                    {drawerCategories.map((dropdown, idx) => {
                      const items = (dropdown.items || []).filter(
                        (item): item is { label: string; to: string } => Boolean(item?.label && item?.to),
                      );
                      const label = dropdown.label || items[0]?.label || "";
                      const to = dropdown.to || items[0]?.to || "/collections";
                      const isExpanded = Boolean(expandedCategories[label]);

                      return (
                        <div key={`mob-cat-${label}-${idx}`} className="border-b border-slate-100 last:border-0 pb-1">
                          <div className="flex items-center justify-between py-2">
                            <Link
                              to={to}
                              onClick={() => setMobileMenuOpen(false)}
                              className="flex-1 text-sm font-semibold text-slate-800 transition-colors hover:text-[#e14a5c]"
                            >
                              {label}
                            </Link>
                            {items.length > 0 ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleCategoryExpand(label);
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                                aria-label={isExpanded ? (isRtl ? "طي" : "Collapse") : (isRtl ? "توسيع" : "Expand")}
                                aria-expanded={isExpanded}
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                                >
                                  <path d="m6 9 6 6 6-6" />
                                </svg>
                              </button>
                            ) : null}
                          </div>
                          {items.length > 0 && isExpanded ? (
                            <ul className={`mb-2 space-y-1 ${isRtl ? "pr-3 border-r-2" : "pl-3 border-l-2"} border-[#e14a5c]/30`}>
                              {items.map((subItem, sIdx) => (
                                <li key={`mob-sub-${subItem.to}-${sIdx}`}>
                                  <Link
                                    to={subItem.to}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="block py-1.5 text-xs font-medium text-slate-600 transition-colors hover:text-[#e14a5c]"
                                  >
                                    {subItem.label}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      );
                    })}

                    <div className="pt-2">
                      <Link
                        to="/collections"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#e14a5c]/40 bg-[#e14a5c]/5 py-2.5 text-xs font-bold text-[#e14a5c] transition hover:bg-[#e14a5c]/10"
                      >
                        <span>{isRtl ? "عرض كل الأقسام" : "View All Categories"}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={isRtl ? "rotate-180" : ""}>
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {navLinks?.map((link: { label: string; to: string }) => (
                      <Link
                        key={`mob-nav-${link.to}-${link.label}`}
                        to={link.to}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`block rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                          isActive?.(link.to)
                            ? "bg-[#e14a5c]/10 text-[#e14a5c]"
                            : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        {link.label}
                      </Link>
                    ))}

                    <div className="my-2 border-t border-slate-100 pt-2" />

                    <Link
                      to="/shop"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                      </svg>
                      <span>{isRtl ? "قائمة الرغبات" : "Wishlist"}</span>
                    </Link>

                    <Link
                      to="/contact"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      <span>{isRtl ? "تسجيل الدخول / حسابي" : "Login / Register"}</span>
                    </Link>

                    {quickLinks.length > 0 ? (
                      <>
                        <div className="my-2 border-t border-slate-100 pt-2">
                          <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            {isRtl ? "روابط سريعة" : "Quick Links"}
                          </span>
                        </div>
                        {quickLinks.map((action, idx) => (
                          <Link
                            key={`mob-quick-${action.label}-${idx}`}
                            to={action.to}
                            onClick={() => setMobileMenuOpen(false)}
                            className="block rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                          >
                            {action.label}
                          </Link>
                        ))}
                      </>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Drawer Footer: Hotline & Language Switcher */}
              <div className="shrink-0 border-t border-slate-100 bg-slate-50 p-4 space-y-3">
                <a
                  href={`tel:${String(phone).replace(/\s+/g, "")}`}
                  className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 transition-colors hover:text-slate-900"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0d0625] text-white">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 leading-none">{isRtl ? "خط ساخن 24/7" : "Hotline 24/7"}</div>
                    <div className="mt-0.5 text-xs font-bold text-slate-800">{phone}</div>
                  </div>
                </a>

                {bilingual ? (
                  <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
                    <span className="text-xs font-medium text-slate-500">{isRtl ? "اللغة" : "Language"}</span>
                    <LanguageSwitcher className="text-slate-700" />
                  </div>
                ) : null}
              </div>
            </aside>
          </>
        ) : null}
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
