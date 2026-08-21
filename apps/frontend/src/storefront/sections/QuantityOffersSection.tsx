import React from "react";
import { useParams } from "react-router-dom";
import QuantityOffersPanel, {
  type QuantityOffersVariant,
} from "../components/QuantityOffersPanel";
import { useProduct } from "../hooks/useProduct";
import { useStorefrontSettings } from "../hooks/useStorefrontSettings";
import { usePdpSelectionStore } from "../store/usePdpSelectionStore";
import { resolveSectionVariant } from "../variants";
import {
  getStorefrontMarketplaceAppSettings,
  isStorefrontMarketplaceAppEnabled,
} from "../utils/marketplaceApps";

interface QuantityOffersSectionProps {
  section?: {
    variant?: string;
    [key: string]: unknown;
  };
  settings?: {
    title?: string;
    subtitle?: string;
    addOfferLabel?: string;
    continueToFormLabel?: string;
    copyFirstSelectionLabel?: string;
    freeShippingLabel?: string;
    bestValueLabel?: string;
    decisionMode?: string;
    hideWhenSingleOffer?: boolean;
    [key: string]: unknown;
  };
  isOpen?: boolean;
}

const QUANTITY_OFFERS_SECTION_FAMILY = "QuantityOffers";
const EMPTY_ATTRIBUTES: Record<string, string> = {};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const parseProductMetadata = (value: unknown): Record<string, unknown> => {
  if (isRecord(value)) {
    return value;
  }

  if (typeof value !== "string" || !value.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const parseVariantSettings = (value: unknown) => {
  const parsedValue = parseProductMetadata(value);
  const styles =
    isRecord(parsedValue) && isRecord(parsedValue["styles"])
      ? parsedValue["styles"]
      : {};
  const attributeImages =
    isRecord(parsedValue) && isRecord(parsedValue["attributeImages"])
      ? parsedValue["attributeImages"]
      : {};
  const attributeColors =
    isRecord(parsedValue) && isRecord(parsedValue["attributeColors"])
      ? parsedValue["attributeColors"]
      : {};

  return {
    styles,
    attributeImages,
    attributeColors,
  };
};

const normalizeQuantityOffersVariant = (
  rawVariant: unknown,
): QuantityOffersVariant =>
  resolveSectionVariant<QuantityOffersVariant>(
    QUANTITY_OFFERS_SECTION_FAMILY,
    rawVariant,
    "stacked-cards",
  );

const resolveTextSetting = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

const QuantityOffersSection: React.FC<QuantityOffersSectionProps> = ({
  section,
  settings,
  isOpen = true,
}) => {
  const { id } = useParams<{ id: string }>();
  const { product } = useProduct(id);
  const { settings: storefrontSettings } = useStorefrontSettings();
  const selectedAttributes = usePdpSelectionStore(
    (state) => state.selection?.attributes,
  );
  const quantityOffersEnabled = isStorefrontMarketplaceAppEnabled(
    storefrontSettings,
    "quantity-offers-pro",
  );
  const quantityOffersSettings = getStorefrontMarketplaceAppSettings(
    storefrontSettings,
    "quantity-offers-pro",
  );
  const quantityOffersModules =
    (quantityOffersSettings["modules"] as Record<string, unknown> | undefined) ||
    {};
  const quantityOffersCopy =
    (quantityOffersSettings["copy"] as Record<string, unknown> | undefined) ||
    {};
  const currency =
    storefrontSettings?.storefront?.settings?.currency ||
    storefrontSettings?.company?.currency ||
    "USD";
  const variant = normalizeQuantityOffersVariant(section?.variant);

  if (
    !product ||
    !quantityOffersEnabled ||
    quantityOffersModules["renderOnProductPage"] === false
  ) {
    return null;
  }

  const metadata = parseProductMetadata(product["metadata"]);
  const panelSettings = {
    title: resolveTextSetting(
      settings?.title,
      String(quantityOffersCopy["title"] || "عروض الكميات"),
    ),
    subtitle: resolveTextSetting(
      settings?.subtitle,
      String(
        quantityOffersCopy["subtitle"] ||
          "اختر العرض المناسب، ثم حدّد اللون أو المقاس لكل قطعة من نفس المكان.",
      ),
    ),
    addOfferLabel: resolveTextSetting(
      settings?.addOfferLabel,
      String(quantityOffersCopy["addOfferLabel"] || "أضف العرض إلى السلة"),
    ),
    continueToFormLabel: resolveTextSetting(
      settings?.continueToFormLabel,
      String(quantityOffersCopy["continueToFormLabel"] || "متابعة الطلب"),
    ),
    copyFirstSelectionLabel: resolveTextSetting(
      settings?.copyFirstSelectionLabel,
      String(
        quantityOffersCopy["copyFirstSelectionLabel"] ||
          "نسخ اختيار القطعة الأولى",
      ),
    ),
    freeShippingLabel: resolveTextSetting(
      settings?.freeShippingLabel,
      String(quantityOffersCopy["freeShippingLabel"] || "شحن مجاني"),
    ),
    bestValueLabel: resolveTextSetting(
      settings?.bestValueLabel,
      String(quantityOffersCopy["bestValueLabel"] || "الأكثر توفيرًا"),
    ),
    hideWhenSingleOffer: settings?.hideWhenSingleOffer === true,
    hideVariantSelectors: settings?.hideVariantSelectors === true,
    decisionMode:
      typeof settings?.decisionMode === "string" && settings.decisionMode.trim()
        ? settings.decisionMode.trim()
        : "supporting",
  };
  const seedAttributes = selectedAttributes ?? EMPTY_ATTRIBUTES;
  const panelKey = `quantity-offers:${product.id}:${variant}:${JSON.stringify(
    seedAttributes,
  )}`;

  return (
    <QuantityOffersPanel
      key={panelKey}
      product={product}
      currency={currency}
      variant={variant}
      variantSettings={parseVariantSettings(metadata["variantSettings"])}
      seedAttributes={seedAttributes}
      settings={panelSettings}
    />
  );
};

if (!isOpen) return null;

export default QuantityOffersSection;
