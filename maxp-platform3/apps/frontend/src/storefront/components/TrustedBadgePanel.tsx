import React from "react";
import {
  BadgeCheck,
  CreditCard,
  RotateCcw,
  ShieldCheck,
  Truck,
  WalletCards,
  History,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn as cx } from "../../lib/utils";
import { useStorefrontTheme } from "../engine/ThemeProvider";

interface TrustedBadgePanelProps {
  title?: string;
  subtitle?: string;
  items?: TrustedBadgeItemInput[];
  variant?: "strip" | "grid" | "minimal" | "scroll" | "perfume-minimal";
  className?: string;
}

type TrustedBadgeItemInput =
  | string
  | {
      title?: string;
      label?: string;
      text?: string;
      name?: string;
      description?: string;
    };

const DEFAULT_ITEMS_AR = [
  "دفع آمن 100%",
  "تابي وتمارا تقسيط",
  "الدفع عند الاستلام",
  "استرجاع سهل وسريع",
];

const DEFAULT_ITEMS_EN = [
  "100% Secure Checkout",
  "Tabby & Tamara BNPL",
  "Cash on Delivery",
  "Fast & Free Returns",
];

const TabbyIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#39F5AD" />
    <path d="M12 28V12H16V28H12ZM18 12H28V16H18V12ZM18 18H26V22H18V18Z" fill="black" />
  </svg>
);

const TamaraIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#FFC9B3" />
    <path d="M10 28V12H30V15H17.5V18.5H27.5V21.5H17.5V28H10Z" fill="black" />
  </svg>
);

const getTrustedBadgeLabel = (item: TrustedBadgeItemInput): string => {
  if (typeof item === "string") {
    return item;
  }

  if (!item || typeof item !== "object") {
    return "";
  }

  const candidates = [
    item.title,
    item.label,
    item.text,
    item.name,
    item.description,
  ];

  return candidates
    .map((candidate) => String(candidate || "").trim())
    .find(Boolean) || "";
};

const normalizeBadgeItems = (
  items: TrustedBadgeItemInput[] | undefined,
  isRTL: boolean,
): string[] => {
  const defaults = isRTL ? DEFAULT_ITEMS_AR : DEFAULT_ITEMS_EN;
  if (!Array.isArray(items) || items.length === 0) {
    return defaults;
  }

  const normalized = items
    .map(getTrustedBadgeLabel)
    .filter(Boolean)
    .slice(0, 8);

  return normalized.length > 0 ? normalized : defaults;
};

const normalizeDirectionalText = ({
  value,
  isRTL,
  englishDefaults,
  arabicFallback,
  englishFallback,
}: {
  value: string | undefined;
  isRTL: boolean;
  englishDefaults: string[];
  arabicFallback: string;
  englishFallback: string;
}) => {
  const trimmedValue = String(value || "").trim();
  if (!trimmedValue) {
    return isRTL ? arabicFallback : englishFallback;
  }

  if (isRTL && englishDefaults.includes(trimmedValue)) {
    return arabicFallback;
  }

  return trimmedValue;
};

const normalizeTrustedBadgeItem = (item: string, isRTL: boolean) => {
  const trimmedItem = String(item || "").trim();
  if (!isRTL || !trimmedItem) {
    return trimmedItem;
  }

  const translations: Record<string, string> = {
    "Trusted checkout": "دفع آمن وموثوق",
    "Secure checkout": "دفع آمن",
    "Visa & Mastercard": "فيزا وماستركارد",
    "Cash on delivery": "الدفع عند الاستلام",
    "Easy returns": "استرجاع سهل",
    "Fast & Free Returns": "استرجاع سريع ومجاني",
    "100% Secure Checkout": "دفع آمن 100%",
    "Show reassurance badges that align with your payment and fulfillment flow.":
      "اعرض شارات الثقة بما يتوافق مع وسائل الدفع والتجهيز في متجرك.",
  };

  return translations[trimmedItem] || trimmedItem;
};

