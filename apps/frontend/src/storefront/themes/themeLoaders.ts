import type { StorefrontTheme } from "../types/theme.types";
import { getStorefrontThemePreset, DEFAULT_STOREFRONT_THEME_ID, resolveStorefrontThemeId } from "./index";

export type ThemeLoaderFn = () => Promise<{ default: unknown }>;

export const DYNAMIC_THEME_REGISTRY: Record<string, ThemeLoaderFn> = {
  "modern-minimal": () => import("./modern-minimal.json"),
  "bold-fashion": () => import("./bold-fashion.json"),
  "elegant-luxe": () => import("./elegant-luxe.json"),
  "vanguard-premium": () => import("./vanguard-premium.json"),
  "atelier-nova": () => import("./atelier-nova.json"),
  "aura-chic": () => import("./aura-chic.json"),
  "solea-femme": () => import("./solea-femme.json"),
  "zen-organic": () => import("./zen-organic.json"),
  "fakhama-elite": () => import("./fakhama-elite.json"),
  "mystic-desert": () => import("./mystic-desert.json"),
  "airlume-ai": () => import("./airlume-ai.json"),
  "shop-orbit": () => import("./shop-orbit.json"),
  "district-market": () => import("./district-market.json"),
  "menswear-prime": () => import("./menswear-prime.json"),
  "cairo-stride": () => import("./cairo-stride.json"),
  "closet-os": () => import("./closet-os.json"),
  "hayah-modest-eg": () => import("./hayah-modest-eg.json"),
  "rihla-resort-eg": () => import("./rihla-resort-eg.json"),
  "layali-edit-eg": () => import("./layali-edit-eg.json"),
  "legacy-default-old": () => import("./legacy-default-old.json"),
  "men-shoes-eg": () => import("./men-shoes-eg.json"),
  "women-fashion-eg": () => import("./women-fashion-eg.json"),
  "look-atelier-eg": () => import("./look-atelier-eg.json"),
  "khemet-luxe-eg": () => import("./khemet-luxe-eg.json"),
  "khemet-luxe-v2": () => import("./khemet-luxe-v2.json"),
  "khemet-general-eg": () => import("./khemet-general-eg.json"),
  "khemet-fashion-eg": () => import("./khemet-fashion-eg.json"),
  "perfume-eg": () => import("./perfume-eg.json"),
  "pc-hub-eg": () => import("./pc-hub-eg.json"),
  "rose-boutique-eg": () => import("./rose-boutique-eg.json"),
  "vela-fashion-eg": () => import("./vela-fashion-eg.json"),
  "fitting-room-studio": () => import("./fitting-room-studio.json"),
  "nile-bistro": () => import("./nile-bistro.json"),
  "nova-mobile": () => import("./nova-mobile.json"),
  "kids-play": () => import("./kids-play.json"),
  "max-care-go": () => import("./max-care-go.json"),
  "butcher-counter-eg": () => import("./butcher-counter-eg.json"),
  "pawsome": () => import("./pawsome.json"),
  "velvet-glow": () => import("./velvet-glow.json"),
  "ink-paper": () => import("./ink-paper.json"),
  "bloom-studio": () => import("./bloom-studio.json"),
  "iron-forge": () => import("./iron-forge.json"),
  "opulence": () => import("./opulence.json"),
  "turbo-parts": () => import("./turbo-parts.json"),
  "crafted": () => import("./crafted.json"),
  "fresh-cart": () => import("./fresh-cart.json"),
  "skill-lab": () => import("./skill-lab.json"),
  "baladi-market-eg": () => import("./baladi-market-eg.json"),
  "nile-elegance-eg": () => import("./nile-elegance-eg.json"),
  "prime-butcher-luxe": () => import("./prime-butcher-luxe.json"),
  "butcher-shop-eg": () => import("./butcher-shop-eg.json"),
  "mens-grooming-pro": () => import("./mens-grooming-pro.json"),
  "soft-graceful": () => import("./soft-graceful.json"),
  "allure": () => import("./allure.json"),
  "allura": () => import("./allure.json"),
  "anjella-boutique": () => import("./anjella-boutique.json"),
  "dental-lab-elite": () => import("./dental-lab-elite.json"),
  "redline-auto": () => import("./redline-auto.json"),
};

const THEME_CACHE = new Map<string, StorefrontTheme>();

export const loadStorefrontThemeAsync = async (
  themeId: string = DEFAULT_STOREFRONT_THEME_ID,
): Promise<StorefrontTheme> => {
  const normalizedId = (themeId || DEFAULT_STOREFRONT_THEME_ID).trim();
  const canonicalId = resolveStorefrontThemeId(normalizedId);

  if (THEME_CACHE.has(canonicalId)) {
    return THEME_CACHE.get(canonicalId)!;
  }

  const loader = DYNAMIC_THEME_REGISTRY[canonicalId] || DYNAMIC_THEME_REGISTRY[normalizedId];
  if (loader) {
    try {
      await loader();
    } catch (err) {
      console.warn(`[ThemeLoader] Dynamic load failed for ${canonicalId}, falling back to preset`, err);
    }
  }

  const resolved = getStorefrontThemePreset(canonicalId);
  THEME_CACHE.set(canonicalId, resolved);
  if (normalizedId !== canonicalId) {
    THEME_CACHE.set(normalizedId, resolved);
  }
  return resolved;
};

export const preloadStorefrontTheme = (themeId: string): void => {
  const normalizedId = (themeId || "").trim();
  if (!normalizedId || THEME_CACHE.has(normalizedId)) {
    return;
  }

  const loader = DYNAMIC_THEME_REGISTRY[normalizedId];
  if (loader) {
    void loader().catch(() => {});
  }
};
