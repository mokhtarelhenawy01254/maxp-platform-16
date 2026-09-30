import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

import { queryClient } from "../config/queryClient";
import StorefrontSkeleton from "./components/StorefrontSkeleton";
import {
  fetchStorefrontProduct,
  getStorefrontProductQueryKey,
  resolveStorefrontProductPreviewMode,
} from "./hooks/useProduct";
import {
  fetchStorefrontProducts,
  getStorefrontProductsQueryKey,
  type Product,
  type ProductsParams,
  type ProductsResponse,
} from "./services/storefrontProducts";
import { isKhemetLuxeTheme } from "./utils/navigationGuards";
import {
  fetchStorefrontSettings,
  getStorefrontSettingsQueryKey,
  resolvePreviewThemeId,
  type StorefrontSettings,
} from "./hooks/useStorefrontSettings";
import { resolvePreviewSource } from "./preview/previewContext";
import { resolveThemeCatalogPreviewKey } from "./preview/themePreviewData";
import { getCatalogProductQuery } from "./utils/catalogFilters";
import {
  buildResponsiveStorefrontImage,
  getPrimaryProductImage,
} from "./utils/productImages";
import { getStorefrontScope } from "../utils/storefrontApi";
import { useIpGovernorateDetection } from "./hooks/useIpGovernorateDetection";
import { preloadRuntimeStorefrontTheme } from "./engine/runtimeThemeResolver";
import { Toaster } from "sonner";


const StorefrontShell = React.lazy(() => import("./StorefrontShell"));
const STOREFRONT_TOASTER_IDLE_DELAY_MS = 8000;
const STOREFRONT_TOASTER_INTENT_EVENTS = [
  "click",
  "pointerdown",
  "touchstart",
  "wheel",
] as const;

const toastOptions = {
  duration: 4000,
  position: "top-right" as const,
  style: {
    background: "#363636",
    color: "#fff",
    borderRadius: "8px",
    fontSize: "14px",
    maxWidth: "400px",
  },
  success: {
    duration: 3000,
    iconTheme: {
      primary: "#22c55e",
      secondary: "#fff",
    },
  },
  error: {
    duration: 5000,
    iconTheme: {
      primary: "#ef4444",
      secondary: "#fff",
    },
  },
  loading: {
    duration: Infinity,
  },
};

const resolveStorefrontProductPathKey = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const segments = window.location.pathname.split("/").filter(Boolean);
  const routeSegments = segments[0] === "store" ? segments.slice(1) : segments;

  if (routeSegments[0] !== "product" || !routeSegments[1]) {
    return null;
  }

  try {
    return decodeURIComponent(routeSegments[1]);
  } catch {
    return routeSegments[1];
  }
};

const resolveStorefrontCatalogPathKey = (): "shop" | "sale" | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const segments = window.location.pathname.split("/").filter(Boolean);
  const routeSegments = segments[0] === "store" ? segments.slice(1) : segments;
  const firstSegment = routeSegments[0];

  return firstSegment === "shop" || firstSegment === "sale" ? firstSegment : null;
};

const resolveStorefrontProductImageLandingPathKey = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const segments = window.location.pathname.split("/").filter(Boolean);
  const routeSegments = segments[0] === "store" ? segments.slice(1) : segments;

  if (
    (routeSegments[0] !== "lp" && routeSegments[0] !== "landing") ||
    !routeSegments[1]
  ) {
    return null;
  }

  try {
    return decodeURIComponent(routeSegments[1]);
  } catch {
    return routeSegments[1];
  }
};

const resolveThemeIdFromSettings = (
  settings?: StorefrontSettings | null,
): string => {
  const storefrontThemeId = settings?.storefront?.themeId;
  if (typeof storefrontThemeId === "string" && storefrontThemeId.trim()) {
    return storefrontThemeId.trim();
  }

  const nestedThemeId = settings?.storefront?.settings?.themeId;
  return typeof nestedThemeId === "string" ? nestedThemeId.trim() : "";
};

const resolveCatalogPrefetchLimit = (
  pageKey: "shop" | "sale",
  settings?: StorefrontSettings | null,
): number => {
  if (isKhemetLuxeTheme(resolveThemeIdFromSettings(settings))) {
    return pageKey === "shop" ? 16 : 12;
  }

  return 12;
};

const resolveStorefrontCatalogPrefetchParams = (
  pageKey: "shop" | "sale",
  settings?: StorefrontSettings | null,
): ProductsParams | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const productQuery = getCatalogProductQuery(
    new URLSearchParams(window.location.search),
  );

  if (productQuery.category) {
    return null;
  }

  return {
    limit: resolveCatalogPrefetchLimit(pageKey, settings),
    ...productQuery,
  };
};

