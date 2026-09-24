import React, { useEffect, useRef } from "react";
import Button from "../components/Button";
import { useStorefrontTheme } from "../engine/ThemeProvider";
import { usePdpSelectionStore } from "../store/usePdpSelectionStore";
import { useQuantityOfferSelectionStore } from "../store/useQuantityOfferSelectionStore";
import type { Product } from "../hooks/useProducts";
import PdpQuickOrderForm from "./PdpQuickOrderForm";
import {
  PDP_CHECKOUT_SECTION_ID,
  STOREFRONT_BUYBOX_ID,
  STOREFRONT_PDP_CHECKOUT_OPEN_EVENT,
  STOREFRONT_PDP_CHECKOUT_VISIBILITY_EVENT,
} from "../utils/pdpCheckout";

interface PdpQuickOrderPanelProps {
  product: Product & {
    imageUrl?: string;
    hasVariants: boolean;
  };
  className?: string;
  sectionSettings?: Record<string, unknown>;
  isOpen?: boolean;
}

const PdpQuickOrderPanel: React.FC<PdpQuickOrderPanelProps> = ({
  product,
  className,
  sectionSettings,
  isOpen = true,
}) => {
  const { theme } = useStorefrontTheme();
  const isSelectionReadyForProduct = usePdpSelectionStore(
    (state) =>
      state.selection?.productId === product.id
        ? Boolean(state.selection?.isSelectionReady)
        : false,
  );
  const quantityOfferSelection = useQuantityOfferSelectionStore(
    (state) => state.selection,
  );
  const sectionRef = useRef<HTMLElement | null>(null);
  const prefersArabicCopy = theme.direction === "rtl";
  const configuredBadgeText =
    typeof sectionSettings?.badgeText === "string" &&
    sectionSettings.badgeText.trim()
      ? sectionSettings.badgeText.trim()
      : "";
  const configuredTitle =
    typeof sectionSettings?.title === "string" && sectionSettings.title.trim()
      ? sectionSettings.title.trim()
      : "";
  const configuredSubtitle =
    typeof sectionSettings?.subtitle === "string" &&
    sectionSettings.subtitle.trim()
      ? sectionSettings.subtitle.trim()
      : "";
  const configuredScrollToBuyBoxText =
    typeof sectionSettings?.scrollToBuyBoxText === "string" &&
    sectionSettings.scrollToBuyBoxText.trim()
      ? sectionSettings.scrollToBuyBoxText.trim()
      : "";
  const configuredFormVariant =
    typeof sectionSettings?.formVariant === "string" &&
    sectionSettings.formVariant.trim()
      ? sectionSettings.formVariant.trim()
      : "";
  const configuredSurfaceMode =
    typeof sectionSettings?.surfaceMode === "string" &&
    sectionSettings.surfaceMode.trim()
      ? sectionSettings.surfaceMode.trim()
      : "";
  const showPanelHeader =
    typeof sectionSettings?.showPanelHeader === "boolean"
      ? sectionSettings.showPanelHeader
      : true;
  const configuredDecisionMode =
    typeof sectionSettings?.decisionMode === "string" &&
    sectionSettings.decisionMode.trim()
      ? sectionSettings.decisionMode.trim()
      : "";
  const isRedlineAutoQuickOrder =
    theme.id === "redline-auto" || configuredFormVariant === "redline-auto";
  const isSoleaFemmeQuickOrder =
    (theme.id === "solea-femme" || configuredFormVariant === "solea-femme") &&
    !isRedlineAutoQuickOrder;
  const isMenShoesQuickOrder =
    (theme.id === "men-shoes-eg" ||
      theme.id === "women-fashion-eg" ||
      isSoleaFemmeQuickOrder ||
      configuredFormVariant === "men-shoes-eg" ||
      configuredFormVariant === "women-fashion-eg") &&
    !isRedlineAutoQuickOrder;
  const isVelaFashionQuickOrder =
    (theme.id === "vela-fashion-eg" ||
      configuredFormVariant === "vela-fashion-eg") &&
    !isRedlineAutoQuickOrder;
  const isKhemetLuxeQuickOrder =
    (theme.id === "khemet-luxe-eg" ||
      configuredFormVariant === "khemet-luxe-eg") &&
    !isRedlineAutoQuickOrder;
  const isMergedBuyboxSurface = configuredSurfaceMode === "merged-buybox";
  const isPrimaryQuantityOfferDecision = configuredDecisionMode === "primary";
  const activeQuantityOffer =
    quantityOfferSelection && quantityOfferSelection.productId === product.id
      ? quantityOfferSelection
      : null;
  const isSelectionReady =
    isPrimaryQuantityOfferDecision
      ? Boolean(activeQuantityOffer?.isReady)
      : !product.hasVariants || isSelectionReadyForProduct;
  const shouldShowSelectionHelper =
    !isSelectionReady &&
    !(isMergedBuyboxSurface && isPrimaryQuantityOfferDecision);
  const headerTitle =
    configuredTitle ||
    (isRedlineAutoQuickOrder
      ? prefersArabicCopy
        ? "بيانات الشحن وتأكيد الطلب"
        : "Shipping & Order Confirmation"
      : isMenShoesQuickOrder
      ? prefersArabicCopy
        ? "أكمل الطلب من هنا"
        : "Complete your order here"
      : isVelaFashionQuickOrder
        ? prefersArabicCopy
          ? "أكملي الطلب الآن"
          : "Complete your order now"
      : "");
  const headerSubtitle =
    configuredSubtitle ||
    (isRedlineAutoQuickOrder
      ? prefersArabicCopy
        ? "استلم وجرب الستارة على حلق باب عربيتك وتأكد من المقاس الفابريقة قبل دفع أي قرش."
        : "Inspect on your car door frame before paying."
      : isMenShoesQuickOrder
      ? prefersArabicCopy
        ? "بعد اختيار المقاس، اكتب بياناتك فقط وسنؤكد معك الطلب."
        : "Choose the size, then leave your details and we will confirm the order."
      : isVelaFashionQuickOrder
        ? prefersArabicCopy
          ? "اختاري اللون أو المقاس أولًا، ثم اتركي بياناتك وسنتواصل معك لتأكيد الطلب."
          : "Choose the color or size first, then leave your details and we will confirm the order."
      : "");
  const shouldRenderPanelHeader =
    !isMenShoesQuickOrder &&
    !(isKhemetLuxeQuickOrder && isMergedBuyboxSurface) &&
    showPanelHeader &&
    (headerTitle || headerSubtitle || configuredBadgeText);
  const shellClassName = className
    ? className
    : isRedlineAutoQuickOrder
      ? "space-y-4 rounded-2xl border border-slate-200/90 bg-white p-4.5 sm:p-6 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.1),0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5 dark:border-slate-800 dark:bg-slate-950/70 dark:ring-white/10 transition-shadow"
      : isSoleaFemmeQuickOrder
      ? isMergedBuyboxSurface
        ? "space-y-0"
        : "space-y-3 rounded-[1.55rem] border border-[#ead8cf] bg-[linear-gradient(180deg,#fffdf9_0%,#fff8f3_100%)] p-4 shadow-[0_24px_60px_-52px_rgba(47,35,45,0.18)]"
      : isMenShoesQuickOrder
      ? isMergedBuyboxSurface
        ? "space-y-0"
        : "space-y-3"
      : isVelaFashionQuickOrder
        ? "space-y-3 rounded-[1.45rem] border border-[#efd9df] bg-[linear-gradient(180deg,#fffefe_0%,#fff7f9_100%)] p-4 shadow-[0_20px_60px_-52px_rgba(176,125,139,0.18)]"
      : isKhemetLuxeQuickOrder && isMergedBuyboxSurface
        ? "-mx-1 space-y-0 sm:mx-0 sm:rounded-[1.55rem] sm:border sm:border-[#eadfd9] sm:bg-[#fffdfb] sm:p-4 sm:shadow-[0_20px_56px_-50px_rgba(54,36,27,0.16)]"
      : "rounded-[1.95rem] border border-primary/10 bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--secondary)/0.18))] p-4 shadow-[0_28px_90px_-75px_hsl(var(--primary)/0.4)] sm:p-5";

  const scrollIntoCheckout = () => {
    window.setTimeout(() => {
      sectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 60);
  };

  const handleScrollToBuyBox = () => {
    document.getElementById(STOREFRONT_BUYBOX_ID)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(STOREFRONT_PDP_CHECKOUT_VISIBILITY_EVENT, {
        detail: { open: true },
      }),
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent(STOREFRONT_PDP_CHECKOUT_VISIBILITY_EVENT, {
          detail: { open: false },
        }),
      );
    };
  }, []);

  useEffect(() => {
    const handleOpenCheckout = (event: Event) => {
      const customEvent = event as CustomEvent<{
        productId?: string;
        productKey?: string;
      }>;
      const requestedProductId = customEvent.detail?.productId;
      const requestedProductKey = customEvent.detail?.productKey;

      if (requestedProductId && requestedProductId !== product.id) {
        return;
      }

      if (
        requestedProductKey &&
        requestedProductKey !== product.slug &&
        requestedProductKey !== product.id
      ) {
        return;
      }

      scrollIntoCheckout();
    };

    window.addEventListener(
      STOREFRONT_PDP_CHECKOUT_OPEN_EVENT,
      handleOpenCheckout as EventListener,
    );

    return () => {
      window.removeEventListener(
        STOREFRONT_PDP_CHECKOUT_OPEN_EVENT,
        handleOpenCheckout as EventListener,
      );
    };
  }, [product.id, product.slug]);

  return (
    <section
      id={PDP_CHECKOUT_SECTION_ID}
      ref={sectionRef}
      className={shellClassName}
    >
      {shouldRenderPanelHeader ? (
        <div className="mb-4">
          {configuredBadgeText ? (
            <span
              className={
                isRedlineAutoQuickOrder
                  ? "inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50/80 px-3 py-1 text-xs font-bold text-red-700 shadow-sm dark:border-red-900/40 dark:bg-red-950/50 dark:text-red-300"
                  : "inline-flex items-center rounded-full border border-[#ead9c7] bg-[#fff8f1] px-3 py-1 text-[11px] font-black tracking-[0.16em] text-[#b45309]"
              }
            >
              {isRedlineAutoQuickOrder ? (
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
              ) : null}
              {configuredBadgeText}
            </span>
          ) : null}
          {headerTitle ? (
            <h3
              className={
                isRedlineAutoQuickOrder
                  ? "mt-2.5 text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white"
                  : "mt-3 text-xl font-black text-foreground sm:text-2xl"
              }
            >
              {headerTitle}
            </h3>
          ) : null}
          {headerSubtitle ? (
            <p
              className={
                isRedlineAutoQuickOrder
                  ? "mt-1 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-400"
                  : "mt-2 text-sm leading-7 text-muted-foreground"
              }
            >
              {headerSubtitle}
            </p>
          ) : null}
        </div>
      ) : null}

      {shouldShowSelectionHelper ? (
        <div
          className={
            isSoleaFemmeQuickOrder
              ? isMergedBuyboxSurface
                ? "mb-3 flex flex-col gap-3 rounded-[1rem] border border-[#ead8cf] bg-[#fff8f4] px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                : "flex flex-col gap-3 rounded-[1.2rem] border border-[#ead8cf] bg-[#fff8f4] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              : isMenShoesQuickOrder
              ? isMergedBuyboxSurface
                ? "mb-3 flex flex-col gap-3 rounded-[1rem] border border-[#f4c595] bg-[#fff7ef] px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                : "flex flex-col gap-3 rounded-[1.2rem] border border-[#f4c595] bg-[#fff7ef] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              : isVelaFashionQuickOrder
                ? "mb-4 flex flex-col gap-3 rounded-[1.2rem] border border-[#f2d7c7] bg-[#fff7f3] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              : "mb-4 flex flex-col gap-3 rounded-[1.2rem] border border-amber-200 bg-amber-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
          }
        >
            <p className="text-sm leading-7 text-amber-900">
              {isPrimaryQuantityOfferDecision
                ? prefersArabicCopy
                  ? isSoleaFemmeQuickOrder
                    ? "اختاري العرض وحددي اللون أو المقاس لكل قطعة بالأعلى، ثم أكملي بيانات الطلب هنا."
                    : "اختر العرض وحدد اللون أو المقاس لكل قطعة داخل كتلة الحسم بالأعلى، ثم أكمل الطلب من الفورم بالأسفل."
                  : "Choose the offer and complete each item selection in the decision block above, then complete the form below."
                : prefersArabicCopy
                  ? isSoleaFemmeQuickOrder
                    ? "اختاري المقاس أو اللون من خيارات المنتج بالأعلى أولًا، ثم أكملي الطلب من هنا."
                    : "اختر اللون أو المقاس من خيارات المنتج بالأعلى أولًا، ثم أكمل الطلب من الفورم بالأسفل."
                  : "Choose the color or size from the product options above first, then complete the form below."}
            </p>
          <Button
            type="button"
            size="sm"
            onClick={handleScrollToBuyBox}
            className="w-full font-black sm:w-auto"
          >
            {configuredScrollToBuyBoxText ||
              (prefersArabicCopy
                ? isPrimaryQuantityOfferDecision
                  ? "العودة لاختيار العرض"
                  : "العودة لاختيار المنتج"
                : isPrimaryQuantityOfferDecision
                  ? "Back to offer selection"
                  : "Back to product options")}
          </Button>
        </div>
      ) : null}

      <PdpQuickOrderForm
        product={product}
        sectionSettings={sectionSettings}
        hideHeader={Boolean(shouldRenderPanelHeader)}
      />
    </section>
  );

  if (!isOpen) return null;
};

export default PdpQuickOrderPanel;
