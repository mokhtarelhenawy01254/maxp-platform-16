import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("storefront runtime imports", () => {
  it("keeps marketplace preview data out of the production storefront startup path", () => {
    const guardedFiles = [
      "src/storefront/StorefrontShell.tsx",
      "src/storefront/components/CartDrawer.tsx",
      "src/storefront/components/CartUpsellHost.tsx",
      "src/storefront/components/GlobalConversionHost.tsx",
      "src/storefront/hooks/useCategories.ts",
      "src/storefront/hooks/useProduct.ts",
      "src/storefront/hooks/useProductReviews.ts",
      "src/storefront/hooks/useProducts.ts",
      "src/storefront/hooks/useStorefrontFacebookTracking.ts",
      "src/storefront/hooks/useStorefrontSettings.ts",
      "src/storefront/hooks/useStorefrontVisitTracking.ts",
      "src/storefront/preview/previewContext.ts",
      "src/storefront/sections/BoughtTogetherSection.tsx",
      "src/storefront/sections/FeaturedCollections.tsx",
      "src/storefront/sections/PdpQuickOrderForm.tsx",
      "src/storefront/sections/ProductInfo.tsx",
      "src/storefront/sections/RelatedProducts.tsx",
      "src/storefront/services/storefrontAnalytics.ts",
      "src/storefront/services/storefrontProducts.ts",
      "src/storefront/utils/marketplaceApps.ts",
      "src/utils/storefrontApi.ts",
    ];

    guardedFiles.forEach((filePath) => {
      expect(readSource(filePath), filePath).not.toMatch(
        /from\s+["'][^"']*marketplaceSampleData["']/,
      );
    });
  });

  it("keeps admin-only and Base UI modules out of public product startup", () => {
    expect(readSource("src/utils/storefrontApi.ts")).not.toMatch(
      /from\s+["']\.\.\/services\/apiClient["']/,
    );
    expect(readSource("src/storefront/hooks/useProduct.ts")).not.toMatch(
      /from\s+["']\.\.\/\.\.\/(?:config|utils\/tokenManager)["']/,
    );
    expect(
      readSource("src/storefront/sections/ProductGallery.tsx"),
    ).not.toContain("../../components/ui/dialog");
    expect(
      readSource("src/storefront/hooks/useStorefrontVisitTracking.ts"),
    ).not.toMatch(/from\s+["']\.\.\/\.\.\/services\/analyticsService["']/);
    expect(
      readSource("src/storefront/hooks/useStorefrontFacebookTracking.ts"),
    ).not.toMatch(/from\s+["']\.\.\/\.\.\/services\/analyticsService["']/);
    expect(
      readSource("src/storefront/services/storefrontAnalytics.ts"),
    ).not.toMatch(/from\s+["']\.\.\/\.\.\/services\/(?:analyticsService|apiClient)["']/);
    expect(
      readSource("src/storefront/services/storefrontAnalytics.ts"),
    ).not.toMatch(/from\s+["']\.\.\/\.\.\/utils\/tokenManager["']/);
    expect(
      readSource("src/storefront/hooks/useStorefrontSettings.ts"),
    ).toContain("buildPreviewStorefrontSettingsFallback = import.meta.env.PROD");
  });

  it("keeps storefront font loading and deferred chunks out of the first waterfall", () => {
    const indexHtml = readSource("index.html");
    const mainSource = readSource("src/main.tsx");
    const themeProviderSource = readSource("src/storefront/engine/ThemeProvider.tsx");
    const themeDefaultsSource = readSource("src/storefront/engine/themeDefaults.ts");
    const runtimeThemeResolverSource = readSource(
      "src/storefront/engine/runtimeThemeResolver.ts",
    );
    const themeResolverCoreSource = readSource(
      "src/storefront/engine/themeResolverCore.ts",
    );
    const marketplaceAppsSource = readSource(
      "src/storefront/utils/marketplaceApps.ts",
    );
    const themesIndexSource = readSource("src/storefront/themes/index.ts");
    const bootstrapSource = readSource("src/storefront/StorefrontBootstrap.tsx");
    const storefrontShellSource = readSource("src/storefront/StorefrontShell.tsx");
    const conversionHostsSource = readSource(
      "src/storefront/hooks/useDeferredStorefrontConversionHosts.ts",
    );
    const viteConfigSource = readSource("vite.config.ts");

    expect(indexHtml).not.toContain("Inter:wght@400;500;600;700");
    expect(indexHtml).not.toContain("Cinzel:wght@400;700");
    expect(mainSource).toContain("ADMIN_CRITICAL_GOOGLE_FONTS_ID");
    expect(themeProviderSource).toContain("STOREFRONT_THEME_FONT_WEIGHTS = '400;600;700;900'");
    expect(themeProviderSource).toContain("STOREFRONT_THEME_FONT_DISPLAY = 'swap'");
    expect(themeProviderSource).not.toContain("'inter', 'ibm plex sans arabic'");
    expect(themeDefaultsSource).toContain("DEFAULT_STOREFRONT_THEME_ID");
    expect(runtimeThemeResolverSource).toContain("./themeDefaults");
    expect(runtimeThemeResolverSource).not.toContain("../themes/themeIds");
    expect(themeProviderSource).toContain("resolveRuntimeStorefrontTheme");
    expect(themeProviderSource).not.toMatch(/from\s+["']\.\/themeResolver["']/);
    expect(runtimeThemeResolverSource).toContain("khemet-luxe-eg.json?url");
    expect(runtimeThemeResolverSource).toContain("modern-minimal.json?url");
    expect(runtimeThemeResolverSource).not.toMatch(/from\s+["']\.\.\/themes["']/);
    expect(runtimeThemeResolverSource).not.toContain('import("../themes")');
    expect(themeResolverCoreSource).not.toMatch(/from\s+["']\.\.\/themes["']/);
    expect(themesIndexSource).not.toContain("../utils/pharmacyThemes");
    expect(storefrontShellSource).toContain("blockUntilResolved");
    expect(storefrontShellSource).not.toContain("./utils/pharmacyThemes");
    expect(marketplaceAppsSource).not.toContain("./pharmacyThemes");
    expect(bootstrapSource).not.toContain('import StorefrontShell from "./StorefrontShell"');
    expect(bootstrapSource).toContain('React.lazy(() => import("./StorefrontShell"))');
    expect(bootstrapSource).toContain("StorefrontSkeleton");
    expect(bootstrapSource).toContain("useDeferredStorefrontToaster");
    expect(bootstrapSource).toContain("STOREFRONT_TOASTER_IDLE_DELAY_MS = 8000");
    expect(bootstrapSource).toContain("STOREFRONT_TOASTER_INTENT_EVENTS");
    expect(bootstrapSource).toContain('"pointerdown"');
    expect(bootstrapSource).toContain('"touchstart"');
    expect(bootstrapSource).toContain('"wheel"');
    expect(bootstrapSource).not.toContain('addEventListener("scroll"');
    expect(conversionHostsSource).toContain(
      "STOREFRONT_CONVERSION_HOST_IDLE_DELAY_MS = 8000",
    );
    expect(conversionHostsSource).toContain(
      "STOREFRONT_CONVERSION_HOST_INTENT_EVENTS",
    );
    expect(conversionHostsSource).toContain('"pointerdown"');
    expect(conversionHostsSource).toContain('"touchstart"');
    expect(conversionHostsSource).toContain('"scroll"');
    expect(viteConfigSource).toContain("modulePreload");
    expect(viteConfigSource).toContain("STOREFRONT_DEFERRED_PRELOAD_CHUNKS");
    expect(viteConfigSource).toContain("filterStorefrontDeferredPreloads");
    expect(viteConfigSource).toContain("deps.some((dep)");
    expect(viteConfigSource).toContain("STOREFRONT_THEME_PRESET_MODULE_PATTERN");
    expect(viteConfigSource).toContain("STOREFRONT_THEME_DEFAULTS_MODULE_PATTERN");
    expect(viteConfigSource).toContain("STOREFRONT_RUNTIME_THEME_MODULE_PATTERN");
    expect(viteConfigSource).toContain("storefront-theme-runtime");
    expect(viteConfigSource).toContain("storefront-theme-presets");
    expect(viteConfigSource).toContain("vendor-ui-framework");
    expect(viteConfigSource).toContain("vendor-class-utils");
    expect(viteConfigSource).toMatch(
      /packageName === 'clsx' \|\|\s+packageName === 'tailwind-merge'[\s\S]*return 'vendor-class-utils'/,
    );
    expect(viteConfigSource).not.toContain(
      "clsx is a direct MUI runtime dependency",
    );
    expect(viteConfigSource).toContain("vendor-base-ui");
    expect(viteConfigSource).toContain("vendor-toast");
    expect(viteConfigSource).toContain("vendor-datepicker");
    expect(viteConfigSource).toContain("vendor-date-utils");
    expect(viteConfigSource).toContain("CartDrawer-");
    expect(viteConfigSource).not.toContain("/@mui/x-date-pickers/");
  });

  it("keeps cart and legacy collection modules deferred from the storefront shell", () => {
    const storefrontShellSource = readSource("src/storefront/StorefrontShell.tsx");
    const cartDrawerHostSource = readSource(
      "src/storefront/components/DeferredCartDrawerHost.tsx",
    );

    expect(storefrontShellSource).not.toMatch(
      /import\s+CartDrawer\s+from\s+["']\.\/components\/CartDrawer["']/,
    );
    expect(cartDrawerHostSource).toContain(
      'React.lazy(() => import("./CartDrawer"))',
    );
    expect(storefrontShellSource).toContain("DeferredCartDrawerHost");
    expect(cartDrawerHostSource).toContain(
      "STOREFRONT_CART_DRAWER_IDLE_DELAY_MS = 2500",
    );
    expect(storefrontShellSource).not.toMatch(
      /import\s+ProductGrid\s+from\s+["']\.\/sections\/ProductGrid["']/,
    );
    expect(storefrontShellSource).toMatch(
      /React\.lazy\(\s*\(\)\s*=>\s*import\(["']\.\/sections\/ProductGrid["']\),\s*\)/,
    );
  });

  it("keeps product-page motion and oversized hero images out of the critical path", () => {
    expect(readSource("src/storefront/sections/ProductInfo.tsx")).not.toContain(
      "framer-motion",
    );

    const gallerySource = readSource("src/storefront/sections/ProductGallery.tsx");
    const bootstrapSource = readSource("src/storefront/StorefrontBootstrap.tsx");

    expect(gallerySource).toContain("[520, 720, 960, 1280]");
    expect(gallerySource).toContain("(max-width: 767px) 82vw");
    expect(bootstrapSource).toContain("[520, 720, 960, 1280]");
    expect(bootstrapSource).toContain("fallbackWidth: 960");
    expect(bootstrapSource).toContain("quality: 78");
    expect(bootstrapSource).not.toContain("fallbackWidth: 1280");
  });

  it("defers conversion hosts until after storefront first paint or user intent", () => {
    const shellSource = readSource("src/storefront/StorefrontShell.tsx");
    const conversionHostsSource = readSource(
      "src/storefront/hooks/useDeferredStorefrontConversionHosts.ts",
    );

    expect(shellSource).toContain("useDeferredStorefrontConversionHosts");
    expect(shellSource).toContain("canRenderConversionHosts");
    expect(conversionHostsSource).toContain(
      "STOREFRONT_CONVERSION_HOST_INTENT_EVENTS",
    );
    expect(conversionHostsSource).toContain('"pointerdown"');
    expect(conversionHostsSource).not.toContain('addEventListener("scroll"');
  });

  it("warms the KHEMET shop list with matching card image descriptors", () => {
    const bootstrapSource = readSource("src/storefront/StorefrontBootstrap.tsx");
    const productsSource = readSource("src/storefront/hooks/useProducts.ts");

    expect(productsSource).toContain("getStorefrontProductsQueryKey");
    expect(productsSource).toContain("fetchStorefrontProducts");
    expect(productsSource).toContain(
      "queryKey: getStorefrontProductsQueryKey(params, storefrontScope, previewKey)",
    );
    expect(bootstrapSource).toContain("resolveStorefrontCatalogPathKey");
    expect(bootstrapSource).toContain("fetchStorefrontProducts(catalogPrefetchParams)");
    expect(bootstrapSource).toContain('pageKey === "shop" ? 16 : 12');
    expect(bootstrapSource).toContain("[240, 320, 420, 520]");
    expect(bootstrapSource).toContain("fallbackWidth: 420");
    expect(bootstrapSource).toContain("quality: 72");
    expect(bootstrapSource).toContain("(max-width: 767px) 68vw");
  });

  it("keeps the prioritized mobile checkout sidebar as a single ordered render", () => {
    const composerSource = readSource("src/storefront/engine/PageComposer.tsx");
    const summarySource = readSource("src/storefront/sections/OrderSummary.tsx");

    expect(composerSource).toContain("order-2 lg:order-1");
    expect(composerSource).toContain("order-1 lg:order-2");
    expect(composerSource).not.toContain("mb-5 lg:hidden");
    expect(summarySource).toContain("getPersistedCartItemCount");
    expect(summarySource).toContain("min-h-[46rem] lg:min-h-0");
    expect(summarySource).toContain("DEFAULT_STOREFRONT_CART_STORAGE_NAME");
    expect(composerSource).toContain("min-h-[46rem] lg:min-h-[24rem]");
  });

  it("keeps the optimized KHEMET runtime JSON aligned with generated commerce pages", () => {
    const khemetTheme = JSON.parse(
      readSource("src/storefront/themes/khemet-luxe-eg.json"),
    );

    expect(khemetTheme.pages.cart.sections[0].variant).toBe("wardrobe-cart");
    expect(khemetTheme.pages.cart.sections[1].variant).toBe("boutique-summary");
    expect(khemetTheme.pages.checkout.sections[0].variant).toBe("soft-flow");
    expect(khemetTheme.pages.checkout.sections[1].variant).toBe(
      "boutique-payment",
    );
    expect(khemetTheme.pages.checkout.sections[1].settings.showSummaryCard).toBe(
      false,
    );
    expect(khemetTheme.pages.checkout.sections[2].variant).toBe(
      "boutique-summary",
    );
    expect(khemetTheme.pages["thank-you"].sections[0].variant).toBe(
      "soft-thanks",
    );
    expect(khemetTheme.pages.privacy.sections).toHaveLength(2);
    expect(khemetTheme.pages.shipping.sections).toHaveLength(2);
    expect(khemetTheme.pages.terms.sections).toHaveLength(2);
  });
});
