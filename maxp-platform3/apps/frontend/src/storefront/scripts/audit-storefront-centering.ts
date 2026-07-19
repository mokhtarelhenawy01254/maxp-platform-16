import { chromium } from "playwright";

import { getMarketplacePreviewProducts } from "../preview/marketplaceSampleData";
import { STOREFRONT_THEME_PRESETS } from "../themes";

type AuditWidth = 390 | 1440 | 2200;

type RouteAuditConfig = {
  id: "home" | "shop" | "pdp" | "cart" | "checkout" | "thank-you";
  buildPath: (themeId: string, productSlug?: string) => string | null;
};

type RouteContainerMetric = {
  index: number;
  className: string;
  width: number;
  leftGap: number;
  rightGap: number;
  gapDelta: number;
  fullWidth: boolean;
  centered: boolean;
};

type RouteAuditResult = {
  themeId: string;
  width: number;
  routeId: RouteAuditConfig["id"];
  url: string;
  metrics: RouteContainerMetric[];
  failures: RouteContainerMetric[];
};

const CORE_THEME_IDS = [
  "pc-hub-eg",
  "women-fashion-eg",
  "men-shoes-eg",
  "perfume-eg",
  "smart-bazaar",
  "district-market",
];

const DEFAULT_WIDTHS: AuditWidth[] = [390, 1440, 2200];
const CENTERING_TOLERANCE = 6;
const STORE_SHELL_READY_TIMEOUT_MS = 20000;
const MARKETPLACE_QUERY =
  "companyId=company123&previewSource=marketplace";

const ROUTE_CONFIGS: RouteAuditConfig[] = [
  {
    id: "home",
    buildPath: (themeId) =>
      `/store/?${MARKETPLACE_QUERY}&previewTheme=${themeId}`,
  },
  {
    id: "shop",
    buildPath: (themeId) =>
      `/store/shop?${MARKETPLACE_QUERY}&previewTheme=${themeId}`,
  },
  {
    id: "pdp",
    buildPath: (themeId, productSlug) =>
      productSlug
        ? `/store/product/${productSlug}?${MARKETPLACE_QUERY}&previewTheme=${themeId}`
        : null,
  },
  {
    id: "cart",
    buildPath: (themeId) =>
      `/store/cart?${MARKETPLACE_QUERY}&previewTheme=${themeId}`,
  },
  {
    id: "checkout",
    buildPath: (themeId) =>
      `/store/checkout?${MARKETPLACE_QUERY}&previewTheme=${themeId}`,
  },
  {
    id: "thank-you",
    buildPath: (themeId) =>
      `/store/thank-you?${MARKETPLACE_QUERY}&previewTheme=${themeId}&orderId=PCH-2048&previewOrderStatus=DELIVERED`,
  },
];

const parseCsvArg = (value?: string | null): string[] =>
  value
    ? value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];

const parseWidthArgs = (value?: string | null): AuditWidth[] => {
  const parsed = parseCsvArg(value)
    .map((entry) => Number(entry))
    .filter((entry): entry is AuditWidth => [390, 1440, 2200].includes(entry));

  return parsed.length > 0 ? parsed : DEFAULT_WIDTHS;
};

const getArgumentValue = (flag: string): string | null => {
  const flagIndex = process.argv.findIndex((entry) => entry === flag);
  if (flagIndex === -1) {
    return null;
  }

  return process.argv[flagIndex + 1] || null;
};

const hasFlag = (flag: string): boolean => process.argv.includes(flag);

const resolveThemeIds = (): string[] => {
  const requestedThemes = parseCsvArg(getArgumentValue("--themes"));
  const allThemeIds = Object.keys(STOREFRONT_THEME_PRESETS).sort();
  const availableThemeIds = new Set(allThemeIds);

  if (requestedThemes.length === 0) {
    if (hasFlag("--core")) {
      return CORE_THEME_IDS.filter((themeId) => availableThemeIds.has(themeId));
    }

    return allThemeIds;
  }

  const unknownThemes = requestedThemes.filter((themeId) => !availableThemeIds.has(themeId));
  if (unknownThemes.length > 0) {
    throw new Error(`Unknown theme ids: ${unknownThemes.join(", ")}`);
  }

  return requestedThemes;
};

const resolveProductSlug = (themeId: string): string | null => {
  const previewProducts = getMarketplacePreviewProducts({ limit: 1 }, themeId);
  const firstProduct = previewProducts?.data?.[0];

  return firstProduct?.slug || firstProduct?.id || null;
};

