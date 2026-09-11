import type { CarouselCard } from "../types";
import type { CreateFullAdData } from "../../../../services/facebookAdsService";

const humanizeProductSlug = (slug: string) =>
  slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const buildPrefilledCampaignName = (productSlug: string) => {
  if (!productSlug) {
    return "";
  }

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `META_SALES_${productSlug}_${date}`;
};

const buildDefaultUrlParameters = (productSlug: string) => {
  const params = [
    "utm_source=facebook",
    "utm_medium=paid_social",
    "utm_campaign={{campaign.name}}",
    "campaign_id={{campaign.id}}",
    "adset_id={{adset.id}}",
    "ad_id={{ad.id}}",
  ];

  if (productSlug) {
    params.push(`utm_content=${encodeURIComponent(productSlug)}`);
  }

  return params.join("&");
};

const PRODUCT_LAUNCH_PREFILL_STORAGE_PREFIX =
  "facebookAds.productLaunchPrefill";

interface ProductLaunchPrefillPayload {
  productUrl?: string;
  productId?: string;
  productSlug?: string;
  productTitle?: string;
  publishRequestId?: string;
  expiresAt?: number;
  budget?: number;
  objective?: string;
  pixelId?: string;
  pageId?: string;
  status?: "ACTIVE" | "PAUSED";
  campaignName?: string;
  adSetName?: string;
  adName?: string;
  primaryText?: string;
  headline?: string;
  description?: string;
  callToAction?: string;
  imageUrls?: string[];
  creativeType?: "SINGLE_IMAGE" | "CAROUSEL";
  ageMin?: number;
  ageMax?: number;
  genders?: string[];
  locations?: string[];
  advantageAudience?: boolean;
  createFullAdData?: Partial<CreateFullAdData>;
}

const getProductLaunchPrefillPayload = (
  launchPrefillId: string,
): ProductLaunchPrefillPayload | null => {
  if (!launchPrefillId || typeof window === "undefined") {
    return null;
  }

  try {
    const rawPayload = window.sessionStorage.getItem(
      `${PRODUCT_LAUNCH_PREFILL_STORAGE_PREFIX}:${launchPrefillId}`,
    );

    if (!rawPayload) {
      return null;
    }

    const payload = JSON.parse(rawPayload) as ProductLaunchPrefillPayload;
    if (payload.expiresAt && Date.now() > payload.expiresAt) {
      window.sessionStorage.removeItem(
        `${PRODUCT_LAUNCH_PREFILL_STORAGE_PREFIX}:${launchPrefillId}`,
      );
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};

const getSafePrefillImageUrls = (imageUrls?: string[]) =>
  (imageUrls || [])
    .map((imageUrl) => imageUrl.trim())
    .filter((imageUrl) => /^https?:\/\//i.test(imageUrl))
    .slice(0, 10);

const createClientRequestId = (prefix: string) => {
  const randomId =
    typeof window !== "undefined" && window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}:${randomId}`;
};

const buildPrefilledCarouselCards = (
  imageUrls: string[],
  productTitle: string,
  productUrl: string,
): CarouselCard[] =>
  imageUrls.map((imageUrl, index) => ({
    id: `prefill-card-${index + 1}`,
    imageUrl,
    headline:
      index === 0
        ? `${productTitle}`.slice(0, 40)
        : `${productTitle} ${index + 1}`.slice(0, 40),
    description: "شاهدي التفاصيل",
    linkUrl: productUrl,
  }));

const getPrefilledCarouselCards = (
  cards: CreateFullAdData["carouselCards"] | undefined,
  fallbackImageUrls: string[],
  productTitle: string,
  productUrl: string,
): CarouselCard[] => {
  const storedCards = (cards || [])
    .map((card, index) => ({
      id: card.id || `prefill-card-${index + 1}`,
      imageUrl: String(card.imageUrl || "").trim(),
      headline: String(card.headline || productTitle).slice(0, 40),
      description: String(card.description || "شاهدي التفاصيل"),
      linkUrl: String(card.linkUrl || productUrl),
    }))
    .filter((card) => /^https?:\/\//i.test(card.imageUrl) && /^https?:\/\//i.test(card.linkUrl))
    .slice(0, 10);

  return storedCards.length > 0
    ? storedCards
    : buildPrefilledCarouselCards(fallbackImageUrls, productTitle, productUrl);
};

const formatLaunchPrefillPrice = (
  price?: number | string,
  currency = "EGP",
): string => (price ? `${price} ${currency}` : "");

const buildStoredPrefillCarouselCards = getPrefilledCarouselCards;

export {
  humanizeProductSlug,
  buildPrefilledCampaignName,
  buildDefaultUrlParameters,
  formatLaunchPrefillPrice,
  buildPrefilledCarouselCards,
  getProductLaunchPrefillPayload,
  buildStoredPrefillCarouselCards,
  getSafePrefillImageUrls,
  createClientRequestId,
};
