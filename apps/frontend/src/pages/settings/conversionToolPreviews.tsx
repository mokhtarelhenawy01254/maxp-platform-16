import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRightLeft,
  BadgeCheck,
  Camera,
  Check,
  Heart,
  Play,
  ShoppingCart,
  ShoppingBag,
  Star,
  Truck,
  X,
} from "lucide-react";
import type { JsonRecord } from "./useConversionTools";
import { getDeepValue } from "./useConversionTools";

import CountdownBlock from "../../storefront/sections/ConversionBlocks/CountdownBlock";
import DeliveryBlock from "../../storefront/sections/ConversionBlocks/DeliveryBlock";
import FakeVisitorBlock from "../../storefront/sections/ConversionBlocks/FakeVisitorBlock";
import LowStockBlock from "../../storefront/sections/ConversionBlocks/LowStockBlock";
import PreOrderBlock from "../../storefront/sections/ConversionBlocks/PreOrderBlock";
import PurchaseFomoBlock from "../../storefront/sections/ConversionBlocks/PurchaseFomoBlock";
import SoldCounterBlock from "../../storefront/sections/ConversionBlocks/SoldCounterBlock";
import TrustedBadgePanel from "../../storefront/components/TrustedBadgePanel";
import { StorefrontThemeProvider } from "../../storefront/engine/ThemeProvider";
import type { StorefrontThemeInput } from "../../storefront/engine/themeResolver";
import BackInStockSignupCard from "../../storefront/components/BackInStockSignupCard";

/** مكوّنات المتجر المستوردة تستهلك سياق ثيم المتجر — الغلاف ده إلزامي حول أي معاينة */
const PreviewTokensMode = React.createContext<"pinned" | "theme">("pinned");

/** بثيم التاجر: المحرك يطبق توكنات ثيمه؛ بدونه: توكنات فاتحة مثبتة */
export const ConversionToolPreviewProvider: React.FC<{
  children: React.ReactNode;
  initialTheme?: StorefrontThemeInput;
}> = ({ children, initialTheme }) => (
  <StorefrontThemeProvider initialTheme={initialTheme} scoped>
    <PreviewTokensMode.Provider value={initialTheme ? "theme" : "pinned"}>
      {children}
    </PreviewTokensMode.Provider>
  </StorefrontThemeProvider>
);

/**
 * "نافذة المتجر" — المعاينة تمثل Storefront التاجر وهي فاتحة بطبيعتها،
 * فبنثبت التوكنات الفاتحة جواها مهما كان وضع اللوحة (دارك/لايت).
 * كمان بتعزل توكنات shadcn المتغيرة مع .dark عن مكوّنات المتجر.
 */
const LIGHT_PREVIEW_TOKENS = {
  "--primary": "#4f46e5",
  "--primary-foreground": "#ffffff",
  "--background": "#ffffff",
  "--foreground": "#111827",
  "--muted": "#f3f4f6",
  "--muted-foreground": "#6b7280",
  "--card": "#ffffff",
  "--border": "#e5e7eb",
  "--radius": "0.75rem",
} as React.CSSProperties;

export const LightPreviewScope: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => {
  const mode = React.useContext(PreviewTokensMode);
  return (
    <div
      style={mode === "pinned" ? LIGHT_PREVIEW_TOKENS : undefined}
      className={`bg-white text-gray-900 ${className}`}
    >
      {children}
    </div>
  );
};

export interface ConversionToolPreviewContext {
  /** قيم إعدادات التطبيق (بما فيها التعديلات غير المحفوظة) — المعاينة تقرأ منها لحظيًا */
  settings: JsonRecord;
}

export const getFieldValueFromSettings = (settings: JsonRecord, path: string): unknown =>
  getDeepValue(settings, path.split("."));

const pad2 = (value: number) => String(value).padStart(2, "0");

const formatEgp = (value: number) => `${value.toLocaleString("ar-EG")} ج.م`;

/* ── أدوات مساعدة للنسخ الوهمية ─────────────────────────────── */

const MiniThumb = ({ className = "" }: { className?: string }) => (
  <div
    className={`flex shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-300 ${className}`}
  >
    <ShoppingBag className="h-4 w-4" />
  </div>
);

const Stars = () => (
  <span className="flex items-center gap-0.5 text-amber-400">
    {[0, 1, 2, 3, 4].map((index) => (
      <Star key={index} className="h-3 w-3 fill-current" />
    ))}
  </span>
);

