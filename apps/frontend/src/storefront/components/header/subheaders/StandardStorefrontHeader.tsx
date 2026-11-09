import React from "react";
import { Link } from "react-router-dom";
import { StorefrontHead } from "../../../engine/StorefrontHead";
import LanguageSwitcher from "../../LanguageSwitcher";
import { StorefrontHomeLink } from "../storefrontHeaderHelpers";
import { StorefrontSearchOverlay } from "./StorefrontSearchOverlay";
import type { StorefrontHeaderController } from "../storefrontHeaderTypes";

interface StandardStorefrontHeaderProps {
  controller: StorefrontHeaderController;
}

export const StandardStorefrontHeader: React.FC<StandardStorefrontHeaderProps> = ({ controller }) => {
  const {
    theme,
    isMinimal,
    isSticky,
    announcementBarElement,
    isFloatingDarkHeader,
    isCutlineClub,
    isBiteRush,
    isVelaFashionHeader,
    isEditorialSoftHeader,
    isUtilityFrameHeader,
    isRetailDirectHeader,
    isSoleaFemme,
    isIntruderNft,
    cutlineClubRailItems,
    closetOsRailItems,
    isClosetOs,
    editorialHeaderRail,
    utilityHeaderRail,
    headerRailLabel,
    retailDirectRail,
    location,
    isKhemetFloatingDarkHeader,
    mobileMenuOpen,
    setMobileMenuOpen,
    brandHomeLinkProps,
    displayLogoUrl,
    displayStoreName,
    headerTagline,
    isFashionRetailHeader,
    isAtelierNova,
    isElegantLuxe,
    navLinks,
    isActive,
    headerActions,
    showSearch,
    setSearchOpen,
    showCart,
    isCheckoutPath,
    setIsOpen,
    totalItems,
    searchOpen,
    query,
    setQuery,
    closeSearchOverlay,
    results,
    isLoading,
    moreResultsPath,
  } = controller;

  // Department-store chrome for the marketplace-avenue theme: quick-link strip plus the popular
  // search tags row the source demo keeps under its search field. Scoped to the theme id so no
  // other storefront changes shape.
  const isMarketplaceAvenueHeader = theme.id === 'marketplace-avenue';
  const marketplaceQuickLinks = (
    theme.header?.actions && Array.isArray(theme.header.actions) ? theme.header.actions : []
  ).slice(0, 6);
  const marketplaceSearchTags =
    theme.direction === 'rtl'
      ? ['لابتوب', 'موبايل', 'ألعاب', 'ساعات', 'كراسي', 'شاشات']
      : ['Laptop', 'Phone', 'Games', 'Watches', 'Chairs', 'TVs'];

  return (
    <>
      <StorefrontHead />
      {announcementBarElement}
      {!isSticky && (
        <style>{`header.sticky, header[class*="sticky"], .sticky { position: relative !important; top: auto !important; }`}</style>
      )}
      <header
        dir={theme.direction}
        className={`z-50 w-full ${
          isFloatingDarkHeader
            ? "absolute inset-x-0 top-0 bg-transparent"
            : isCutlineClub
              ? "sticky top-0 border-b border-[#2d3329] bg-[#111510]/95 text-[#f8f1e3] shadow-[0_26px_70px_-42px_rgba(0,0,0,0.76)] backdrop-blur-xl"
              : isBiteRush
                ? "sticky top-0 border-b-4 border-[#ff6b2c] bg-white/95 shadow-[0_22px_60px_-34px_rgba(17,17,17,0.55)] backdrop-blur"
                : isVelaFashionHeader
                  ? "sticky top-0 border-b border-[#ebdfd6] bg-white/96 shadow-[0_14px_40px_-36px_rgba(18,18,18,0.16)] backdrop-blur"
                  : isEditorialSoftHeader
                    ? "sticky top-0 border-b border-[#ead8e0] bg-[linear-gradient(180deg,rgba(255,251,252,0.97),rgba(252,244,247,0.94))] shadow-[0_18px_56px_-40px_rgba(104,49,73,0.2)] backdrop-blur"
                    : isUtilityFrameHeader
                      ? "sticky top-0 border-b border-[#d8ccc0] bg-[linear-gradient(180deg,rgba(249,244,238,0.98),rgba(245,237,229,0.95))] shadow-[0_18px_56px_-42px_rgba(31,38,43,0.24)] backdrop-blur"
                      : isRetailDirectHeader
                        ? "sticky top-0 border-b border-[#eadfce] bg-[linear-gradient(180deg,rgba(255,253,248,0.98),rgba(252,247,240,0.96))] shadow-[0_18px_52px_-42px_rgba(18,18,18,0.18)] backdrop-blur"
                        : "sticky top-0 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        } ${
          isSoleaFemme
            ? "border-primary/10 bg-[linear-gradient(180deg,hsl(var(--background)/0.97),hsl(var(--secondary)/0.86))] shadow-[0_12px_40px_-30px_hsl(var(--primary)/0.55)]"
            : theme.id === "intruder-nft"
              ? "border-b border-primary/20 bg-background/80"
              : isFloatingDarkHeader
                ? "border-none bg-transparent shadow-none"
                : isCutlineClub ||
                    isVelaFashionHeader ||
                    isEditorialSoftHeader ||
                    isUtilityFrameHeader ||
                    isRetailDirectHeader
                  ? ""
                  : "bg-background/95"
        }`}
      >
        {/* Top Promo Bar (Specific to Zen Organic) */}
        {theme.id === "zen-organic" && (
          <div className="hidden md:flex items-center justify-between px-6 py-2.5 bg-[#1b4332] text-white text-[11px] font-medium tracking-wide">
            <div className="flex items-center gap-2">
              <span>
                {theme.direction === "rtl"
                  ? "اتصل بنا : +123-456-789"
                  : "Call Us : +123-456-789"}
              </span>
            </div>
            <div className="flex items-center gap-1 font-semibold opacity-90">
              <span>
                {theme.direction === "rtl"
                  ? "اشترك الآن واحصل على خصم 20٪ على طلبك الأول."
                  : "Sign up and GET 20% OFF for your first order."}
              </span>
              <Link
                to="/auth/register"
                className="text-lime-400 hover:text-white transition-colors underline underline-offset-2"
              >
                {theme.direction === "rtl" ? "سجل الآن" : "Sign up now"}
              </Link>
            </div>
            <div className="flex items-center gap-3 opacity-90">
              <a
                href="#"
                aria-label="Facebook"
                className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center cursor-pointer hover:bg-white hover:text-[#1b4332] transition-colors text-[10px]"
              >
                f
              </a>
              <a
                href="#"
                aria-label="Twitter"
                className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center cursor-pointer hover:bg-white hover:text-[#1b4332] transition-colors text-[10px]"
              >
                x
              </a>
              <a
                href="#"
                aria-label="Pinterest"
                className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center cursor-pointer hover:bg-white hover:text-[#1b4332] transition-colors text-[10px]"
              >
                P
              </a>
              <a
                href="#"
                aria-label="LinkedIn"
                className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center cursor-pointer hover:bg-white hover:text-[#1b4332] transition-colors text-[10px]"
              >
                in
              </a>
            </div>
          </div>
        )}

        {isCutlineClub && (
          <div className="border-b border-[#d9eb67]/18 bg-[#d9eb67] text-[#111510]">
            <div className="container hidden h-10 items-center justify-between gap-4 overflow-hidden px-4 md:flex md:px-6">
              <span className="inline-flex rounded-full bg-[#111510] px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-[#d9eb67]">
                Poster Mode
              </span>
              <div className="flex flex-1 items-center justify-end gap-3 overflow-hidden whitespace-nowrap text-[10px] font-black uppercase tracking-[0.26em]">
                {cutlineClubRailItems.map((item, index) => (
                  <React.Fragment key={item}>
                    {index > 0 ? <span className="opacity-35">/</span> : null}
                    <span>{item}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}

        {isClosetOs && (
          <div className="border-b border-[#d7cdbd] bg-[#eef3ed] text-[#22312d]">
            <div className="container hidden h-10 items-center justify-between gap-4 overflow-hidden px-4 md:flex md:px-6">
              <span className="inline-flex rounded-full bg-[#22312d] px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-[#fff8ee]">
                Closet Map
              </span>
              <div className="flex flex-1 items-center justify-end gap-3 overflow-hidden whitespace-nowrap text-[10px] font-black uppercase tracking-[0.26em]">
                {closetOsRailItems.map((item, index) => (
                  <React.Fragment key={item}>
                    {index > 0 ? <span className="opacity-35">/</span> : null}
                    <span>{item}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}

        {isEditorialSoftHeader && !isMinimal && (
          <div className="border-b border-[#efdee5] bg-[linear-gradient(180deg,rgba(255,252,252,0.92),rgba(253,244,247,0.88))] text-[#7b4f5f]">
            <div className="container hidden h-10 items-center justify-between gap-4 overflow-hidden px-4 md:flex md:px-6">
              <span className="inline-flex rounded-full border border-[#e8d3dc] bg-white/85 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#8f5168]">
                Style Edit
              </span>
              <div className="flex flex-1 items-center justify-end gap-3 overflow-hidden whitespace-nowrap text-[10px] font-black uppercase tracking-[0.22em]">
                {editorialHeaderRail.map((item, index) => (
                  <React.Fragment key={item}>
                    {index > 0 ? <span className="opacity-35">/</span> : null}
                    <span>{item}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}

        {isUtilityFrameHeader && !isMinimal && (
          <div className="border-b border-[#d9cec2] bg-[#f1e8de] text-[#4b3b30]">
            <div className="container hidden h-10 items-center justify-between gap-4 overflow-hidden px-4 md:flex md:px-6">
              <span className="inline-flex rounded-[0.8rem] border border-[#d4c5b7] bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#1f262b]">
                {headerRailLabel || "Utility Rail"}
              </span>
              <div className="flex flex-1 items-center justify-end gap-3 overflow-hidden whitespace-nowrap text-[10px] font-black uppercase tracking-[0.22em]">
                {utilityHeaderRail.map((item, index) => (
                  <React.Fragment key={item}>
                    {index > 0 ? <span className="opacity-35">/</span> : null}
                    <span>{item}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}

        {isRetailDirectHeader &&
          !isMinimal &&
          theme.header?.announcementText && (
            <div className="border-b border-[#eadfce] bg-[#171717] text-[#fff7ed]">
              <div className="container flex h-10 items-center justify-between gap-4 overflow-hidden px-4 text-[11px] font-semibold md:px-6">
                <span className="truncate">
                  {theme.header.announcementText}
                </span>
                <div className="hidden items-center gap-3 whitespace-nowrap md:flex">
                  {retailDirectRail.map((item, index) => (
                    <React.Fragment key={item}>
                      {index > 0 ? <span className="opacity-35">/</span> : null}
                      <span>{item}</span>
                    </React.Fragment>
                  ))}
                  {theme.header?.announcementLinkText &&
                  theme.header?.announcementLinkTo ? (
                    <Link
                      to={`${location.pathname}?to=${theme.header.announcementLinkTo}`}
                      className="rounded-full bg-[#f97316] px-3 py-1 text-[10px] font-black text-white transition-colors hover:bg-[#ea580c]"
                    >
                      {theme.header.announcementLinkText}
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          )}

        {isMarketplaceAvenueHeader && (
          <div className="hidden border-b border-[#e7e7e7] bg-white md:block">
            <div className="container flex h-9 items-center justify-between gap-4 px-4 text-[11px] text-[#777777] md:px-6">
              <div className="flex items-center gap-4">
                {marketplaceQuickLinks.map((action, index) => (
                  <React.Fragment key={`${action.label}-${index}`}>
                    {index > 0 ? <span className="text-[#d8d8d8]">|</span> : null}
                    <Link to={action.to} className="transition-colors hover:text-[#ad7d61]">
                      {action.label}
                    </Link>
                  </React.Fragment>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span className="uppercase tracking-[0.14em] text-[#a3a3a3]">خط ساخن 24/7</span>
                <span className="text-[12px] font-semibold text-[#333333]">
                  {(theme.footer && (theme.footer as { phoneText?: string }).phoneText) || '01000 000 000'}
                </span>
              </div>
            </div>
            <div className="container flex h-8 items-center gap-3 border-t border-[#f1f1f1] px-4 text-[11px] md:px-6">
              <span className="text-[#a3a3a3]">الأكثر بحثًا:</span>
              {marketplaceSearchTags.map((tag) => (
                <Link
                  key={tag}
                  to={`/shop?search=${encodeURIComponent(tag)}`}
                  className="rounded-full border border-[#ececec] px-2.5 py-[2px] text-[#666666] transition-colors hover:border-[#ad7d61] hover:text-[#ad7d61]"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div
          className={`container flex items-center justify-between px-4 md:px-6 ${
            isFloatingDarkHeader
              ? "h-24 border-b border-white/10"
              : isCutlineClub
                ? "h-24 border-b border-[#262c22]"
                : isBiteRush
                  ? "h-24"
                  : isVelaFashionHeader
                    ? "h-16"
                    : isEditorialSoftHeader
                      ? "h-24 border-b border-[#f0dde6]"
                      : isUtilityFrameHeader
                        ? "h-20 border-b border-[#ddd0c2]"
                        : isRetailDirectHeader
                          ? "h-20 border-b border-[#efe4d5]"
                          : "h-20 border-b border-border/50"
          }`}
        >
          {/* Left: Logo + Nav */}
          <div
            className={`flex items-center ${
              isKhemetFloatingDarkHeader
                ? "gap-6 lg:gap-7 xl:gap-10"
                : isFloatingDarkHeader
                  ? "gap-10"
                  : "gap-8"
            }`}
          >
            {/* Mobile menu toggle */}
            <button
              className={`md:hidden rounded-[var(--radius)] p-2 -ms-2 transition-colors ${
                isBiteRush
                  ? "text-[#171717] hover:bg-[#fff1ea]"
                  : isVelaFashionHeader
                    ? "text-[#171717] hover:bg-[#fff4ef]"
                    : isCutlineClub
                      ? "text-[#f8f1e3] hover:bg-white/[0.05] hover:text-[#d9eb67]"
                      : isFloatingDarkHeader
                        ? "text-white hover:bg-white/10"
                        : "hover:bg-muted"
              }`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
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
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" x2="20" y1="12" y2="12" />
                  <line x1="4" x2="20" y1="6" y2="6" />
                  <line x1="4" x2="20" y1="18" y2="18" />
                </svg>
              )}
            </button>

            {/* Logo */}
            <StorefrontHomeLink
              {...brandHomeLinkProps}
              className="flex items-center gap-2"
            >
              {displayLogoUrl ? (
                <img
                  src={displayLogoUrl}
                  alt={displayStoreName}
                  className="h-8 w-auto object-contain"
                />
              ) : isVelaFashionHeader ? (
                <span className="font-heading text-[1.12rem] font-black lowercase tracking-[-0.04em] text-[#171717] sm:text-[1.28rem]">
                  vela-fashion
                </span>
              ) : isCutlineClub ? (
                <>
                  <span className="grid h-11 w-11 place-items-center rounded-[1rem] border border-[#d9eb67]/45 bg-[#171b14] text-[11px] font-black uppercase tracking-[0.22em] text-[#d9eb67] shadow-[0_18px_44px_-28px_rgba(0,0,0,0.72)]">
                    05
                  </span>
                  <span className="flex flex-col text-start leading-none">
                    <span className="font-heading text-[1.12rem] font-black tracking-[0.04em] text-[#f8f1e3] sm:text-[1.25rem]">
                      {displayStoreName}
                    </span>
                    <span className="mt-1 text-[10px] font-black uppercase tracking-[0.32em] text-[#d9eb67]">
                      أحدث الموديلات
                    </span>
                  </span>
                </>
              ) : isClosetOs ? (
                <>
                  <span className="grid h-11 w-11 place-items-center rounded-[1rem] border border-[#d7cdbd] bg-[#eef3ed] text-[11px] font-black uppercase tracking-[0.22em] text-[#22312d] shadow-[0_18px_44px_-28px_rgba(34,49,45,0.18)]">
                    W1
                  </span>
                  <span className="flex flex-col text-start leading-none">
                    <span className="font-heading text-[1.12rem] font-black tracking-[0.04em] text-foreground sm:text-[1.25rem]">
                      {displayStoreName}
                    </span>
                    <span className="mt-1 text-[10px] font-black uppercase tracking-[0.32em] text-[#52685e]">
                      اختيارات الأسبوع
                    </span>
                  </span>
                </>
              ) : isBiteRush ? (
                <>
                  <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-white bg-[#dc2626] text-xl font-black italic text-white shadow-[0_18px_40px_-20px_rgba(220,38,38,0.9)]">
                    B
                  </span>
                  <span className="flex flex-col text-start leading-none">
                    <span className="font-heading text-[1.4rem] font-black italic text-[#171717]">
                      {displayStoreName}
                    </span>
                    <span className="mt-1 text-[10px] font-black uppercase tracking-[0.34em] text-[#ff6b2c]">
                      طلب سريع وساخن
                    </span>
                  </span>
                </>
              ) : (
                <span
                  className={`inline-flex items-center gap-2 font-heading tracking-tight ${
                    isEditorialSoftHeader
                      ? "flex-col items-start rounded-[1.2rem] border border-[#ecd8e1] bg-white/88 px-4 py-2 text-[#5c263b] shadow-[0_20px_52px_-38px_rgba(92,38,59,0.22)]"
                      : isUtilityFrameHeader
                        ? "rounded-[0.95rem] border border-[#d8ccc0] bg-white px-3.5 py-2 text-[#1f262b] shadow-[0_18px_42px_-34px_rgba(31,38,43,0.18)]"
                        : isVelaFashionHeader
                          ? "text-[1.12rem] font-black lowercase tracking-[-0.04em] text-[#171717] sm:text-[1.26rem]"
                          : isFashionRetailHeader
                            ? "text-[1.15rem] font-semibold text-[#2c2426] sm:text-[1.3rem]"
                            : isRetailDirectHeader
                              ? "flex-col items-start rounded-[1rem] border border-[#151515] bg-white px-4 py-2 text-[#171717] shadow-[0_20px_48px_-36px_rgba(18,18,18,0.16)]"
                              : isSoleaFemme
                                ? "rounded-full border border-primary/10 bg-background/80 px-3 py-1.5 text-lg font-black shadow-sm"
                                : isIntruderNft
                                  ? "rounded-full border border-primary/20 bg-background/75 px-3.5 py-1.5 text-lg font-black uppercase tracking-[0.28em] text-foreground shadow-[0_0_24px_hsl(var(--primary)/0.18)]"
                                  : isFloatingDarkHeader
                                    ? "text-base font-black tracking-[0.02em] text-white sm:text-lg"
                                    : "text-xl font-bold text-foreground"
                  }`}
                >
                  {displayStoreName}
                  {isEditorialSoftHeader ? (
                    <span className="font-sans text-[10px] font-black uppercase tracking-[0.24em] text-[#a05170]">
                      خصومات نسائية
                    </span>
                  ) : null}
                  {isUtilityFrameHeader ? (
                    <span className="font-sans text-[10px] font-black uppercase tracking-[0.24em] text-[#f57a1d]">
                      {headerTagline || "كوتشيات رجالي"}
                    </span>
                  ) : null}
                  {isVelaFashionHeader ? (
                    <span className="font-sans text-[10px] font-bold uppercase tracking-[0.26em] text-[#d77a82]">
                      fashion store
                    </span>
                  ) : null}
                  {isFashionRetailHeader ? (
                    <span className="font-sans text-[10px] font-bold uppercase tracking-[0.24em] text-[#d05d4b]">
                      {isAtelierNova
                        ? "Atelier edit"
                        : isElegantLuxe
                          ? "صالون تحريري"
                          : "Everyday fashion"}
                    </span>
                  ) : null}
                  {isRetailDirectHeader ? (
                    <span className="font-sans text-[10px] font-black uppercase tracking-[0.24em] text-[#c15d12]">
                      طلب مباشر
                    </span>
                  ) : null}
                </span>
              )}
            </StorefrontHomeLink>

            {/* Desktop Nav */}
            {!isMinimal && (
              <nav
                className={`hidden md:flex items-center whitespace-nowrap ${
                  isKhemetFloatingDarkHeader ? "gap-0.5 lg:gap-1" : "gap-1"
                } ${isVelaFashionHeader ? "opacity-0 pointer-events-none w-0 overflow-hidden" : ""}`}
              >
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`rounded-[var(--radius)] font-medium transition-colors ${
                      isKhemetFloatingDarkHeader
                        ? "shrink-0 px-2.5 py-2 text-[13px] tracking-[0.01em] lg:px-3 lg:text-sm"
                        : "px-3 py-2 text-sm"
                    } ${
                      isActive(link.to)
                        ? isCutlineClub
                          ? "rounded-full border border-[#d9eb67]/60 bg-[#d9eb67] text-[#111510] shadow-[0_18px_48px_-30px_rgba(217,235,103,0.55)]"
                          : isBiteRush
                            ? "rounded-full bg-[#fff1ea] text-[#dc2626]"
                            : isEditorialSoftHeader
                              ? "rounded-full border border-[#ebd5de] bg-white text-[#8f5168] shadow-[0_18px_46px_-34px_rgba(104,49,73,0.2)]"
                              : isUtilityFrameHeader
                                ? "rounded-[0.9rem] border border-[#d8ccc0] bg-[#1f262b] text-white shadow-[0_18px_46px_-34px_rgba(31,38,43,0.28)]"
                                : isVelaFashionHeader
                                  ? "rounded-full bg-[#171717] text-white shadow-[0_18px_40px_-30px_rgba(23,23,23,0.18)]"
                                  : isFashionRetailHeader
                                    ? "rounded-full bg-[#2c2426] text-white shadow-[0_18px_40px_-30px_rgba(44,36,38,0.34)]"
                                    : isSoleaFemme
                                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/15"
                                      : isIntruderNft
                                        ? "border border-primary/25 bg-primary/10 text-primary shadow-[0_0_18px_hsl(var(--primary)/0.16)]"
                                        : isFloatingDarkHeader
                                          ? "text-white"
                                          : "bg-primary/10 text-primary"
                        : isCutlineClub
                          ? "rounded-full border border-transparent text-[#f8f1e3]/72 hover:border-[#2f342a] hover:bg-white/[0.03] hover:text-[#f8f1e3]"
                          : isBiteRush
                            ? "rounded-full text-[#171717] hover:bg-[#fff1ea] hover:text-[#dc2626]"
                            : isEditorialSoftHeader
                              ? "rounded-full text-[#7b5a67] hover:bg-white/85 hover:text-[#5c263b]"
                              : isUtilityFrameHeader
                                ? "rounded-[0.9rem] text-[#54473c] hover:bg-white hover:text-[#1f262b]"
                                : isVelaFashionHeader
                                  ? "rounded-full text-[#7e666d] hover:bg-[#fff4ef] hover:text-[#171717]"
                                  : isFashionRetailHeader
                                    ? "rounded-full text-[#6b5a5f] hover:bg-[#fff1ea] hover:text-[#2c2426]"
                                    : isSoleaFemme
                                      ? "text-muted-foreground hover:bg-background hover:text-foreground"
                                      : isIntruderNft
                                        ? "border border-transparent text-muted-foreground hover:border-primary/15 hover:bg-muted/50 hover:text-foreground"
                                        : isFloatingDarkHeader
                                          ? "text-white/70 hover:bg-white/8 hover:text-white"
                                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            )}
          </div>

          {/* Right: Search + Cart */}
          <div className="flex items-center gap-2">
            {!isMinimal && headerActions.length > 0 && (
              <div className="hidden md:flex items-center gap-2">
                {headerActions.map((action) => (
                  <Link
                    key={`${action.label}-${action.href}`}
                    to={action.href}
                    className={
                      action.style === "primary"
                        ? isCutlineClub
                          ? "inline-flex items-center justify-center rounded-full bg-[#d9eb67] px-5 py-2.5 text-sm font-black text-[#111510] shadow-[0_20px_50px_-28px_rgba(217,235,103,0.62)] transition-all hover:-translate-y-0.5 hover:brightness-105"
                          : isBiteRush
                            ? "inline-flex items-center justify-center rounded-full bg-[#171717] px-5 py-2.5 text-sm font-black text-white shadow-[0_18px_48px_-24px_rgba(23,23,23,0.7)] transition-all hover:-translate-y-0.5 hover:bg-[#dc2626]"
                            : isFloatingDarkHeader
                              ? "inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-black text-[#0b1670] shadow-[0_24px_70px_-40px_rgba(255,255,255,0.95)] transition-transform hover:-translate-y-0.5"
                              : "inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5"
                        : action.style === "outline"
                          ? isCutlineClub
                            ? "inline-flex items-center justify-center rounded-full border border-[#2f342a] bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-[#f8f1e3] transition-colors hover:border-[#d9eb67] hover:text-[#d9eb67]"
                            : isBiteRush
                              ? "inline-flex items-center justify-center rounded-full border border-[#171717]/10 bg-white px-5 py-2.5 text-sm font-semibold text-[#171717] transition-colors hover:border-[#ff6b2c] hover:text-[#dc2626]"
                              : isFloatingDarkHeader
                                ? "inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/88 backdrop-blur transition-colors hover:bg-white/10"
                                : "inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                          : isCutlineClub
                            ? "inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-[#f8f1e3] transition-colors hover:text-[#d9eb67]"
                            : isBiteRush
                              ? "inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-[#171717] transition-colors hover:text-[#dc2626]"
                              : isFloatingDarkHeader
                                ? "inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:text-white"
                                : "inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:text-primary"
                    }
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            )}
            {!isMinimal ? (
              <>
                {/* Search */}
                {!isIntruderNft && showSearch && (
                  <button
                    onClick={() => setSearchOpen(true)}
                    className={`rounded-full p-2 transition-colors ${
                      isBiteRush
                        ? "text-[#171717] hover:bg-[#fff1ea] hover:text-[#dc2626]"
                        : isCutlineClub
                          ? "text-[#f8f1e3]/78 hover:bg-white/[0.05] hover:text-[#d9eb67]"
                          : isEditorialSoftHeader
                            ? "text-[#7b5a67] hover:bg-white/80 hover:text-[#5c263b]"
                            : isUtilityFrameHeader
                              ? "text-[#54473c] hover:bg-white hover:text-[#1f262b]"
                              : isVelaFashionHeader
                                ? "text-[#6c575e] hover:bg-[#fff4ef] hover:text-[#171717]"
                                : isFashionRetailHeader
                                  ? "text-[#7b6b70] hover:bg-[#fff1ea] hover:text-[#2c2426]"
                                  : isSoleaFemme
                                    ? "text-muted-foreground hover:bg-background hover:text-foreground"
                                    : isFloatingDarkHeader
                                      ? "text-white/70 hover:bg-white/10 hover:text-white"
                                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    aria-label={
                      theme.direction === "rtl" ? "بحث" : "Search products"
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
                )}

                <LanguageSwitcher />

                {/* Cart */}
                {!isIntruderNft && showCart && (
                  <button
                    onClick={() => setIsOpen(true)}
                    className={`relative rounded-full p-2 transition-colors ${
                      isBiteRush
                        ? "text-[#171717] hover:bg-[#fff1ea] hover:text-[#dc2626]"
                        : isCutlineClub
                          ? "text-[#f8f1e3]/78 hover:bg-white/[0.05] hover:text-[#d9eb67]"
                          : isEditorialSoftHeader
                            ? "text-[#7b5a67] hover:bg-white/80 hover:text-[#5c263b]"
                            : isUtilityFrameHeader
                              ? "text-[#54473c] hover:bg-white hover:text-[#1f262b]"
                              : isVelaFashionHeader
                                ? "text-[#6c575e] hover:bg-[#fff4ef] hover:text-[#171717]"
                                : isFashionRetailHeader
                                  ? "text-[#7b6b70] hover:bg-[#fff1ea] hover:text-[#2c2426]"
                                  : isSoleaFemme
                                    ? "text-muted-foreground hover:bg-background hover:text-foreground"
                                    : isFloatingDarkHeader
                                      ? "text-white/70 hover:bg-white/10 hover:text-white"
                                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
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
                    {totalItems > 0 && (
                      <span className="absolute -top-0.5 -end-0.5 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                        {totalItems}
                      </span>
                    )}
                  </button>
                )}
              </>
            ) : (
              <>
                {showCart && isCheckoutPath && !isIntruderNft ? (
                  <button
                    onClick={() => setIsOpen(true)}
                    className="relative rounded-full border border-primary/10 bg-secondary/50 p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
                    {totalItems > 0 && (
                      <span className="absolute -top-0.5 -end-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {totalItems}
                      </span>
                    )}
                  </button>
                ) : null}
                <div className="hidden md:flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest px-4 py-2 border border-primary/10 rounded-full bg-secondary/50">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary"
                  >
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  {theme.direction === "rtl" ? "دفع آمن" : "Secure Checkout"}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        {mobileMenuOpen && (
          <div
            className={`animate-in slide-in-from-top-2 space-y-1 border-t px-4 py-3 md:hidden ${
              isBiteRush
                ? "border-[#ffd2bd] bg-white/98"
                : isCutlineClub
                  ? "border-[#2d3329] bg-[#111510]/98 text-[#f8f1e3]"
                  : isEditorialSoftHeader
                    ? "border-[#ecd8e1] bg-[linear-gradient(180deg,rgba(255,251,252,0.98),rgba(252,243,246,0.97))]"
                    : isUtilityFrameHeader
                      ? "border-[#d9cec2] bg-[linear-gradient(180deg,rgba(249,244,238,0.98),rgba(245,237,229,0.98))] text-[#1f262b]"
                      : isFashionRetailHeader
                        ? "border-[#f0ddd4] bg-[linear-gradient(180deg,rgba(255,252,250,0.98),rgba(255,245,240,0.97))] text-[#2c2426]"
                        : isRetailDirectHeader
                          ? "border-[#efe4d5] bg-[linear-gradient(180deg,rgba(255,253,248,0.98),rgba(252,247,240,0.97))] text-[#171717]"
                          : isSoleaFemme
                            ? "border-primary/10 bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--secondary)/0.68))]"
                            : isFloatingDarkHeader
                              ? "border-white/10 bg-[#09113c]/95 backdrop-blur-xl"
                              : "border-border bg-background"
            }`}
          >
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2.5 text-sm font-medium rounded-[var(--radius)] transition-colors ${
                  isActive(link.to)
                    ? isCutlineClub
                      ? "rounded-full border border-[#d9eb67]/60 bg-[#d9eb67] text-[#111510]"
                      : isBiteRush
                        ? "rounded-full bg-[#fff1ea] text-[#dc2626]"
                        : isEditorialSoftHeader
                          ? "rounded-full bg-white text-[#8f5168]"
                          : isUtilityFrameHeader
                            ? "rounded-[0.9rem] bg-[#1f262b] text-white"
                            : isFashionRetailHeader
                              ? "rounded-full bg-[#2c2426] text-white"
                              : isSoleaFemme
                                ? "bg-primary text-primary-foreground"
                                : isFloatingDarkHeader
                                  ? "bg-white/10 text-white"
                                  : "bg-primary/10 text-primary"
                    : isCutlineClub
                      ? "rounded-full text-[#f8f1e3]/74 hover:bg-white/[0.04] hover:text-[#d9eb67]"
                      : isBiteRush
                        ? "rounded-full text-[#171717] hover:bg-[#fff1ea] hover:text-[#dc2626]"
                        : isEditorialSoftHeader
                          ? "rounded-full text-[#7b5a67] hover:bg-white/80 hover:text-[#5c263b]"
                          : isUtilityFrameHeader
                            ? "rounded-[0.9rem] text-[#54473c] hover:bg-white hover:text-[#1f262b]"
                            : isFashionRetailHeader
                              ? "rounded-full text-[#6b5a5f] hover:bg-white hover:text-[#2c2426]"
                              : isSoleaFemme
                                ? "text-muted-foreground hover:bg-background hover:text-foreground"
                                : isFloatingDarkHeader
                                  ? "text-white/72 hover:bg-white/8 hover:text-white"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {headerActions.map((action) => (
              <Link
                key={`mobile-${action.label}-${action.href}`}
                to={action.href}
                onClick={() => setMobileMenuOpen(false)}
                className={
                  action.style === "primary"
                    ? isCutlineClub
                      ? "mt-2 block rounded-full bg-[#d9eb67] px-4 py-3 text-center text-sm font-black text-[#111510]"
                      : isBiteRush
                        ? "mt-2 block rounded-full bg-[#171717] px-4 py-3 text-center text-sm font-black text-white"
                        : "mt-2 block rounded-full bg-white px-4 py-3 text-center text-sm font-black text-[#0b1670]"
                    : isCutlineClub
                      ? "block px-3 py-2.5 text-sm font-medium text-[#f8f1e3]"
                      : isBiteRush
                        ? "block px-3 py-2.5 text-sm font-medium text-[#171717]"
                        : "block px-3 py-2.5 text-sm font-medium text-white/80"
                }
              >
                {action.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      <StorefrontSearchOverlay
        searchOpen={searchOpen}
        themeDirection={theme.direction}
        query={query}
        setQuery={setQuery}
        closeSearchOverlay={closeSearchOverlay}
        results={results}
        isLoading={isLoading}
        moreResultsPath={moreResultsPath}
      />
    </>
  );
};