const primeImagePreload = (imageUrl: string): void => {
  if (typeof document === "undefined" || !imageUrl) {
    return;
  }

  const responsiveImage = buildResponsiveStorefrontImage(imageUrl, {
    widths: [520, 720, 960, 1280],
    fallbackWidth: 960,
    quality: 78,
    sizes: "(max-width: 767px) 82vw, (min-width: 1024px) 50vw, 100vw",
  });

  const existingLink = document.head.querySelector<HTMLLinkElement>(
    `link[rel="preload"][as="image"][href="${responsiveImage.src}"]`,
  );

  if (existingLink) {
    return;
  }

  const preloadLink = document.createElement("link");
  preloadLink.rel = "preload";
  preloadLink.as = "image";
  preloadLink.href = responsiveImage.src;
  preloadLink.setAttribute("fetchpriority", "high");
  if (responsiveImage.srcSet) {
    preloadLink.setAttribute("imagesrcset", responsiveImage.srcSet);
  }
  if (responsiveImage.sizes) {
    preloadLink.setAttribute("imagesizes", responsiveImage.sizes);
  }
  document.head.appendChild(preloadLink);
};

const primeCatalogImagePreload = (imageUrl: string): void => {
  if (typeof document === "undefined" || !imageUrl) {
    return;
  }

  const responsiveImage = buildResponsiveStorefrontImage(imageUrl, {
    widths: [240, 320, 420, 520],
    fallbackWidth: 420,
    quality: 72,
    sizes: "(max-width: 767px) 68vw, (max-width: 1279px) 28vw, 20vw",
  });

  const existingLink = document.head.querySelector<HTMLLinkElement>(
    `link[rel="preload"][as="image"][href="${responsiveImage.src}"]`,
  );

  if (existingLink) {
    return;
  }

  const preloadLink = document.createElement("link");
  preloadLink.rel = "preload";
  preloadLink.as = "image";
  preloadLink.href = responsiveImage.src;
  preloadLink.setAttribute("fetchpriority", "high");
  if (responsiveImage.srcSet) {
    preloadLink.setAttribute("imagesrcset", responsiveImage.srcSet);
  }
  if (responsiveImage.sizes) {
    preloadLink.setAttribute("imagesizes", responsiveImage.sizes);
  }
  document.head.appendChild(preloadLink);
};