/* ── معاينات الأدوات الفورية (block) ────────────────────────── */

const SALE_COUNTDOWN_END_OFFSET_MS =
  2 * 60 * 60 * 1000 + 47 * 60 * 1000 + 33 * 1000;

const SaleCountdownPreview = () => {
  const endRef = useRef(Date.now() + SALE_COUNTDOWN_END_OFFSET_MS);
  const [remaining, setRemaining] = useState(SALE_COUNTDOWN_END_OFFSET_MS);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemaining(Math.max(0, endRef.current - Date.now()));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const totalSeconds = Math.floor(remaining / 1000);
  const summary = `${pad2(Math.floor(totalSeconds / 3600))}:${pad2(
    Math.floor((totalSeconds % 3600) / 60),
  )}:${pad2(totalSeconds % 60)}`;

  return <CountdownBlock label="عرض نهاية الأسبوع ينتهي خلال" summary={summary} />;
};

const LowStockPreview = () => (
  <LowStockBlock
    count={4}
    label="مقاس 39 — الكمية محدودة"
    style="meter"
    progress={28}
  />
);

const SoldCounterPreview = () => (
  <SoldCounterBlock count={128} message="اتباع 128 قطعة من المنتج ده الأسبوع ده" />
);

const PurchaseFomoPreview = () => (
  <PurchaseFomoBlock count={14} message="14 عميل بيشوفوا المنتج ده دلوقتي" />
);

const DeliveryPreview = () => (
  <DeliveryBlock
    label="التوصيل المتوقع"
    range="خلال 2 إلى 4 أيام عمل"
    style="card"
  />
);

const FAKE_VISITOR_BASE = 23;

const FakeVisitorPreview = () => {
  const [count, setCount] = useState(FAKE_VISITOR_BASE);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCount(
        () =>
          FAKE_VISITOR_BASE +
          Math.floor(Math.random() * 7) -
          Math.floor(Math.random() * 5),
      );
    }, 3000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <FakeVisitorBlock
      count={count}
      message={`${count} زائر بيتصفحوا المنتج ده دلوقتي`}
    />
  );
};

const PreOrderPreview = () => (
  <PreOrderBlock
    title="اطلب دلوقتي قبل الشحنة الجاية"
    description="المخزون الحالي خلص — اطلب مسبقًا وتوصلك خلال 10 إلى 14 يوم"
    mode="dominant"
  />
);

/* ── معاينات مكوّنات موجودة (component) ─────────────────────── */

const TrustedBadgesPreview = () => (
  <TrustedBadgePanel
    title="اشترِ وانت مطمّن"
    subtitle="ضمان واسترجاع ودفع آمن"
    variant="grid"
    items={["دفع آمن 100%", "استرجاع خلال 14 يوم", "توصيل لكل المحافظات"]}
  />
);

const BackInStockPreview = () => (
  <BackInStockSignupCard
    productId="preview-product"
    productName="منتج تجريبي للمعاينة"
    title="نوّهني لما يرجع متاح"
    description="سيب رقم موبايلك ونبلغك أول ما مقاسك يتوفر"
    buttonLabel="نوّهني أول ما يتوفر"
    variant="panel"
  />
);

/* ── نسخ وهمية مبسطة (mock) ─────────────────────────────────── */

const StickyAddToCartPreview = () => (
  <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
    <div className="flex min-w-0 items-center gap-2.5">
      <MiniThumb className="h-9 w-9" />
      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-gray-900">
          شنطة جلد نسائية — أسود
        </p>
        <p className="text-[11px] font-black text-gray-700">1,299 ج.م</p>
      </div>
    </div>
    <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-[11px] font-black text-white">
      <ShoppingCart className="h-3.5 w-3.5" />
      أضف للسلة
    </span>
  </div>
);

const CROSS_SELL_ITEMS = [
  { name: "شيلان جلد مطابق", price: "349 ج.م" },
  { name: "حزام جلد طبيعي", price: "259 ج.م" },
];

