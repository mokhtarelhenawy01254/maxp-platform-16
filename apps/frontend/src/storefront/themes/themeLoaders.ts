import type { StorefrontTheme } from "../types/theme.types";
import { getStorefrontThemePreset, DEFAULT_STOREFRONT_THEME_ID, resolveStorefrontThemeId, STOREFRONT_THEME_PRESETS } from "./index";

export type ThemeLoaderFn = () => Promise<{ default: unknown }>;

export const DYNAMIC_THEME_REGISTRY: Record<string, ThemeLoaderFn> = {
  "tpl-009-modular-catalog-kids-fashion": () => import("./tpl-009-modular-catalog-kids-fashion.json"),
  "tpl-010-multi-department-kids-fashion": () => import("./tpl-010-multi-department-kids-fashion.json"),
  "tpl-011-local-market-kids-fashion": () => import("./tpl-011-local-market-kids-fashion.json"),
  "tpl-012-original-kids-fashion": () => import("./tpl-012-original-kids-fashion.json"),
  "mono-jewel-atelier": () => import("./mono-jewel-atelier.json"),
  "modest-wear-lumiere": () => import("./modest-wear-lumiere.json"),
  "modest-wear-bazaar": () => import("./modest-wear-bazaar.json"),
  "modest-wear-noor": () => import("./modest-wear-noor.json"),
  "modest-wear-maison": () => import("./modest-wear-maison.json"),
  "shoes-lumiere": () => import("./shoes-lumiere.json"),
  "shoes-bazaar": () => import("./shoes-bazaar.json"),
  "shoes-noor": () => import("./shoes-noor.json"),
  "shoes-maison": () => import("./shoes-maison.json"),
  "bags-lumiere": () => import("./bags-lumiere.json"),
  "bags-bazaar": () => import("./bags-bazaar.json"),
  "bags-noor": () => import("./bags-noor.json"),
  "bags-maison": () => import("./bags-maison.json"),
  "kids-fashion-lumiere": () => import("./kids-fashion-lumiere.json"),
  "kids-fashion-bazaar": () => import("./kids-fashion-bazaar.json"),
  "kids-fashion-noor": () => import("./kids-fashion-noor.json"),
  "kids-fashion-maison": () => import("./kids-fashion-maison.json"),
  "menswear-lumiere": () => import("./menswear-lumiere.json"),
  "menswear-bazaar": () => import("./menswear-bazaar.json"),
  "menswear-noor": () => import("./menswear-noor.json"),
  "menswear-maison": () => import("./menswear-maison.json"),
  "women-fashion-lumiere": () => import("./women-fashion-lumiere.json"),
  "women-fashion-bazaar": () => import("./women-fashion-bazaar.json"),
  "women-fashion-noor": () => import("./women-fashion-noor.json"),
  "women-fashion-maison": () => import("./women-fashion-maison.json"),
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
  "junior-ai-lab": () => import("./junior-ai-lab.json"),
  "academy-little-coders": () => import("./academy-little-coders.json"),
  "cafe-demo": () => import("./cafe-demo.json"),
  "couture-atelier-eg": () => import("./couture-atelier-eg.json"),
  "creative-portfolio": () => import("./creative-portfolio.json"),
  "electronics-demo": () => import("./electronics-demo.json"),
  "fastly-eg": () => import("./fastly-eg.json"),
  "furniture-demo": () => import("./furniture-demo.json"),
  "marketplace-avenue": () => import("./marketplace-avenue.json"),
  "marketplace-avenue-ar": () => import("./marketplace-avenue-ar.json"),
  "restaurant-demo": () => import("./restaurant-demo.json"),
  "smart-bazaar": () => import("./smart-bazaar.json"),
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
  // 120-template plan — day 01/30 (أزياء حريمي). Dynamic only: no import in index.ts,
  // so the merchant bundle does not pay for these presets unless the store selects them.
  "tpl-001-bulk-commerce-women-fashion": () => import("./tpl-001-bulk-commerce-women-fashion.json"),
  "tpl-002-marketplace-multi-women-fashion": () => import("./tpl-002-marketplace-multi-women-fashion.json"),
  "tpl-003-local-market-women-fashion": () => import("./tpl-003-local-market-women-fashion.json"),
  "tpl-004-original-women-fashion": () => import("./tpl-004-original-women-fashion.json"),
  "menswear-bespoke": () => import("./menswear-bespoke.json"),
  "menswear-dapper": () => import("./menswear-dapper.json"),
  "menswear-oxford": () => import("./menswear-oxford.json"),
  "menswear-regent": () => import("./menswear-regent.json"),
  "tpl-025-cinematic-fragrance-perfume": () => import("./tpl-025-cinematic-fragrance-perfume.json"),
  "tpl-026-paper-fragrance-perfume": () => import("./tpl-026-paper-fragrance-perfume.json"),
  "tpl-027-attar-market-perfume": () => import("./tpl-027-attar-market-perfume.json"),
  "tpl-028-ritual-apothecary-perfume": () => import("./tpl-028-ritual-apothecary-perfume.json"),
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
      const mod = await loader();
      const rawTheme = ((mod as any)?.default || mod) as StorefrontTheme;
      if (rawTheme && (rawTheme.tokens || rawTheme.pages)) {
        STOREFRONT_THEME_PRESETS[canonicalId] = rawTheme;
        STOREFRONT_THEME_PRESETS[normalizedId] = rawTheme;
        THEME_CACHE.set(canonicalId, rawTheme);
        if (normalizedId !== canonicalId) {
          THEME_CACHE.set(normalizedId, rawTheme);
        }
        return rawTheme;
      }
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