const resolveBadgeIcon = (label: string): React.ComponentType<{ className?: string }> => {
  const value = label.toLowerCase();

  if (value.includes("tabby") || value.includes("تابي")) return TabbyIcon;
  if (value.includes("tamara") || value.includes("تمارا")) return TamaraIcon;

  if (
    value.includes("visa") ||
    value.includes("master") ||
    value.includes("card") ||
    value.includes("بطاق") ||
    value.includes("فيزا") ||
    value.includes("ماستر")
  ) {
    return CreditCard;
  }

  if (
    value.includes("cash") ||
    value.includes("delivery") ||
    value.includes("cod") ||
    value.includes("دفع") ||
    value.includes("توصيل") ||
    value.includes("استلام")
  ) {
    return Truck;
  }

  if (
    value.includes("return") ||
    value.includes("refund") ||
    value.includes("استرجاع") ||
    value.includes("replace") ||
    value.includes("تبديل")
  ) {
    return RotateCcw;
  }

  if (
    value.includes("secure") ||
    value.includes("safe") ||
    value.includes("protected") ||
    value.includes("shield") ||
    value.includes("آمن") ||
    value.includes("حماية")
  ) {
    return ShieldCheck;
  }

  if (
    value.includes("payment") ||
    value.includes("checkout") ||
    value.includes("wallet") ||
    value.includes("تسوق")
  ) {
    return WalletCards;
  }

  if (value.includes("fast") || value.includes("سريع")) return Zap;
  if (value.includes("original") || value.includes("أصلي")) return BadgeCheck;

  return BadgeCheck;
};