const CrossSellPreview = ({ settings }: { settings?: Record<string, unknown> }) => {
  const copy = (settings?.["copy"] as Record<string, unknown>) || {};
  const title = String(copy["crossSellTitle"] || "").trim() || "يكمّل اختيارك";

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-black text-gray-500">{title}</p>
      <div className="grid grid-cols-2 gap-2">
        {CROSS_SELL_ITEMS.map((item) => (
          <div
            key={item.name}
            className="rounded-xl border border-gray-200 bg-white p-2.5"
          >
            <MiniThumb className="mb-2 h-14 w-full" />
            <p className="truncate text-[11px] font-bold text-gray-900">{item.name}</p>
            <p className="mt-0.5 flex items-center justify-between text-[11px] font-black text-gray-700">
              {item.price}
              <span className="rounded-md bg-gray-900 px-2 py-0.5 text-[10px] text-white">
                +
              </span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

const BoughtTogetherPreview = ({ settings }: { settings?: Record<string, unknown> }) => {
  const copy = (settings?.["copy"] as Record<string, unknown>) || {};
  const ui = (settings?.["ui"] as Record<string, unknown>) || {};
  const title = String(copy["boughtTogetherTitle"] || "").trim() || "كتير من العملاء بيشتروا التلاتة مع بعض";
  const desc = String(copy["boughtTogetherDescription"] || "").trim();
  const addLabel = String(copy["bundleAddLabel"] || "").trim() || "أضف الباقة";
  const style = String(ui["boughtTogetherStyle"] || "stacked");

  return (
    <div className="space-y-2.5 rounded-xl border border-gray-200 bg-white p-3">
      <div>
        <p className="text-[11px] font-black text-gray-900">{title}</p>
        {desc ? <p className="text-[10px] text-gray-500 mt-0.5">{desc}</p> : null}
      </div>
      <div className={`flex items-center gap-1.5 ${style === "stacked" ? "flex-wrap" : ""}`}>
        {["شنطة", "شيلان", "حزام"].map((name, index) => (
          <React.Fragment key={name}>
            {index > 0 ? <span className="text-[11px] font-black text-gray-400">+</span> : null}
            <span className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-2 py-1.5 text-[11px] font-bold text-gray-800">
              <MiniThumb className="h-6 w-6" />
              {name}
            </span>
          </React.Fragment>
        ))}
      </div>
      <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-2.5 py-2">
        <p className="text-[11px] font-black text-emerald-800">
          الباقة كاملة: 1,750 ج.م <span className="font-bold line-through opacity-70">2,100 ج.م</span>
        </p>
        <span className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-black text-white">
          {addLabel}
        </span>
      </div>
    </div>
  );
};

const BULK_TIERS = [
  { quantity: "قطعتين", discount: "10%" },
  { quantity: "3 قطع", discount: "15%", best: true },
  { quantity: "4 قطع أو أكتر", discount: "20%" },
];

const BulkSavingsPreview = () => (
  <div className="space-y-2">
    <p className="text-[11px] font-black text-gray-500">اشترِ أكتر ووفّر — الخصم بيحسب تلقائي</p>
    {BULK_TIERS.map((tier) => (
      <div
        key={tier.quantity}
        className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
          tier.best
            ? "border-emerald-300 bg-emerald-50"
            : "border-gray-200 bg-white"
        }`}
      >
        <p className="text-xs font-bold text-gray-900">{tier.quantity}</p>
        <p
          className={`text-xs font-black ${
            tier.best ? "text-emerald-700" : "text-gray-700"
          }`}
        >
          وفّر {tier.discount}
        </p>
      </div>
    ))}
  </div>
);

const BuyMoreSaveMorePreview = () => (
  <div className="space-y-2.5 rounded-xl border border-gray-200 bg-white p-3">
    <p className="text-xs font-black text-gray-900">اشترِ أكثر وفّر أكثر</p>
    <p className="text-[11px] leading-5 text-gray-500">
      امزج أي منتجات من المجموعة ووصّل لأقل سعر — الخصم بيتطبق على السلة.
    </p>
    <div className="grid grid-cols-3 gap-2 text-center">
      {["2 قطع = 10%", "3 قطع = 15%", "5 قطع = 25%"].map((label) => (
        <p
          key={label}
          className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-2 py-2 text-[11px] font-black text-gray-800"
        >
          {label}
        </p>
      ))}
    </div>
  </div>
);

const FREE_SHIPPING_SIMULATED_CART = 460;

const FreeShippingBarPreview = ({ settings }: ConversionToolPreviewContext) => {
  const threshold = Number(
    Number(getFieldValueFromSettings(settings, "thresholds.freeShippingAmount") || 0),
  );

  if (!threshold || threshold <= 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-3 py-3 text-center text-[11px] font-bold text-gray-500">
        حدّد مبلغ الشحن المجاني من الإعدادات جانبًا — الشريط هيتملى قدامك فورًا
      </div>
    );
  }

  const progress = Math.min(1, FREE_SHIPPING_SIMULATED_CART / threshold);
  const remaining = Math.max(0, Math.ceil(threshold - FREE_SHIPPING_SIMULATED_CART));
  const qualified = remaining <= 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <Truck className={`h-4 w-4 shrink-0 ${qualified ? "text-emerald-600" : "text-gray-500"}`} />
        <p className="text-xs font-bold text-gray-900">
          {qualified
            ? "مبروك! شحن طلبك بقى مجاني"
            : `فاضل ${formatEgp(remaining)} بس وتشحن مجانًا`}
        </p>
        {qualified ? <Check className="h-4 w-4 shrink-0 text-emerald-600" /> : null}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${
            qualified ? "bg-emerald-500" : "bg-gray-900"
          }`}
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
      <p className="mt-2 text-[10px] font-bold text-gray-400">
        سلة تجريبية بقيمة {formatEgp(FREE_SHIPPING_SIMULATED_CART)}
      </p>
    </div>
  );
};

const ExitIntentPopupPreview = ({ settings }: { settings?: Record<string, unknown> }) => {
  const copy = (settings?.["copy"] as Record<string, unknown>) || {};
  const title = String(copy["exitIntentTitle"] || "").trim() || "استنّى!";
  const coupon = String(copy["exitIntentCouponCode"] || "").trim() || "SAVE10";
  const desc = String(copy["exitIntentDescription"] || "").trim() || "سيب إيميلك وخد خصم 10% على أول طلب.";

  return (
    <div className="flex min-h-56 items-center justify-center rounded-xl bg-gray-900/20 p-4">
      <div className="relative w-64 rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
        <X className="absolute left-3 top-3 h-3.5 w-3.5 text-gray-300" />
        <p className="text-sm font-black text-gray-900">{title}</p>
        <p className="mt-1 text-[11px] leading-5 text-gray-600">{desc}</p>
        <div className="mt-2 flex items-center justify-between rounded-lg border border-dashed border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-700">
          <span>كوبون: {coupon}</span>
        </div>
        <div className="mt-3 h-9 rounded-lg border border-gray-200 bg-gray-50 px-3 text-[11px] leading-9 text-gray-400">
          بريدك الإلكتروني
        </div>
        <div className="mt-2 rounded-lg bg-gray-900 py-2 text-center text-[11px] font-black text-white">
          استخدام الخصم
        </div>
      </div>
    </div>
  );
};

const FakeSalePopupPreview = () => (
  <div className="flex min-h-32 items-end">
    <div className="flex w-72 items-center gap-2.5 rounded-xl border border-gray-200 bg-white p-3 shadow-md">
      <MiniThumb className="h-10 w-10" />
      <div className="min-w-0">
        <p className="truncate text-[11px] font-bold text-gray-900">
          أحمد من الجيزة اشترى «فستان صيفي»
        </p>
        <p className="text-[10px] font-bold text-gray-400">قبل 4 دقايق</p>
      </div>
    </div>
  </div>
);

const ExternalAffiliatePreview = () => (
  <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-3.5 text-center">
    <p className="text-xs font-bold text-gray-900">المنتج ده متاح من البائع الرسمي</p>
    <p className="text-[11px] leading-5 text-gray-500">
      الضغط على زر الشراء هينقلك للمنصة الخارجية لإتمام الطلب.
    </p>
    <div className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-[11px] font-black text-white">
      اشترِ من الموقع الرسمي
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      </svg>
    </div>
  </div>
);

const PhotoReviewsPreview = () => (
  <div className="space-y-2.5 rounded-xl border border-gray-200 bg-white p-3">
    <div className="flex items-center justify-between">
      <Stars />
      <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">
        <BadgeCheck className="h-3 w-3" />
        مشتري موثّق
      </span>
    </div>
    <p className="text-xs leading-6 text-gray-800">
      المنتج زى الصور بالظبط، والتوصيل كان أسرع من المتوقع. جودة تستاهل.
    </p>
    <div className="flex gap-2">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="flex h-14 w-14 items-center justify-center rounded-lg bg-gray-100 text-gray-300"
        >
          <Camera className="h-5 w-5" />
        </div>
      ))}
    </div>
    <p className="text-[11px] font-black text-gray-500">منى م. — منذ 3 أيام</p>
  </div>
);

const VideoReviewsPreview = () => (
  <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
    <div className="relative flex aspect-video items-center justify-center bg-gray-900">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90">
        <Play className="h-5 w-5 fill-gray-900 text-gray-900" />
      </span>
      <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-black text-white">
        0:42
      </span>
    </div>
    <div className="space-y-1.5 p-3">
      <Stars />
      <p className="text-xs leading-6 text-gray-800">تقييم فيديو من سارة — شاهدي التجربة بنفسك.</p>
    </div>
  </div>
);

const VerifiedBadgePreview = () => (
  <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-3">
    <div className="flex items-center justify-between">
      <Stars />
      <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">
        <BadgeCheck className="h-3 w-3" />
        مشتري موثّق
      </span>
    </div>
    <p className="text-xs leading-6 text-gray-800">جودة تستاهل كل جنيه — هطلب تاني أكيد.</p>
    <p className="text-[11px] font-black text-gray-500">سلمى ع. — منذ يومين</p>
  </div>
);

/* ── شرح تفاعلي بدل معاينة بصرية (note) ─────────────────────── */

const INACTIVE_TAB_DEMO_TITLE = "عرضك لسه مستنيك — كمّل شراءك";

const InactiveTabDemo = () => {
  const [state, setState] = useState<"idle" | "armed" | "done">("idle");

  useEffect(() => {
    if (state !== "armed") {
      return;
    }

    const originalTitle = window.document.title;

    const handleVisibility = () => {
      if (window.document.visibilityState === "hidden") {
        window.document.title = INACTIVE_TAB_DEMO_TITLE;
      } else {
        setState("done");
        window.setTimeout(() => {
          window.document.title = originalTitle;
        }, 2500);
      }
    };

    window.document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.document.removeEventListener("visibilitychange", handleVisibility);
      if (window.document.title === INACTIVE_TAB_DEMO_TITLE) {
        window.document.title = originalTitle;
      }
    };
  }, [state]);

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
      <p className="text-xs leading-6 text-gray-700">
        الأداة دي مش ليها شكل على الصفحة — بتغير عنوان التاب نفسه لما العميل يسيب الموقع
        ويرجع، فبترجّعه للعرض تاني.
      </p>
      {state === "idle" ? (
        <button
          type="button"
          onClick={() => setState("armed")}
          className="rounded-lg bg-gray-900 px-4 py-2 text-[11px] font-black text-white transition-colors hover:bg-gray-800"
        >
          جرّبها الآن
        </button>
      ) : null}
      {state === "armed" ? (
        <p className="text-[11px] font-black text-amber-700">
          سيب التاب دلوقتي وارجع تاني — وهتلاقي العنوان اتغير.
        </p>
      ) : null}
      {state === "done" ? (
        <p className="flex items-center justify-center gap-1.5 text-[11px] font-black text-emerald-700">
          <Check className="h-3.5 w-3.5" />
          ده بالظبط اللي هيشوفه العميل — عنوان التاب بقى «{INACTIVE_TAB_DEMO_TITLE}».
        </p>
      ) : null}
    </div>
  );
};

