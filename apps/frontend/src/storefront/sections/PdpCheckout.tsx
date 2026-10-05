import React from "react";
import { useParams } from "react-router-dom";
import { useProduct } from "../hooks/useProduct";
import { useStorefrontTheme } from "../engine/ThemeProvider";
import { useStorefrontSettings } from "../hooks/useStorefrontSettings";
import PdpQuickOrderPanel from "./PdpQuickOrderPanel";
import { getStorefrontSectionComponentKey } from "./manifest";
import { isProductPageCheckoutEnabledForProduct } from "../../utils/productPageCheckout";
import { getPdpQuickOrderSettingsFromDesignTokens } from "../utils/pdpQuickOrderSettings";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

interface PdpCheckoutProps {
  section?: {
    [key: string]: unknown;
  };
}

const PdpCheckout: React.FC<PdpCheckoutProps> = ({ section }) => {
  const { id } = useParams<{ id: string }>();
  const { theme } = useStorefrontTheme();
  const effectiveId = id || (theme.id ? `preview:${theme.id}` : undefined);
  const { product } = useProduct(effectiveId);
  const { settings: storefrontSettings } = useStorefrontSettings();
  const pdpQuickOrderSettings = getPdpQuickOrderSettingsFromDesignTokens(
    storefrontSettings?.storefrontSettings?.designTokens,
  );
  const hasStoredPdpQuickOrderSettings = isRecord(
    isRecord(storefrontSettings?.storefrontSettings?.designTokens)
      ? storefrontSettings?.storefrontSettings?.designTokens["pdpQuickOrder"]
      : undefined,
  );
  const productPageCheckoutEnabled =
    isProductPageCheckoutEnabledForProduct(product, storefrontSettings);
  const productInfoSection = (theme.pages.pdp?.sections || []).find(
    (sectionEntry) => {
      const sectionType =
        typeof sectionEntry === "string" ? sectionEntry : sectionEntry.type;
      const componentKey = getStorefrontSectionComponentKey(sectionType);
      return sectionType === "product-info" || componentKey === "product-info";
    },
  );
  const productInfoVariant =
    typeof productInfoSection === "string"
      ? undefined
      : productInfoSection?.variant;
  const supportsInlinePlacement =
    productInfoVariant !== "specs-grid" &&
    productInfoVariant !== "bento-specs" &&
    (theme.id === "zen-organic" ||
      !productInfoVariant ||
      productInfoVariant === "standard" ||
      productInfoVariant === "accordion" ||
      productInfoVariant === "atelier-buybox" ||
      productInfoVariant === "fashion-direct-buybox" ||
      productInfoVariant === "style-ledger" ||
      productInfoVariant === "utility-rail" ||
      productInfoVariant === "elessi-care-buybox" ||
      productInfoVariant === "gear-loadout" ||
      productInfoVariant === "playful-story");

  if (
    !productPageCheckoutEnabled ||
    !product ||
    supportsInlinePlacement
  ) {
    return null;
  }

  return (
    <PdpQuickOrderPanel
      product={{
        ...product,
        id: product.id,
        name: product.name,
        slug: product.slug || id,
        description: product.description || "",
        price: product.price,
        imageUrl: product.imageUrl,
        images: product.images,
        productVariants: product.productVariants,
        hasVariants: Boolean(product.productVariants?.length),
        metadata: (product as any)?.metadata,
      }}
      sectionSettings={
        {
          ...(
            section?.settings && typeof section.settings === "object"
              ? (section.settings as Record<string, unknown>)
              : {}
          ),
          ...(hasStoredPdpQuickOrderSettings
            ? {
                placement: pdpQuickOrderSettings.placement,
                surfaceMode: pdpQuickOrderSettings.surfaceMode,
              }
            : {}),
        }
      }
    />
  );
};

export default PdpCheckout;