const TrustedBadgePanel: React.FC<TrustedBadgePanelProps> = ({
  title,
  subtitle,
  items,
  variant = "strip",
  className = "",
}) => {
  const { theme } = useStorefrontTheme();
  const isRTL = theme.direction === 'rtl';
  
  const displayTitle = normalizeDirectionalText({
    value: title,
    isRTL,
    englishDefaults: ["Trusted Checkout", "Trusted checkout"],
    arabicFallback: "دفع آمن وموثوق",
    englishFallback: "Trusted Checkout",
  });
  const displaySubtitle = normalizeDirectionalText({
    value: subtitle,
    isRTL,
    englishDefaults: [
      "Secure payment methods and reassurance messages connected to your store policy.",
      "Show reassurance badges that align with your payment and fulfillment flow.",
    ],
    arabicFallback: "اعرض شارات الثقة بما يتوافق مع وسائل الدفع والتجهيز في متجرك.",
    englishFallback: "Secure payment methods and reassurance messages connected to your store policy.",
  });
  
  const badgeItems = normalizeBadgeItems(items, isRTL).map((item) =>
    normalizeTrustedBadgeItem(item, isRTL),
  );

  const titleBlock = (
    <div className="mb-5 space-y-1">
      <h3 className="text-base font-black tracking-tight text-foreground sm:text-xl">
        {displayTitle}
      </h3>
      <p className="text-[11px] font-bold leading-relaxed text-muted-foreground/70 sm:text-xs">
        {displaySubtitle}
      </p>
    </div>
  );

  const minimalTitleBlock = (
    <div className="mb-3 space-y-1">
      <h3 className="text-sm font-black tracking-tight text-foreground sm:text-base">
        {displayTitle}
      </h3>
      <p className="text-[11px] leading-5 text-muted-foreground/80">
        {displaySubtitle}
      </p>
    </div>
  );

  const renderBadge = (item: string, isGrid = false) => {
    const Icon = resolveBadgeIcon(item);
    const isGraphic = Icon === TabbyIcon || Icon === TamaraIcon;
    
    return (
      <div
        key={item}
        className={cx(
          "group flex items-center gap-3 transition-all duration-500",
          isGrid 
            ? "rounded-2xl border border-border/10 bg-white/40 dark:bg-black/20 p-4 hover:border-primary/40 hover:bg-white/80 dark:hover:bg-black/40"
            : "rounded-full border border-border/20 bg-white/40 dark:bg-black/20 px-4 py-2 hover:border-primary/40 hover:bg-white/80 dark:hover:bg-black/40 shadow-sm"
        )}
      >
        <span className={cx(
          "inline-flex shrink-0 items-center justify-center transition-transform duration-500 group-hover:scale-110",
          isGrid ? "h-11 w-11 rounded-xl bg-primary/5 text-primary" : "h-5 w-5"
        )}>
          {isGraphic ? (
            <Icon className={cx("rounded-md", isGrid ? "h-8 w-8" : "h-5 w-5")} />
          ) : (
            <Icon className={cx(isGrid ? "h-6 w-6" : "h-4 w-4", "text-primary")} />
          )}
        </span>
        <span className={cx(
          "font-black tracking-tight text-foreground/90",
          isGrid ? "text-[12px]" : "whitespace-nowrap text-[11px]"
        )}>
          {item}
        </span>
      </div>
    );
  };

  if (variant === "grid") {
    return (
      <div className={cx(
        "rounded-[2.2rem] border border-border/40 bg-background/40 backdrop-blur-2xl p-6 shadow-xl", 
        className
      )}>
        {titleBlock}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {badgeItems.map((item) => renderBadge(item, true))}
        </div>
      </div>
    );
  }

  if (variant === "minimal") {
    return (
      <div className={cx("space-y-3", className)}>
        {minimalTitleBlock}
        <div className="flex flex-wrap gap-2">
          {badgeItems.map((item) => {
            const Icon = resolveBadgeIcon(item);
            const isGraphic = Icon === TabbyIcon || Icon === TamaraIcon;

            return (
              <div
                key={item}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-2 text-right shadow-[0_10px_24px_-22px_rgba(15,23,42,0.4)]"
              >
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/7 text-primary">
                  {isGraphic ? (
                    <Icon className="h-5 w-5 rounded-md" />
                  ) : (
                    <Icon className="h-4 w-4 text-primary" />
                  )}
                </span>
                <span className="text-[11px] font-bold leading-5 text-foreground/85 sm:text-xs">
                  {item}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (variant === "perfume-minimal") {
    return (
      <div className={cx("space-y-3", className)}>
        <div className="mb-3 space-y-1">
          <h3 className="text-sm font-black tracking-tight text-foreground sm:text-base">
            {displayTitle}
          </h3>
          <p className="text-[11px] leading-5 text-muted-foreground">
            {displaySubtitle}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {badgeItems.map((item) => {
            const Icon = resolveBadgeIcon(item);
            const isGraphic = Icon === TabbyIcon || Icon === TamaraIcon;

            return (
              <div
                key={item}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-[var(--button-radius)] border border-border bg-card px-3 py-2 text-right shadow-[0_12px_24px_-22px_rgba(15,23,42,0.14)]"
              >
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                  {isGraphic ? (
                    <Icon className="h-5 w-5 rounded-md" />
                  ) : (
                    <Icon className="h-4 w-4 text-primary" />
                  )}
                </span>
                <span className="text-[11px] font-bold leading-5 text-foreground sm:text-xs">
                  {item}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Improved "Strip" which acts as a Scroll area on small mobiles
  return (
    <div className={cx(
      "rounded-[2.2rem] border border-border/30 bg-background/20 backdrop-blur-md p-6", 
      className
    )}>
      {titleBlock}
      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1 -mx-2 px-2 scroll-smooth sm:flex-wrap sm:overflow-visible">
        {badgeItems.map((item) => renderBadge(item, false))}
      </div>
      
      {/* Visual Indicator for scroll */}
      <div className="mt-3 flex gap-1 sm:hidden">
        <div className="h-1 w-8 rounded-full bg-primary/20" />
        <div className="h-1 w-2 rounded-full bg-primary/10" />
      </div>
    </div>
  );
};

export default TrustedBadgePanel;