const ProductWishlistPreview = () => {
  const [wishlisted, setWishlisted] = useState(true);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
        <div className="aspect-[4/3] w-full bg-gradient-to-br from-stone-100 via-stone-50 to-stone-200 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-black text-white shadow-sm">
              خصم 20%
            </span>
            <button
              type="button"
              onClick={() => setWishlisted((prev) => !prev)}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-sm transition-all ${
                wishlisted
                  ? "border-[#d7b2a0] bg-[#fff2ec] text-[#b3533b] scale-105"
                  : "border-gray-200 bg-white/95 text-gray-400 hover:text-gray-700"
              }`}
              aria-label="Wishlist button"
            >
              <Heart className={`h-4 w-4 ${wishlisted ? "fill-current" : ""}`} />
            </button>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-white/90 p-2.5 backdrop-blur-sm border border-gray-200/80">
            <div>
              <p className="text-xs font-black text-gray-900">سنيكرز سبورت بلاتفورم</p>
              <p className="text-[11px] font-bold text-gray-500">1,250 ج.م</p>
            </div>
            <span className="text-[10px] font-bold text-stone-600 bg-stone-100 px-2 py-1 rounded-md">
              {wishlisted ? "مضاف للمفضلة ❤️" : "اضغط للقلب 🤍"}
            </span>
          </div>
        </div>
      </div>
      <p className="text-[11px] leading-5 text-gray-500 text-center">
        زر القلب يظهر مباشرة فوق صور المنتج في المعرض وعلى بطاقات المنتجات بالمتجر لتسهيل حفظ المنتجات المفضلة.
      </p>
    </div>
  );
};

const ProductComparisonPreview = () => {
  const [compared, setCompared] = useState(true);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
        <div className="aspect-[4/3] w-full bg-gradient-to-br from-stone-100 via-stone-50 to-stone-200 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-black text-white">
              معرض الصور
            </span>
            <button
              type="button"
              onClick={() => setCompared((prev) => !prev)}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-sm transition-all ${
                compared
                  ? "border-[#d4beae] bg-[#fff5ec] text-[#8f5c44] scale-105"
                  : "border-gray-200 bg-white/95 text-gray-400 hover:text-gray-700"
              }`}
              aria-label="Compare button"
            >
              <ArrowRightLeft className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-white/90 p-2.5 backdrop-blur-sm border border-gray-200/80">
            <div>
              <p className="text-xs font-black text-gray-900">سنيكرز سبورت بلاتفورم</p>
              <p className="text-[11px] font-bold text-gray-500">1,250 ج.م</p>
            </div>
            <span className="text-[10px] font-bold text-stone-600 bg-stone-100 px-2 py-1 rounded-md">
              {compared ? "محدد للمقارنة ⇄" : "اضغط للمقارنة"}
            </span>
          </div>
        </div>
      </div>
      <p className="text-[11px] leading-5 text-gray-500 text-center">
        زر المقارنة يتيح للعميل وضع المنتج في قائمة المقارنة للمفاضلة بين الخصائص والمواصفات بسهولة.
      </p>
    </div>
  );
};

