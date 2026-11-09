import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useStorefrontTheme } from "../../engine/ThemeProvider";
import { useStorefrontSettings } from "../../hooks/useStorefrontSettings";
import { useCartStore } from "../../store/useCartStore";
import {
  buildStorefrontPath,
  getStorefrontProductRouteKey,
} from "../../utils/paths";
import { formatStorefrontCurrency } from "../../utils/currency";
import { formatMoney } from "../../utils/localeFormat";
import {
  getStorefrontMarketplaceAppSettings,
  isStorefrontMarketplaceAppEnabled,
} from "../../utils/marketplaceApps";
import {
  shouldStorefrontForceDocumentNavigation as shouldStorefrontHeaderForceDocumentNavigation,
  isKhemetLuxeTheme,
} from "../../utils/navigationGuards";
import { parsePositiveNumber } from "./storefrontHeaderHelpers";
import type {
  StorefrontHeaderController,
  StorefrontHeaderProps,
} from "./storefrontHeaderTypes";
import type { StorefrontGlobalHeaderConfig } from "../../studio/StudioHeaderFooterPanel";

export const useStorefrontHeaderController = (
  props: StorefrontHeaderProps,
): StorefrontHeaderController => {
  const { isMinimal = false, search, globalHeader: propGlobalHeader } = props;
  const { theme } = useStorefrontTheme();
  const { settings } = useStorefrontSettings();

  const effectiveGlobalHeader = useMemo<StorefrontGlobalHeaderConfig | undefined>(() => {
    if (propGlobalHeader) return propGlobalHeader;
    const fromTheme =
      (theme as any)?.global?.header ||
      (theme as any)?.designTokens?.global?.header;
    const fromSettings =
      (settings?.storefront?.designTokens as any)?.global?.header ||
      (settings?.designTokens as any)?.global?.header ||
      (settings?.storefront?.settings?.["designTokens"] as any)?.global?.header;
    return fromTheme || fromSettings;
  }, [propGlobalHeader, theme, settings]);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const {
    query = "",
    setQuery = () => {},
    results = [],
    isLoading = false,
    isOpen: searchOpen = false,
    setIsOpen: setSearchOpen = () => {},
  } = search || ({} as any);

  const location = useLocation();
  const navigate = useNavigate();
  const setIsOpen = useCartStore((s) => s.setIsOpen);
  const totalItems = useCartStore((s) =>
    s.items.reduce((n, i) => n + i.quantity, 0),
  );

  const isSoleaFemme = theme.id === "solea-femme";
  const isIntruderNft = theme.id === "intruder-nft";
  const isBiteRush = theme.id === "restaurant-demo";
  const isCutlineClub = theme.id === "cutline-club";
  const isClosetOs = theme.id === "closet-os";
  const isAtelierNova = theme.id === "atelier-nova";
  const isElegantLuxe = theme.id === "elegant-luxe";
  const isKhemetLuxe = isKhemetLuxeTheme(theme.id);

  const isPcHub = theme.id === "pc-hub-eg";
  const isFastlyTheme = theme.id === "fastly-eg";
  const isMensGroomingPro = theme.id === "mens-grooming-pro";
  const isGracefulTheme = theme.id === "soft-graceful";
  const headerVariant =
    theme.header?.variant?.trim().toLowerCase() || "default";
  const isEditorialSoftHeader = headerVariant === "editorial-soft";
  const isUtilityFrameHeader = headerVariant === "utility-frame";
  const isRetailDirectHeader = headerVariant === "retail-direct";
  const isMarketplaceBazaarHeader = headerVariant === "marketplace-bazaar";
  const isDigitalCommandHeader = headerVariant === "digital-command";
  const isFashionRetailHeader = headerVariant === "fashion-retail";
  const isButcherAtelierHeader = headerVariant === "butcher-atelier";
  const isRedlineAutoHeader =
    theme.id === "redline-auto" || headerVariant === "automotive-chassis";
  const isLegacyDefaultOldHeader = headerVariant === "legacy-default-old";
  const isVelaFashionHeader = headerVariant === "vela-fashion";
  const isElessiPackTheme = theme.id?.startsWith("elessi-") === true;
  const isThemePreview = new URLSearchParams(location.search).has(
    "previewTheme",
  );
  const normalizedPath = location.pathname.replace(/\/+$/, "") || "/";
  const isHomePath =
    normalizedPath === "/" || normalizedPath.endsWith("/store");
  const isVelaInnerPath = isVelaFashionHeader && !isHomePath;
  const isCheckoutPath = normalizedPath.endsWith("/checkout");
  const isKhemetUnifiedHeaderPath = isKhemetLuxe && !isMinimal;
  const isProductDetailPath = Boolean(
    getStorefrontProductRouteKey(normalizedPath),
  );
  const shouldForceDocumentNavigation =
    shouldStorefrontHeaderForceDocumentNavigation(theme.id, isProductDetailPath);
  const isFloatingDarkHeader =
    !isBiteRush &&
    theme.header?.variant === "floating-dark" &&
    (theme.header?.transparentOnHome ?? true) &&
    isHomePath;
  const isKhemetFloatingDarkHeader = isKhemetLuxe && isFloatingDarkHeader;
  const brandHomeLinkProps = {
    forceDocumentNavigation: shouldForceDocumentNavigation,
    pathname: location.pathname,
    search: location.search,
  };

  const displayStoreName =
    (typeof effectiveGlobalHeader?.logoText === "string" &&
      effectiveGlobalHeader.logoText.trim()) ||
    (isThemePreview && theme.header?.brandName) ||
    settings?.storefront?.settings?.storeName ||
    theme.header?.brandName ||
    settings?.company?.name ||
    theme.name;

  const storefrontCurrency =
    settings?.storefront?.settings?.currency ||
    settings?.company?.currency ||
    "EGP";
  const conversionEnabled = isStorefrontMarketplaceAppEnabled(
    settings,
    "conversion-suite",
  );
  const conversionSettings = getStorefrontMarketplaceAppSettings(
    settings,
    "conversion-suite",
  );
  const conversionModules =
    (conversionSettings["modules"] as Record<string, unknown> | undefined) ||
    {};
  const conversionThresholds =
    (conversionSettings["thresholds"] as Record<string, unknown> | undefined) ||
    {};
  const khemetFreeShippingThreshold = parsePositiveNumber(
    conversionThresholds["freeShippingAmount"],
    0,
  );
  const showKhemetFreeShippingSignal =
    isKhemetLuxe &&
    conversionEnabled &&
    conversionModules["freeShippingBar"] !== false &&
    khemetFreeShippingThreshold > 0;
  const khemetFreeShippingThresholdText =
    storefrontCurrency === "EGP"
      ? formatMoney(khemetFreeShippingThreshold, {
          currency: "EGP",
          symbol: "جنيه",
        })
      : formatStorefrontCurrency(
          khemetFreeShippingThreshold,
          storefrontCurrency,
        );
  const khemetUtilityShopPath = buildStorefrontPath(
    location.pathname,
    "/shop",
    location.search,
  );
  const hideUtilityBar = settings?.storefrontSettings?.hideUtilityBar === true;

  const displayLogoUrl =
    theme.header?.logoUrl ||
    settings?.storefront?.settings?.["logoUrl"] ||
    (settings?.company?.logo ? settings.company.logo : null);

  const menuFromDesignTokens =
    (settings?.storefront?.settings?.["designTokens"] as any)?.navigation?.menu ||
    (settings?.["designTokens"] as any)?.navigation?.menu ||
    (settings?.storefront?.designTokens as any)?.navigation?.menu;

  const globalMenu = Array.isArray(effectiveGlobalHeader?.menu) ? effectiveGlobalHeader.menu : undefined;
  const resolvedNavItems =
    globalMenu !== undefined
      ? globalMenu.slice(0, 8).map((m: any) => ({ label: m.label || "", to: m.href || m.to || m.url || "/" }))
      : Array.isArray(theme.header?.navigation) && theme.header.navigation.length > 0
      ? theme.header.navigation
      : Array.isArray(menuFromDesignTokens) && menuFromDesignTokens.length > 0
      ? menuFromDesignTokens.map((m: any) => ({ label: m.label || "", to: m.url || m.to || "/" }))
      : null;

  // PAGE-1: Filter out draft pages from navigation menu
  const isDraftPage = (to: string | undefined): boolean => {
    if (!to) return false;
    const clean = to.trim().split("?")[0].split("#")[0];
    const stripped = clean.replace(/^\/+/, "");
    const withoutPages = stripped.replace(/^pages\//, "");

    const allPages: Record<string, any> = {
      ...(theme?.pages || {}),
      ...(((settings?.storefront?.settings as any)?.designTokens?.pages) || {}),
      ...(((settings as any)?.designTokens?.pages) || {}),
    };

    const isHome = clean === '/' || clean === '' || stripped === '' || stripped === 'home' || withoutPages === 'home';
    const keysToCheck = [isHome ? 'home' : null, stripped, withoutPages, clean, clean.replace(/\/$/, '').split('/').pop()].filter(Boolean);
    for (const key of keysToCheck) {
      if (key && allPages[key] && allPages[key].status === "draft") {
        return true;
      }
    }
    return false;
  };

  const filteredNavItems = resolvedNavItems?.filter((nav) => !isDraftPage(nav.to));

  const navLinks = (
    filteredNavItems
      ? filteredNavItems.map((nav) => ({
    label: nav.label,
    to: buildStorefrontPath(location.pathname, nav.to, location.search),
  }))
      : [
    {
      label: theme.direction === "rtl" ? "الرئيسية" : "Home",
      to: buildStorefrontPath(location.pathname, "/", location.search),
    },
    {
      label: theme.direction === "rtl" ? "المتجر" : "Shop",
      to: buildStorefrontPath(location.pathname, "/shop", location.search),
    },
  ]).filter((link) => !isDraftPage(link.to));

  const isSticky = effectiveGlobalHeader?.sticky !== false;
  const announcementBarElement = useMemo(() => {
    const ann = effectiveGlobalHeader?.announcement;
    if (ann && typeof ann.enabled === "boolean") {
      if (!ann.enabled || !ann.text?.trim()) return null;
      return (
        <div
          data-testid="storefront-announcement-bar"
          className="w-full text-center py-2 px-4 text-xs font-semibold select-none transition-colors z-50"
          style={{
            backgroundColor: ann.bg || "#000000",
            color: ann.fg || "#ffffff",
          }}
        >
          <div className="container mx-auto flex items-center justify-center">
            <span>{ann.text}</span>
          </div>
        </div>
      );
    }
    return null;
  }, [effectiveGlobalHeader?.announcement]);

  const currentCategory = new URLSearchParams(location.search).get("category");
  const parseThemePath = (value: string) => {
    try {
      return new URL(value, "http://localhost");
    } catch {
      return null;
    }
  };

  const isKhemetInnerNavActive = (href: string) => {
    const parsed = parseThemePath(href);
    if (!parsed) return false;
    const targetPath = parsed.pathname.replace(/\/+$/, "") || "/";
    const targetCategory = parsed.searchParams.get("category");

    if (targetPath.endsWith("/sale")) {
      return normalizedPath.endsWith("/sale");
    }

    if (!normalizedPath.endsWith("/shop")) {
      return false;
    }

    if (targetCategory) {
      return currentCategory === targetCategory;
    }

    return currentCategory === null;
  };

  const headerActions = (theme.header?.actions || []).map((action) => ({
    ...action,
    href: buildStorefrontPath(location.pathname, action.to, location.search),
  }));

  const legacyMenuLinks = [
    ...navLinks,
    ...(theme.footer?.legalLinks || []).map((link) => ({
      label: link.label,
      to: buildStorefrontPath(location.pathname, link.to, location.search),
    })),
  ].filter(
    (link, index, links) =>
      links.findIndex(
        (candidate) =>
          candidate.to === link.to && candidate.label === link.label,
      ) === index,
  );

  const showSearch =
    typeof effectiveGlobalHeader?.showSearch === "boolean"
      ? effectiveGlobalHeader.showSearch
      : theme.header?.showSearch !== false;
  const showCart = theme.header?.showCart !== false;
  const showDigitalCommandMobileSearch =
    showSearch && !(isElessiPackTheme && isProductDetailPath);
  const headerTagline =
    typeof theme.header?.tagline === "string" && theme.header.tagline.trim()
      ? theme.header.tagline.trim()
      : null;
  const headerRailLabel =
    typeof theme.header?.railLabel === "string" && theme.header.railLabel.trim()
      ? theme.header.railLabel.trim()
      : null;

  const customHeaderRailItems = useMemo(
    () =>
      Array.isArray(theme.header?.railItems)
        ? theme.header.railItems
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean)
        : [],
    [theme.header?.railItems],
  );

  const cutlineClubRailItems = useMemo(
    () =>
      theme.direction === "rtl"
        ? ["POSTER MODE 05", "دروب أسبوعي", "شحن 48 ساعة", "مقاسات تتحرك بسرعة"]
        : [
            "POSTER MODE 05",
            "Weekly drop",
            "48h shipping",
            "Fast-moving sizes",
          ],
    [theme.direction],
  );

  const closetOsRailItems = useMemo(
    () =>
      theme.direction === "rtl"
        ? ["WEEK MAP", "لبسات تتكرر", "غسيل بارد", "شحن 48 ساعة"]
        : ["WEEK MAP", "Repeat wear", "Wash cold", "48h shipping"],
    [theme.direction],
  );

  const editorialHeaderRail = useMemo(
    () =>
      theme.direction === "rtl"
        ? ["دروب محسوبة", "صور حقيقية", "تبديل أسهل", "مقاسات أوضح"]
        : ["Curated drops", "Real imagery", "Easy exchanges", "Clear sizing"],
    [theme.direction],
  );

  const utilityHeaderRail = useMemo(() => {
    if (customHeaderRailItems.length > 0) {
      return customHeaderRailItems;
    }

    return theme.direction === "rtl"
      ? ["جاهز للحسم", "مقاسات مباشرة", "شحن سريع", "قرار أسرع"]
      : [
          "Ready to move",
          "Straight sizing",
          "Fast shipping",
          "Quicker decision",
        ];
  }, [customHeaderRailItems, theme.direction]);

  const retailDirectRail = useMemo(
    () =>
      theme.direction === "rtl"
        ? ["شحن مجاني", "خصومات السنة الجديدة", "طلب سريع من صفحة المنتج"]
        : ["Free shipping", "New year discounts", "Direct product-page order"],
    [theme.direction],
  );

  const digitalCommandRail = useMemo(
    () =>
      theme.direction === "rtl"
        ? ["شحن 48 ساعة", "مواصفات أوضح", "ضمان موثق", "ترقيات سريعة"]
        : [
            "48h shipping",
            "Clearer specs",
            "Documented warranty",
            "Fast upgrades",
          ],
    [theme.direction],
  );

  const isActive = (path: string) => {
    const current = location.pathname;
    return (
      current === path || (path.endsWith("/") && current === path.slice(0, -1))
    );
  };

  const closeSearchOverlay = () => {
    setSearchOpen(false);
    setQuery("");
  };

  const moreResultsPath = buildStorefrontPath(
    location.pathname,
    `/shop?search=${encodeURIComponent(query.trim())}`,
    location.search,
  );

  const handlePcHubSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate(
      query.trim()
        ? moreResultsPath
        : buildStorefrontPath(location.pathname, "/shop", location.search),
    );
  };

  return {
    theme,
    settings,
    isMinimal,
    search,
    effectiveGlobalHeader,
    location,
    query,
    setQuery,
    results,
    isLoading,
    searchOpen,
    setSearchOpen,
    closeSearchOverlay,
    moreResultsPath,
    showSearch,
    handlePcHubSearchSubmit,
    mobileMenuOpen,
    setMobileMenuOpen,
    totalItems,
    isOpen: searchOpen,
    setIsOpen,
    showCart,
    brandHomeLinkProps,
    displayStoreName,
    displayLogoUrl,
    navLinks,
    shouldForceDocumentNavigation,
    isCheckoutPath,
    isActive,
    isGracefulTheme,
    isMensGroomingPro,
    isRedlineAutoHeader,
    isKhemetLuxe,
    isKhemetUnifiedHeaderPath,
    isButcherAtelierHeader,
    isLegacyDefaultOldHeader,
    isPcHub,
    isDigitalCommandHeader,
    isVelaFashionHeader,
    isFastlyTheme,
    isSoleaFemme,
    isIntruderNft,
    isBiteRush,
    isCutlineClub,
    isClosetOs,
    isAtelierNova,
    isElegantLuxe,
    isEditorialSoftHeader,
    isUtilityFrameHeader,
    isRetailDirectHeader,
    isMarketplaceBazaarHeader,
    isFashionRetailHeader,
    isFloatingDarkHeader,
    isKhemetFloatingDarkHeader,
    isVelaInnerPath,
    showDigitalCommandMobileSearch,
    isKhemetInnerNavActive,
    hideUtilityBar,
    showKhemetFreeShippingSignal,
    khemetFreeShippingThresholdText,
    khemetUtilityShopPath,
    headerRailLabel,
    headerTagline,
    utilityHeaderRail,
    cutlineClubRailItems,
    closetOsRailItems,
    editorialHeaderRail,
    retailDirectRail,
    digitalCommandRail,
    headerActions,
    legacyMenuLinks,
    isSticky,
    announcementBarElement,
  };
};