const formatMetric = (metric: RouteContainerMetric): string =>
  `#${metric.index} delta=${metric.gapDelta.toFixed(2)} left=${metric.leftGap.toFixed(
    2,
  )} right=${metric.rightGap.toFixed(2)} width=${metric.width.toFixed(2)} class="${metric.className}"`;

const main = async () => {
  const baseUrl =
    getArgumentValue("--base-url")?.trim() || "http://localhost:3001";
  const themeIds = resolveThemeIds();
  const widths = parseWidthArgs(getArgumentValue("--widths"));
  const browser = await chromium.launch({ headless: true });
  const failures: RouteAuditResult[] = [];

  try {
    for (const width of widths) {
      for (const themeId of themeIds) {
        const productSlug = resolveProductSlug(themeId);

        for (const route of ROUTE_CONFIGS) {
          const path = route.buildPath(themeId, productSlug || undefined);
          if (!path) {
            continue;
          }

          const page = await browser.newPage({
            viewport: { width, height: width === 390 ? 844 : 1400 },
            isMobile: width === 390,
          });
          const url = `${baseUrl}${path}`;
          try {
            await page.goto(url, { waitUntil: "domcontentloaded" });
            await page.waitForSelector(".storefront-shell", {
              timeout: STORE_SHELL_READY_TIMEOUT_MS,
            });
            await page.waitForFunction(
              () => {
                const shell = document.querySelector(".storefront-shell");
                return Boolean(shell && shell.getAttribute("aria-busy") !== "true");
              },
              undefined,
              { timeout: STORE_SHELL_READY_TIMEOUT_MS },
            );
            await page.waitForTimeout(350);

            const metrics = await page.evaluate(
              ({ tolerance }) => {
                const viewportWidth = window.innerWidth;
                const allContainers = Array.from(
                  document.querySelectorAll<HTMLElement>(".storefront-shell .container"),
                );

                return allContainers
                  .map((container, index) => {
                    const parentContainer = container.parentElement?.closest(".container");
                    if (parentContainer) {
                      return null;
                    }

                    const rect = container.getBoundingClientRect();
                    const className = container.className.replace(/\s+/g, " ").trim();
                    const isVisible =
                      rect.width > 240 &&
                      rect.height > 40 &&
                      rect.bottom > 0 &&
                      rect.top < window.innerHeight * 2.5;

                    if (!isVisible) {
                      return null;
                    }

                    const leftGap = rect.left;
                    const rightGap = viewportWidth - rect.right;
                    const gapDelta = Math.abs(leftGap - rightGap);
                    const centered = gapDelta <= tolerance;
                    const fullWidth = rect.width >= viewportWidth - tolerance * 2;

                    return {
                      index,
                      className,
                      width: rect.width,
                      leftGap,
                      rightGap,
                      gapDelta,
                      fullWidth,
                      centered,
                    };
                  })
                  .filter((metric): metric is RouteContainerMetric => metric !== null);
              },
              { tolerance: CENTERING_TOLERANCE },
            );

            const routeFailures = metrics.filter((metric) => !metric.centered && !metric.fullWidth);
            if (routeFailures.length > 0) {
              failures.push({
                themeId,
                width,
                routeId: route.id,
                url,
                metrics,
                failures: routeFailures,
              });
            }

            const worstDelta =
              metrics.reduce(
                (worst, metric) => Math.max(worst, metric.gapDelta),
                0,
              ) || 0;
            console.log(
              `[${routeFailures.length === 0 ? "PASS" : "FAIL"}] ${themeId} ${route.id} ${width}px worst-delta=${worstDelta.toFixed(
                2,
              )}`,
            );
          } finally {
            await page.close();
          }
        }
      }
    }
  } finally {
    await browser.close();
  }

  if (failures.length > 0) {
    console.error("\nStorefront centering audit failed:\n");
    failures.forEach((failure) => {
      console.error(
        `- ${failure.themeId} ${failure.routeId} ${failure.width}px -> ${failure.url}`,
      );
      failure.failures.forEach((metric) => {
        console.error(`  ${formatMetric(metric)}`);
      });
    });
    process.exit(1);
  }

  console.log(
    `\nStorefront centering audit passed for ${themeIds.length} themes across ${widths.length} widths.`,
  );
};

main().catch((error) => {
  console.error("Storefront centering audit failed to run.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