/* ── الـ registry ───────────────────────────────────────────── */

type ToolPreviewRenderer = (context: ConversionToolPreviewContext) => React.ReactNode;

export const CONVERSION_TOOL_PREVIEWS: Record<string, ToolPreviewRenderer> = {
  saleCountdown: () => <SaleCountdownPreview />,
  lowStockNotice: () => <LowStockPreview />,
  soldCounter: () => <SoldCounterPreview />,
  purchaseFomo: () => <PurchaseFomoPreview />,
  estimatedDelivery: () => <DeliveryPreview />,
  fakeVisitorCounter: () => <FakeVisitorPreview />,
  preOrder: () => <PreOrderPreview />,
  trustedBadges: () => <TrustedBadgesPreview />,
  backInStock: () => <BackInStockPreview />,
  productWishlist: () => <ProductWishlistPreview />,
  productComparison: () => <ProductComparisonPreview />,
  stickyAddToCart: () => <StickyAddToCartPreview />,
  crossSell: (context) => <CrossSellPreview settings={context.settings} />,
  boughtTogether: (context) => <BoughtTogetherPreview settings={context.settings} />,
  bulkSavings: () => <BulkSavingsPreview />,
  buyMoreSaveMore: () => <BuyMoreSaveMorePreview />,
  freeShippingBar: (context) => <FreeShippingBarPreview settings={context.settings} />,
  inactiveTab: () => <InactiveTabDemo />,
  exitIntentPopup: (context) => <ExitIntentPopupPreview settings={context.settings} />,
  fakeSalePopup: () => <FakeSalePopupPreview />,
  externalAffiliate: () => <ExternalAffiliatePreview />,
  photoReviews: () => <PhotoReviewsPreview />,
  videoReviews: () => <VideoReviewsPreview />,
  verifiedBadge: () => <VerifiedBadgePreview />,
};

export const renderConversionToolPreview = (
  toolKey: string,
  context: ConversionToolPreviewContext,
): React.ReactNode => {
  const renderer = CONVERSION_TOOL_PREVIEWS[toolKey];
  if (!renderer) {
    return null;
  }
  return (
    <LightPreviewScope className="rounded-xl p-1">
      {renderer(context)}
    </LightPreviewScope>
  );
};

/** نسخة مصغّرة لكارت الفهرس — نفس المعاينة داخل حاوية مصغرة ثابتة */
export const renderConversionToolMiniPreview = (toolKey: string): React.ReactNode => {
  const renderer = CONVERSION_TOOL_PREVIEWS[toolKey];
  if (!renderer) {
    return null;
  }

  return (
    <div className="pointer-events-none w-full select-none" aria-hidden="true">
      <LightPreviewScope className="rounded-xl p-2">
        {renderer({ settings: { thresholds: { freeShippingAmount: 750 } } })}
      </LightPreviewScope>
    </div>
  );
};

export const useConversionToolPreviewCount = () =>
  useMemo(() => Object.keys(CONVERSION_TOOL_PREVIEWS).length, []);
