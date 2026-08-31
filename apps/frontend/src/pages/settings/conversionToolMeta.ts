import type { LucideIcon } from "lucide-react";
import {
  AlarmClock,
  BadgeCheck,
  BellRing,
  CalendarClock,
  Camera,
  Coins,
  DoorOpen,
  ExternalLink,
  Flame,
  Gift,
  Hourglass,
  Layers,
  Megaphone,
  MousePointerClick,
  PackageOpen,
  Percent,
  ShieldCheck,
  ShoppingBag,
  TrendingUp,
  Truck,
  Users,
  Video,
} from "lucide-react";
import {
  STORE_CONVERSION_PAGES,
  type StoreConversionPageConfig,
  type StoreConversionToolConfig,
} from "./storeConversionSettingsConfig";

export type ConversionToolPreviewKind = "block" | "component" | "mock" | "note";
export type ConversionToolDisplayKind = "pdp" | "global";

export interface ConversionToolMeta {
  icon: LucideIcon;
  previewKind: ConversionToolPreviewKind;
  /** كيف يظهر إطار الكانفاس: داخل صفحة منتج أو على مستوى المتجر */
  displayKind: ConversionToolDisplayKind;
}

const pdpBlock = (icon: LucideIcon): ConversionToolMeta => ({
  icon,
  previewKind: "block",
  displayKind: "pdp",
});

export const CONVERSION_TOOL_META: Record<string, ConversionToolMeta> = {
  saleCountdown: pdpBlock(AlarmClock),
  lowStockNotice: pdpBlock(PackageOpen),
  soldCounter: pdpBlock(TrendingUp),
  purchaseFomo: pdpBlock(Flame),
  estimatedDelivery: pdpBlock(CalendarClock),
  trustedBadges: { icon: ShieldCheck, previewKind: "component", displayKind: "pdp" },
  stickyAddToCart: { icon: ShoppingBag, previewKind: "mock", displayKind: "pdp" },
  backInStock: { icon: BellRing, previewKind: "component", displayKind: "pdp" },
  crossSell: { icon: Layers, previewKind: "mock", displayKind: "pdp" },
  boughtTogether: { icon: Gift, previewKind: "mock", displayKind: "pdp" },
  bulkSavings: { icon: Coins, previewKind: "mock", displayKind: "pdp" },
  buyMoreSaveMore: { icon: Percent, previewKind: "mock", displayKind: "pdp" },
  freeShippingBar: { icon: Truck, previewKind: "mock", displayKind: "global" },
  inactiveTab: { icon: MousePointerClick, previewKind: "note", displayKind: "global" },
  exitIntentPopup: { icon: DoorOpen, previewKind: "mock", displayKind: "global" },
  fakeVisitorCounter: pdpBlock(Users),
  fakeSalePopup: { icon: Megaphone, previewKind: "mock", displayKind: "global" },
  preOrder: pdpBlock(Hourglass),
  externalAffiliate: { icon: ExternalLink, previewKind: "mock", displayKind: "pdp" },
  photoReviews: { icon: Camera, previewKind: "mock", displayKind: "pdp" },
  videoReviews: { icon: Video, previewKind: "mock", displayKind: "pdp" },
  verifiedBadge: { icon: BadgeCheck, previewKind: "mock", displayKind: "pdp" },
};

const FALLBACK_META: ConversionToolMeta = {
  icon: Percent,
  previewKind: "mock",
  displayKind: "pdp",
};

export interface ConversionToolEntry {
  tool: StoreConversionToolConfig;
  page: StoreConversionPageConfig;
  meta: ConversionToolMeta;
}

export const ALL_CONVERSION_TOOLS: ConversionToolEntry[] =
  STORE_CONVERSION_PAGES.flatMap((page) =>
    page.sections.flatMap((section) =>
      section.tools.map((tool) => ({
        tool,
        page,
        meta: CONVERSION_TOOL_META[tool.key] || FALLBACK_META,
      })),
    ),
  );

const CONVERSION_TOOL_ENTRY_MAP = new Map(
  ALL_CONVERSION_TOOLS.map((entry) => [entry.tool.key, entry]),
);

export const findToolById = (toolId: string | null | undefined): ConversionToolEntry | null =>
  (toolId ? CONVERSION_TOOL_ENTRY_MAP.get(toolId) : undefined) || null;
