import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  STOREFRONT_THEME_CATEGORY_PRESETS,
  STOREFRONT_THEME_DESCRIPTIONS,
  STOREFRONT_THEME_PREVIEW_IMAGES,
  getStorefrontThemeCategoryMeta,
  resolveStorefrontThemePreviewImage,
  StorefrontThemeManifestItem,
} from "../themes/catalog";
import { STOREFRONT_THEME_PRESETS } from "../themes/index";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const themesDir = path.resolve(__dirname, "../themes");
const manifestPath = path.resolve(themesDir, "themes-manifest.json");

const getThemeSectionCount = (
  theme:
    | { pages?: Record<string, { sections?: unknown[] } | undefined> }
    | null
    | undefined,
  pageKey: string,
): number => {
  const sections = theme?.pages?.[pageKey]?.sections;
  return Array.isArray(sections) ? sections.length : 0;
};

const extractThemeMetadata = (
  themeId: string,
  themeData: any,
): StorefrontThemeManifestItem => {
  const categoryMeta = getStorefrontThemeCategoryMeta(themeId);
  const rawDirection =
    themeData?.direction || themeData?.tokens?.typography?.direction || "rtl";
  const direction: "rtl" | "ltr" = rawDirection === "ltr" ? "ltr" : "rtl";

  const previewColors: string[] = [
    themeData?.tokens?.colors?.primary,
    themeData?.tokens?.colors?.secondary,
    themeData?.tokens?.colors?.accent,
  ]
    .map((c: unknown) => String(c || "").trim())
    .filter(Boolean);

  if (previewColors.length === 0 && Array.isArray(themeData?.preview?.colors)) {
    previewColors.push(
      ...themeData.preview.colors
        .map((c: unknown) => String(c || "").trim())
        .filter(Boolean),
    );
  }

  const resolvedPreviewImage =
    resolveStorefrontThemePreviewImage(themeId, themeData) ||
    STOREFRONT_THEME_PREVIEW_IMAGES[themeId] ||
    "";

  const description =
    STOREFRONT_THEME_DESCRIPTIONS[themeId] ||
    (typeof themeData?.description === "string" && themeData.description.trim()
      ? themeData.description.trim()
      : "Preset رسمي للـ storefront.");

  const homeSections = getThemeSectionCount(themeData, "home");
  const shopSections = getThemeSectionCount(themeData, "shop");
  const checkoutSections = getThemeSectionCount(themeData, "checkout");
  const pdpSections = getThemeSectionCount(themeData, "pdp");
  const cartSections = getThemeSectionCount(themeData, "cart");
  const totalSections =
    homeSections + shopSections + checkoutSections + pdpSections + cartSections;

  return {
    id: themeId,
    name: themeData?.name || themeId,
    description,
    category: categoryMeta.primary.id || "general",
    categoryMeta,
    direction,
    previewColors,
    previewImage: resolvedPreviewImage,
    pageStats: {
      homeSections,
      shopSections,
      checkoutSections,
      pdpSections,
      cartSections,
      totalSections,
    },
  };
};

export const generateThemesManifest = (): void => {
  console.log("Generating Storefront Themes Manifest...");

  const jsonFiles = fs
    .readdirSync(themesDir)
    .filter(
      (file) =>
        file.endsWith(".json") &&
        !file.startsWith(".") &&
        file !== "themes-manifest.json" &&
        !file.includes(".backup") &&
        !file.includes(".tmp"),
    );

  const manifestMap = new Map<string, StorefrontThemeManifestItem>();

  // 1. Process all *.json theme files in themes/
  for (const file of jsonFiles) {
    const filePath = path.join(themesDir, file);
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const themeData = JSON.parse(content);
      const themeId = String(
        themeData?.id || path.basename(file, ".json"),
      ).trim();
      const item = extractThemeMetadata(themeId, themeData);
      manifestMap.set(themeId, item);
    } catch (err) {
      console.error(`Failed to read/parse ${file}:`, err);
    }
  }

  // 2. Also include any preset from STOREFRONT_THEME_PRESETS not backed by a JSON file (e.g. Elessi pack, aliases)
  for (const [presetId, presetTheme] of Object.entries(
    STOREFRONT_THEME_PRESETS,
  )) {
    if (!manifestMap.has(presetId)) {
      const item = extractThemeMetadata(presetId, presetTheme);
      manifestMap.set(presetId, item);
    }
  }

  // Sort: modern-minimal first as default, then alphabetically by id
  const manifestItems = Array.from(manifestMap.values()).sort((a, b) => {
    if (a.id === "modern-minimal") return -1;
    if (b.id === "modern-minimal") return 1;
    return a.id.localeCompare(b.id);
  });

  const manifestJson = JSON.stringify(manifestItems, null, 2);
  fs.writeFileSync(manifestPath, manifestJson, "utf-8");

  const stats = fs.statSync(manifestPath);
  const sizeKb = (stats.size / 1024).toFixed(2);

  console.log(
    `✅ Successfully generated themes-manifest.json with ${manifestItems.length} themes (${sizeKb} KB).`,
  );
  if (stats.size > 100 * 1024) {
    console.warn(`⚠️ Warning: Manifest size exceeds 100KB (${sizeKb} KB)`);
  }
};

generateThemesManifest();