export const prefetchStorefrontBootstrapData = async (): Promise<void> => {
  if (resolveStorefrontProductImageLandingPathKey()) {
    return;
  }

  const previewThemeId = resolvePreviewThemeId();
  const previewSource = resolvePreviewSource();
  const themeCatalogPreviewKey = resolveThemeCatalogPreviewKey();
  const initialStorefrontScope = getStorefrontScope();
  const initialSettingsQueryKey = getStorefrontSettingsQueryKey(
    initialStorefrontScope,
    previewThemeId,
    previewSource,
  );

  const productPathKey = resolveStorefrontProductPathKey();
  const isPreviewMode = resolveStorefrontProductPreviewMode();
  const productQueryKey = productPathKey
    ? getStorefrontProductQueryKey(
        productPathKey,
        initialStorefrontScope,
        isPreviewMode,
        themeCatalogPreviewKey,
      )
    : null;

  // Run settings prefetch and product prefetch concurrently
  const settingsPromise = queryClient
    .prefetchQuery({
      queryKey: initialSettingsQueryKey,
      queryFn: () => fetchStorefrontSettings(previewThemeId, previewSource),
      staleTime: 5 * 60 * 1000,
    })
    .then(() => {
      const prefetchedSettings =
        queryClient.getQueryData<StorefrontSettings>(initialSettingsQueryKey);
      const themeId =
        resolveThemeIdFromSettings(prefetchedSettings) || previewThemeId;
      if (themeId) {
        void preloadRuntimeStorefrontTheme(themeId);
      }
    });

  const productPromise = productPathKey && productQueryKey
    ? queryClient.prefetchQuery({
        queryKey: productQueryKey,
        queryFn: () => fetchStorefrontProduct(productPathKey, isPreviewMode),
        staleTime: 0,
      }).then(() => {
        const product = queryClient.getQueryData<Product>(productQueryKey);
        const primaryImage = getPrimaryProductImage(product);
        if (primaryImage) {
          primeImagePreload(primaryImage);
        }
      })
    : Promise.resolve();

  await Promise.all([settingsPromise, productPromise]);

  const resolvedStorefrontScope = getStorefrontScope();
  if (resolvedStorefrontScope !== initialStorefrontScope) {
    const prefetchedSettings = queryClient.getQueryData(initialSettingsQueryKey);
    if (prefetchedSettings) {
      queryClient.setQueryData(
        getStorefrontSettingsQueryKey(
          resolvedStorefrontScope,
          previewThemeId,
          previewSource,
        ),
        prefetchedSettings,
      );
    }
    if (productPathKey && productQueryKey) {
      const prefetchedProduct = queryClient.getQueryData(productQueryKey);
      if (prefetchedProduct) {
        queryClient.setQueryData(
          getStorefrontProductQueryKey(
            productPathKey,
            resolvedStorefrontScope,
            isPreviewMode,
            themeCatalogPreviewKey,
          ),
          prefetchedProduct,
        );
      }
    }
  }

  const prefetchedSettings =
    queryClient.getQueryData<StorefrontSettings>(initialSettingsQueryKey) ||
    queryClient.getQueryData<StorefrontSettings>(
      getStorefrontSettingsQueryKey(
        resolvedStorefrontScope,
        previewThemeId,
        previewSource,
      ),
    ) ||
    null;
  const catalogPathKey = resolveStorefrontCatalogPathKey();
  const catalogPrefetchParams = catalogPathKey
    ? resolveStorefrontCatalogPrefetchParams(catalogPathKey, prefetchedSettings)
    : null;
  const canPrefetchLiveCatalog =
    !previewThemeId && previewSource !== "marketplace" && !themeCatalogPreviewKey;

  if (catalogPrefetchParams && canPrefetchLiveCatalog) {
    const productsQueryKey = getStorefrontProductsQueryKey(
      catalogPrefetchParams,
      resolvedStorefrontScope,
      "",
    );

    await queryClient.prefetchQuery({
      queryKey: productsQueryKey,
      queryFn: () => fetchStorefrontProducts(catalogPrefetchParams),
      staleTime: 60 * 1000,
    });

    const productsResponse =
      queryClient.getQueryData<ProductsResponse>(productsQueryKey);
    const primaryCatalogImage = getPrimaryProductImage(
      productsResponse?.data?.[0],
    );
    if (primaryCatalogImage) {
      primeCatalogImagePreload(primaryCatalogImage);
    }
  }
};

const StorefrontAppToaster: React.FC = () => (
  <DeferredStorefrontToaster />
);

const useDeferredStorefrontToaster = (): boolean => {
  const [canRender, setCanRender] = React.useState(false);

  React.useEffect(() => {
    if (canRender || typeof window === "undefined") {
      return undefined;
    }

    let isActive = true;
    let idleId: number | null = null;
    let timerId: number | null = null;

    const activate = () => {
      if (isActive) {
        setCanRender(true);
      }
    };
    const onFirstIntent = () => window.setTimeout(activate, 0);
    const passiveOnce: AddEventListenerOptions = { once: true, passive: true };
    const keyOnce: AddEventListenerOptions = { once: true };

    STOREFRONT_TOASTER_INTENT_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, onFirstIntent, passiveOnce);
    });
    window.addEventListener("keydown", onFirstIntent, keyOnce);

    timerId = window.setTimeout(() => {
      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(activate, { timeout: 900 });
        return;
      }

      activate();
    }, STOREFRONT_TOASTER_IDLE_DELAY_MS);

    return () => {
      isActive = false;
      STOREFRONT_TOASTER_INTENT_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, onFirstIntent);
      });
      window.removeEventListener("keydown", onFirstIntent);

      if (idleId !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }

      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, [canRender]);

  return canRender;
};

const DeferredStorefrontToaster: React.FC = () => {
  const canRenderToaster = useDeferredStorefrontToaster();

  if (!canRenderToaster) {
    return null;
  }

  return (
    <React.Suspense fallback={null}>
      <Toaster toastOptions={toastOptions} />
    </React.Suspense>
  );
};

const StorefrontBootstrap: React.FC = () => {
  // Pre-select the visitor's governorate from their IP on first entry.
  useIpGovernorateDetection();

  // Real-user performance monitoring (LCP/CLS/INP/TTFB) — storefront only.
  React.useEffect(() => {
    void import("../utils/webVitals").then(({ initWebVitals }) => initWebVitals());
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <React.Suspense fallback={<StorefrontSkeleton />}>
          <StorefrontShell />
        </React.Suspense>
        <StorefrontAppToaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default StorefrontBootstrap;
