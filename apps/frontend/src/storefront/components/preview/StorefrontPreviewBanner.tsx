import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useStorefrontTheme } from "../../engine/ThemeProvider";
import type { StorefrontTheme } from "../../types/theme.types";
import { useCartStore, DEFAULT_STOREFRONT_CART_STORAGE_NAME, getStorefrontPreviewCartStorageName } from "../../store/useCartStore";
import {
  buildStorefrontPath,
  buildStorefrontPreviewAdminPath,
  resolveStorefrontPreviewAdminOrigin,
  getStorefrontProductRouteKey,
} from "../../utils/paths";
import { useStorefrontSettings } from "../../hooks/useStorefrontSettings";
import { useCategories } from "../../hooks/useCategories";
import StorefrontProductImage from "../StorefrontProductImage";
import { getProductImageCandidates } from "../../utils/productImages";
import { getStorefrontMarketplaceAppSettings, isStorefrontMarketplaceAppEnabled } from "../../utils/marketplaceApps";
import { createStorefrontThemeTextReplacer } from "../../utils/runtimeBrandText";
import { isRuntimePharmacyThemeId } from "../header/StorefrontHeader";
import type { Product } from "../../hooks/useProducts";
import { useProduct } from "../../hooks/useProduct";
const StorefrontPreviewBanner: React.FC<{ previewThemeId: string }> = ({
  previewThemeId,
}) => {
  const { theme } = useStorefrontTheme();
  const location = useLocation();
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );
  const isSoleaFemme = theme.id === "solea-femme";
  const isBiteRush = theme.id === "restaurant-demo";
  const isCafeDemo = theme.id === "cafe-demo";
  const isMenShoes = theme.id === "men-shoes-eg";
  const isWomenFashion = theme.id === "women-fashion-eg";
  const isVelaFashion = theme.id === "vela-fashion-eg";
  const isPcHub = theme.id === "pc-hub-eg";
  const isAtelierNova = theme.id === "atelier-nova";
  const isRoseBoutique = theme.id === "rose-boutique-eg";
  const isCarryLane = theme.id === "elessi-carry-lane";
  const isHarvestFold = theme.id === "elessi-harvest-fold";
  const isSproutRoom = theme.id === "elessi-sprout-room";
  const isSignalDeck = theme.id === "elessi-signal-deck";
  const isPedalLab = theme.id === "elessi-pedal-lab";
  const isGlowRoutine = theme.id === "elessi-glow-routine";
  const isGemAtelier = theme.id === "elessi-gem-atelier";
  const isTailSupply = theme.id === "elessi-tail-supply";
  const isChronoGallery = theme.id === "elessi-chrono-gallery";
  const isGarageFit = theme.id === "elessi-garage-fit";
  const isElessiPackTheme = theme.id?.startsWith("elessi-") === true;
  const isPharmacy = isRuntimePharmacyThemeId(theme.id);
  const isDentalLab = theme.id === "dental-lab-elite";
  const hasExplicitAdminOrigin = Boolean(
    resolveStorefrontPreviewAdminOrigin(location.search),
  );
  const marketplaceThemesUrl = buildStorefrontPreviewAdminPath(
    `/marketplace/themes?theme=${encodeURIComponent(previewThemeId)}`,
    location.search,
  );
  const storefrontSettingsUrl = buildStorefrontPreviewAdminPath(
    `/settings/storefront?theme=${encodeURIComponent(previewThemeId)}`,
    location.search,
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleResize = () => {
      setIsMobileViewport(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (isVelaFashion || theme.id === "fastly-eg") {
    return null;
  }

  if (isDentalLab) {
    return (
      <aside aria-label="شريط معاينة القالب" className="w-full border-b border-cyan-500/20 bg-[#060913] text-slate-300 py-2 px-3 sm:px-6 relative z-[75]">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
            </span>
            <span className="font-semibold text-white">معاينة: معمل أسنان رقمي CAD/CAM 2026</span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">— استعراض حي قبل التطبيق</span>
          </div>
          <div className="flex items-center gap-2 ms-auto">
            <Link
              to={marketplaceThemesUrl}
              className="inline-flex items-center justify-center rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-3 py-1.5 text-xs shadow-sm transition-colors"
            >
              العودة للقوالب
            </Link>
            <Link
              to={storefrontSettingsUrl}
              className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 font-medium px-3 py-1.5 text-xs transition-colors"
            >
              تخصيص
            </Link>
          </div>
        </div>
      </aside>
    );
  }

  if (isMobileViewport) {
    const mobileDockClassName = isBiteRush
      ? "border-[#f8c08c]/55 bg-[#111111]/92"
      : isCafeDemo
        ? "border-[#d9c1ab]/70 bg-[rgba(36,25,18,0.92)]"
        : isPharmacy
          ? "border-[#99f6e4]/70 bg-[rgba(247,255,253,0.94)]"
          : "border-border/70 bg-background/94";
    const mobileBackClassName = isBiteRush
      ? "bg-[#f97316] text-white shadow-[0_16px_34px_-18px_rgba(249,115,22,0.95)] hover:bg-[#ea580c]"
      : isCafeDemo
        ? "bg-[#d6a77a] text-[#2c1d14] shadow-[0_16px_34px_-18px_rgba(214,167,122,0.7)] hover:bg-[#c99666]"
        : isPharmacy
          ? "bg-[#0f766e] text-white shadow-[0_16px_34px_-18px_rgba(15,118,110,0.5)] hover:bg-[#0b5f59]"
          : "bg-primary text-primary-foreground shadow-[0_16px_34px_-18px_rgba(17,17,17,0.22)] hover:opacity-95";
    const mobileCustomizeClassName = isBiteRush
      ? "border-white/12 bg-white/8 text-[#ffd7bb] hover:bg-white/12"
      : isCafeDemo
        ? "border-[#d9c1ab]/45 bg-white/8 text-[#f4dfcc] hover:bg-white/12"
        : isPharmacy
          ? "border-[#99f6e4] bg-white text-[#0f766e] hover:bg-[#ecfdf9]"
          : "border-border bg-background text-foreground hover:border-primary/40 hover:text-primary";

    return (
      <div className="pointer-events-none fixed inset-x-0 top-24 z-[76] flex justify-end px-3">
        <div
          className={`pointer-events-auto inline-flex items-center gap-1 rounded-full border p-1.5 shadow-[0_26px_80px_-34px_rgba(17,17,17,0.32)] backdrop-blur-xl ${mobileDockClassName}`}
        >
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:-translate-y-0.5 ${mobileBackClassName}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <Link
            to={storefrontSettingsUrl}
            aria-label="تخصيص سريع"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-transform hover:-translate-y-0.5 ${mobileCustomizeClassName}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v4" />
              <path d="M12 17v4" />
              <path d="M3 12h4" />
              <path d="M17 12h4" />
              <path d="m5.64 5.64 2.83 2.83" />
              <path d="m15.53 15.53 2.83 2.83" />
              <path d="m5.64 18.36 2.83-2.83" />
              <path d="m15.53 8.47 2.83-2.83" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  if (isElessiPackTheme) {
    return (
      <div className="pointer-events-none fixed bottom-4 start-4 z-[76]">
        <div className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/92 p-1 shadow-[0_18px_48px_-34px_rgba(17,17,17,0.26)] backdrop-blur-xl">
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:-translate-y-0.5 hover:opacity-95"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <Link
            to={storefrontSettingsUrl}
            aria-label="تخصيص سريع"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground transition-transform hover:-translate-y-0.5 hover:border-primary/45 hover:text-primary"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v4" />
              <path d="M12 17v4" />
              <path d="M3 12h4" />
              <path d="M17 12h4" />
              <path d="m5.64 5.64 2.83 2.83" />
              <path d="m15.53 15.53 2.83 2.83" />
              <path d="m5.64 18.36 2.83-2.83" />
              <path d="m15.53 8.47 2.83-2.83" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  if (isVelaFashion) {
    return (
      <div className="pointer-events-none fixed bottom-3 start-3 z-[76]">
        <div className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-[#edd5cc] bg-white/92 p-1 shadow-[0_18px_48px_-34px_rgba(60,43,46,0.18)] backdrop-blur-xl">
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#2c2426] text-white transition-transform hover:-translate-y-0.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <Link
            to={storefrontSettingsUrl}
            aria-label="تخصيص سريع"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#edd5cc] bg-[#fff7f2] text-[#7a5d63] transition-transform hover:-translate-y-0.5 hover:border-[#d05d4b] hover:text-[#d05d4b]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v4" />
              <path d="M12 17v4" />
              <path d="M3 12h4" />
              <path d="M17 12h4" />
              <path d="m5.64 5.64 2.83 2.83" />
              <path d="m15.53 15.53 2.83 2.83" />
              <path d="m5.64 18.36 2.83-2.83" />
              <path d="m15.53 8.47 2.83-2.83" />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  if (theme.id === "redline-auto") {
    return (
      <div className="pointer-events-none fixed bottom-4 start-4 z-[76]">
        <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-[#0a0d10]/95 p-1.5 pe-4 shadow-[0_20px_45px_rgba(0,0,0,0.8)] backdrop-blur-xl">
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-white transition-transform hover:-translate-y-0.5 hover:bg-red-500 shadow-md"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <div className="flex flex-col text-start">
            <span className="text-[11px] font-bold text-white">معاينة Red Line Auto</span>
            <span className="text-[9px] text-white/50">اضغط للعودة إلى القوالب</span>
          </div>
        </div>
      </div>
    );
  }

  if (hasExplicitAdminOrigin && !isBiteRush && !isPharmacy && !isCafeDemo) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-24 z-[76] flex justify-end px-3 md:px-6">
        <Link
          to={marketplaceThemesUrl}
          className={`pointer-events-auto inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-bold shadow-[0_24px_60px_-30px_rgba(17,17,17,0.45)] transition-transform hover:-translate-y-0.5 ${
            isSoleaFemme
              ? "bg-primary text-primary-foreground"
              : "bg-amber-600 text-white hover:bg-amber-700"
          }`}
        >
          العودة إلى متجر القوالب
        </Link>
      </div>
    );
  }

  if (isBiteRush || isPharmacy || isCafeDemo) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-24 z-[76] flex justify-end px-3 md:px-6">
        <div
          className={`pointer-events-auto inline-flex items-center gap-1.5 rounded-full border p-1.5 shadow-[0_26px_80px_-34px_rgba(17,17,17,0.72)] backdrop-blur-xl ${
            isBiteRush
              ? "border-[#f8c08c]/55 bg-[#111111]/92"
              : isCafeDemo
                ? "border-[#d9c1ab]/75 bg-[rgba(36,25,18,0.92)]"
                : "border-[#99f6e4]/70 bg-[rgba(247,255,253,0.94)]"
          }`}
        >
          <span
            className={`hidden items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] sm:inline-flex ${
              isBiteRush
                ? "bg-white/8 text-[#ffd7bb]"
                : isCafeDemo
                  ? "bg-white/8 text-[#f4dfcc]"
                  : "bg-[#14b8a6]/10 text-[#0f766e]"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${isBiteRush ? "bg-[#f97316]" : isCafeDemo ? "bg-[#d6a77a]" : "bg-[#14b8a6]"}`}
            />
            وضع المعاينة
          </span>
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-white transition-transform hover:-translate-y-0.5 md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5 ${
              isBiteRush
                ? "bg-[#f97316] shadow-[0_16px_34px_-18px_rgba(249,115,22,0.95)] hover:bg-[#ea580c]"
                : isCafeDemo
                  ? "bg-[#d6a77a] text-[#2c1d14] shadow-[0_16px_34px_-18px_rgba(214,167,122,0.7)] hover:bg-[#c99666]"
                  : "bg-[#0f766e] shadow-[0_16px_34px_-18px_rgba(15,118,110,0.5)] hover:bg-[#0b5f59]"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">القوالب</span>
          </Link>
          <Link
            to={storefrontSettingsUrl}
            aria-label="تخصيص سريع"
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition-transform hover:-translate-y-0.5 md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5 ${
              isBiteRush
                ? "border-white/12 bg-white/8 text-[#ffd7bb] hover:bg-white/12"
                : isCafeDemo
                  ? "border-[#d9c1ab]/45 bg-white/8 text-[#f4dfcc] hover:bg-white/12"
                  : "border-[#99f6e4] bg-white text-[#0f766e] hover:bg-[#ecfdf9]"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v4" />
              <path d="M12 17v4" />
              <path d="M3 12h4" />
              <path d="M17 12h4" />
              <path d="m5.64 5.64 2.83 2.83" />
              <path d="m15.53 15.53 2.83 2.83" />
              <path d="m5.64 18.36 2.83-2.83" />
              <path d="m15.53 8.47 2.83-2.83" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">تخصيص</span>
          </Link>
        </div>
      </div>
    );
  }

  if (isMenShoes) {
    return (
      <div className="border-b border-[#eadccf] bg-[linear-gradient(180deg,#f9f1ea_0%,#fffdfa_100%)] backdrop-blur">
        <div className="container px-4 py-3 md:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1 text-right">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#eadccf] bg-white px-3 py-1 text-[11px] font-black text-[#8d5d2f] shadow-sm">
                <span className="h-2 w-2 rounded-full bg-[#f57a1d]" />
                معاينة سريعة
              </div>
              <p className="text-sm font-bold text-[#3b2414]">
                أنت تشاهد قالب {theme.name} قبل التطبيق.
              </p>
              <p className="text-xs leading-6 text-[#8c5f34]">
                هذه نسخة مراجعة فقط. ارجع للقوالب أو التخصيص عند الحاجة.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
              <Link
                to={marketplaceThemesUrl}
                className="inline-flex items-center justify-center rounded-full bg-[#1f262b] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#12181c]"
              >
                القوالب
              </Link>
              <Link
                to={storefrontSettingsUrl}
                className="inline-flex items-center justify-center rounded-full border border-[#ded0c2] bg-white px-4 py-2.5 text-sm font-bold text-[#4f4034] hover:border-[#f57a1d] hover:text-[#f57a1d]"
              >
                تخصيص
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isWomenFashion) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-20 z-[76] flex justify-end px-3 md:top-24 md:px-6">
        <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[#ead9d8] bg-white/92 p-1.5 shadow-[0_24px_70px_-36px_rgba(107,33,49,0.22)] backdrop-blur-xl">
          <span className="hidden items-center gap-2 rounded-full bg-[#fff4f0] px-3 py-2 text-[10px] font-black tracking-[0.22em] text-[#8b3d33] sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-[#d86b55]" />
            معاينة
          </span>
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#3f2f35] text-white shadow-[0_16px_34px_-18px_rgba(63,47,53,0.45)] transition-transform hover:-translate-y-0.5 hover:bg-[#2e2227] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">القوالب</span>
          </Link>
          <Link
            to={storefrontSettingsUrl}
            aria-label="تخصيص سريع"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#ead9d8] bg-[#fff7f5] text-[#8b3d33] shadow-[0_16px_34px_-18px_rgba(216,107,85,0.18)] transition-transform hover:-translate-y-0.5 hover:border-[#d86b55] hover:bg-white md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v4" />
              <path d="M12 17v4" />
              <path d="M3 12h4" />
              <path d="M17 12h4" />
              <path d="m5.64 5.64 2.83 2.83" />
              <path d="m15.53 15.53 2.83 2.83" />
              <path d="m5.64 18.36 2.83-2.83" />
              <path d="m15.53 8.47 2.83-2.83" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">تخصيص</span>
          </Link>
        </div>
      </div>
    );
  }

  if (isSoleaFemme) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-20 z-[76] flex justify-end px-3 md:top-24 md:px-6">
        <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[#ead8cf] bg-[rgba(255,252,248,0.94)] p-1.5 shadow-[0_24px_70px_-36px_rgba(47,35,45,0.22)] backdrop-blur-xl">
          <span className="hidden items-center gap-2 rounded-full bg-[#2f232d] px-3 py-2 text-[10px] font-black tracking-[0.22em] text-white sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-[#d8b28a]" />
            Solea Preview
          </span>
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#2f232d] text-white shadow-[0_16px_34px_-18px_rgba(47,35,45,0.44)] transition-transform hover:-translate-y-0.5 hover:bg-[#241a22] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">القوالب</span>
          </Link>
          <Link
            to={storefrontSettingsUrl}
            aria-label="تخصيص سريع"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#ead8cf] bg-white text-[#6f5448] shadow-[0_16px_34px_-18px_rgba(111,84,72,0.14)] transition-transform hover:-translate-y-0.5 hover:border-[#d8b28a] hover:text-[#2f232d] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v4" />
              <path d="M12 17v4" />
              <path d="M3 12h4" />
              <path d="M17 12h4" />
              <path d="m5.64 5.64 2.83 2.83" />
              <path d="m15.53 15.53 2.83 2.83" />
              <path d="m5.64 18.36 2.83-2.83" />
              <path d="m15.53 8.47 2.83-2.83" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">تخصيص</span>
          </Link>
        </div>
      </div>
    );
  }

  if (isRoseBoutique || isAtelierNova) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-20 z-[76] flex justify-center px-3 md:top-24 md:justify-end md:px-6">
        <div
          className={`pointer-events-auto inline-flex items-center gap-1.5 rounded-full border bg-white/92 p-1.5 backdrop-blur-xl ${
            isAtelierNova
              ? "border-[#ddd2ca] shadow-[0_24px_70px_-36px_rgba(44,36,38,0.16)]"
              : "border-[#ead8d2] shadow-[0_24px_70px_-36px_rgba(91,42,58,0.18)]"
          }`}
        >
          <span
            className={`hidden items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black tracking-[0.22em] sm:inline-flex ${
              isAtelierNova
                ? "bg-[#faf4ef] text-[#7b6257]"
                : "bg-[#fff5f4] text-[#8d5568]"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isAtelierNova ? "bg-[#b78f79]" : "bg-[#d9a2b1]"
              }`}
            />
            معاينة
          </span>
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-white transition-transform hover:-translate-y-0.5 md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5 ${
              isAtelierNova
                ? "bg-[#2c2426] shadow-[0_16px_34px_-18px_rgba(44,36,38,0.38)] hover:bg-[#1f191b]"
                : "bg-[#5c263b] shadow-[0_16px_34px_-18px_rgba(92,38,59,0.38)] hover:bg-[#4a1d30]"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">القوالب</span>
          </Link>
          <Link
            to={storefrontSettingsUrl}
            aria-label="تخصيص سريع"
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition-transform hover:-translate-y-0.5 md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5 ${
              isAtelierNova
                ? "border-[#ddd2ca] bg-[#fffaf7] text-[#7b6257] shadow-[0_16px_34px_-18px_rgba(123,98,87,0.14)] hover:border-[#b78f79] hover:bg-white"
                : "border-[#ead8d2] bg-[#fffaf8] text-[#8d5568] shadow-[0_16px_34px_-18px_rgba(160,97,120,0.14)] hover:border-[#d9a2b1] hover:bg-white"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v4" />
              <path d="M12 17v4" />
              <path d="M3 12h4" />
              <path d="M17 12h4" />
              <path d="m5.64 5.64 2.83 2.83" />
              <path d="m15.53 15.53 2.83 2.83" />
              <path d="m5.64 18.36 2.83-2.83" />
              <path d="m15.53 8.47 2.83-2.83" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">تخصيص</span>
          </Link>
        </div>
      </div>
    );
  }

  if (isCarryLane) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-20 z-[76] flex justify-end px-3 md:top-24 md:px-6">
        <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[#e7dacd] bg-[rgba(255,255,255,0.94)] p-1.5 shadow-[0_22px_64px_-34px_rgba(61,41,29,0.22)] backdrop-blur-xl">
          <span className="hidden items-center gap-2 rounded-full bg-[#fbf3ea] px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#8a5b40] sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-[#c77b48]" />
            Carry Preview
          </span>
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#2a211d] text-white shadow-[0_16px_34px_-18px_rgba(42,33,29,0.54)] transition-transform hover:-translate-y-0.5 hover:bg-[#1d1714] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">القوالب</span>
          </Link>
          <Link
            to={storefrontSettingsUrl}
            aria-label="تخصيص سريع"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#e7dacd] bg-white text-[#7a5340] shadow-[0_16px_34px_-18px_rgba(122,83,64,0.16)] transition-transform hover:-translate-y-0.5 hover:border-[#c77b48] hover:text-[#a25f39] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v4" />
              <path d="M12 17v4" />
              <path d="M3 12h4" />
              <path d="M17 12h4" />
              <path d="m5.64 5.64 2.83 2.83" />
              <path d="m15.53 15.53 2.83 2.83" />
              <path d="m5.64 18.36 2.83-2.83" />
              <path d="m15.53 8.47 2.83-2.83" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">تخصيص</span>
          </Link>
        </div>
      </div>
    );
  }

  if (isHarvestFold) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-20 z-[76] flex justify-end px-3 md:top-24 md:px-6">
        <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[#eadfcd] bg-[rgba(255,255,255,0.94)] p-1.5 shadow-[0_22px_64px_-34px_rgba(45,59,39,0.22)] backdrop-blur-xl">
          <span className="hidden items-center gap-2 rounded-full bg-[#fff8ef] px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#8a6546] sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-[#d39c4d]" />
            Harvest Preview
          </span>
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#2d3b27] text-white shadow-[0_16px_34px_-18px_rgba(45,59,39,0.52)] transition-transform hover:-translate-y-0.5 hover:bg-[#202a1c] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">القوالب</span>
          </Link>
          <Link
            to={storefrontSettingsUrl}
            aria-label="تخصيص سريع"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#eadfcd] bg-white text-[#6c5b49] shadow-[0_16px_34px_-18px_rgba(108,91,73,0.16)] transition-transform hover:-translate-y-0.5 hover:border-[#d39c4d] hover:text-[#8c5d1e] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v4" />
              <path d="M12 17v4" />
              <path d="M3 12h4" />
              <path d="M17 12h4" />
              <path d="m5.64 5.64 2.83 2.83" />
              <path d="m15.53 15.53 2.83 2.83" />
              <path d="m5.64 18.36 2.83-2.83" />
              <path d="m15.53 8.47 2.83-2.83" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">تخصيص</span>
          </Link>
        </div>
      </div>
    );
  }

  if (isSignalDeck) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-20 z-[76] flex justify-end px-3 md:top-24 md:px-6">
        <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[#dce3ec] bg-[rgba(255,255,255,0.94)] p-1.5 shadow-[0_22px_64px_-34px_rgba(15,23,42,0.2)] backdrop-blur-xl">
          <span className="hidden items-center gap-2 rounded-full bg-[#f7f9fc] px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#516170] sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
            معاينة
          </span>
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#161c26] text-white shadow-[0_16px_34px_-18px_rgba(22,28,38,0.5)] transition-transform hover:-translate-y-0.5 hover:bg-[#0d1219] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">القوالب</span>
          </Link>
          <Link
            to={storefrontSettingsUrl}
            aria-label="تخصيص سريع"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#dce3ec] bg-white text-[#516170] shadow-[0_16px_34px_-18px_rgba(81,97,112,0.14)] transition-transform hover:-translate-y-0.5 hover:border-[#f59e0b] hover:text-[#b45309] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v4" />
              <path d="M12 17v4" />
              <path d="M3 12h4" />
              <path d="M17 12h4" />
              <path d="m5.64 5.64 2.83 2.83" />
              <path d="m15.53 15.53 2.83 2.83" />
              <path d="m5.64 18.36 2.83-2.83" />
              <path d="m15.53 8.47 2.83-2.83" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">تخصيص</span>
          </Link>
        </div>
      </div>
    );
  }

  if (isPedalLab) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-20 z-[76] flex justify-end px-3 md:top-24 md:px-6">
        <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[#d9dee4] bg-[rgba(255,255,255,0.94)] p-1.5 shadow-[0_22px_64px_-34px_rgba(18,34,48,0.22)] backdrop-blur-xl">
          <span className="hidden items-center gap-2 rounded-full bg-[#f5f7fa] px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#516170] sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-[#d97706]" />
            Ride Preview
          </span>
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#1d2a33] text-white shadow-[0_16px_34px_-18px_rgba(29,42,51,0.52)] transition-transform hover:-translate-y-0.5 hover:bg-[#121d24] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">القوالب</span>
          </Link>
          <Link
            to={storefrontSettingsUrl}
            aria-label="تخصيص سريع"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d9dee4] bg-white text-[#516170] shadow-[0_16px_34px_-18px_rgba(81,97,112,0.14)] transition-transform hover:-translate-y-0.5 hover:border-[#d97706] hover:text-[#b45309] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v4" />
              <path d="M12 17v4" />
              <path d="M3 12h4" />
              <path d="M17 12h4" />
              <path d="m5.64 5.64 2.83 2.83" />
              <path d="m15.53 15.53 2.83 2.83" />
              <path d="m5.64 18.36 2.83-2.83" />
              <path d="m15.53 8.47 2.83-2.83" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">تخصيص</span>
          </Link>
        </div>
      </div>
    );
  }

  if (isGlowRoutine) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-20 z-[76] flex justify-end px-3 md:top-24 md:px-6">
        <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[#ead7d1] bg-[rgba(255,255,255,0.94)] p-1.5 shadow-[0_22px_64px_-34px_rgba(91,57,40,0.18)] backdrop-blur-xl">
          <span className="hidden items-center gap-2 rounded-full bg-[#fff6f1] px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#9a6354] sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-[#eb8b73]" />
            Glow Preview
          </span>
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#2f2422] text-white shadow-[0_16px_34px_-18px_rgba(47,36,34,0.44)] transition-transform hover:-translate-y-0.5 hover:bg-[#241b1a] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">القوالب</span>
          </Link>
          <Link
            to={storefrontSettingsUrl}
            aria-label="تخصيص سريع"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#ead7d1] bg-white text-[#9a6354] shadow-[0_16px_34px_-18px_rgba(154,99,84,0.14)] transition-transform hover:-translate-y-0.5 hover:border-[#d78b74] hover:text-[#8e5548] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v4" />
              <path d="M12 17v4" />
              <path d="M3 12h4" />
              <path d="M17 12h4" />
              <path d="m5.64 5.64 2.83 2.83" />
              <path d="m15.53 15.53 2.83 2.83" />
              <path d="m5.64 18.36 2.83-2.83" />
              <path d="m15.53 8.47 2.83-2.83" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">تخصيص</span>
          </Link>
        </div>
      </div>
    );
  }

  if (isGemAtelier) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-20 z-[76] flex justify-end px-3 md:top-24 md:px-6">
        <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[#e7d7cf] bg-[rgba(255,255,255,0.94)] p-1.5 shadow-[0_22px_64px_-34px_rgba(56,36,38,0.18)] backdrop-blur-xl">
          <span className="hidden items-center gap-2 rounded-full bg-[#fff6f1] px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#8f5c44] sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-[#d8a56a]" />
            Gem Preview
          </span>
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#2d211e] text-white shadow-[0_16px_34px_-18px_rgba(45,33,30,0.44)] transition-transform hover:-translate-y-0.5 hover:bg-[#211816] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">القوالب</span>
          </Link>
          <Link
            to={storefrontSettingsUrl}
            aria-label="تخصيص سريع"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#e7d7cf] bg-white text-[#8f5c44] shadow-[0_16px_34px_-18px_rgba(143,92,68,0.14)] transition-transform hover:-translate-y-0.5 hover:border-[#d8a56a] hover:text-[#7b4f3d] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v4" />
              <path d="M12 17v4" />
              <path d="M3 12h4" />
              <path d="M17 12h4" />
              <path d="m5.64 5.64 2.83 2.83" />
              <path d="m15.53 15.53 2.83 2.83" />
              <path d="m5.64 18.36 2.83-2.83" />
              <path d="m15.53 8.47 2.83-2.83" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">تخصيص</span>
          </Link>
        </div>
      </div>
    );
  }

  if (isTailSupply) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-20 z-[76] flex justify-end px-3 md:top-24 md:px-6">
        <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[#d9e3d7] bg-[rgba(255,255,255,0.94)] p-1.5 shadow-[0_22px_64px_-34px_rgba(34,62,49,0.2)] backdrop-blur-xl">
          <span className="hidden items-center gap-2 rounded-full bg-[#f4faf4] px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#35624a] sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
            Tail Preview
          </span>
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#234233] text-white shadow-[0_16px_34px_-18px_rgba(35,66,51,0.44)] transition-transform hover:-translate-y-0.5 hover:bg-[#183126] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">القوالب</span>
          </Link>
          <Link
            to={storefrontSettingsUrl}
            aria-label="تخصيص سريع"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d9e3d7] bg-white text-[#35624a] shadow-[0_16px_34px_-18px_rgba(53,98,74,0.14)] transition-transform hover:-translate-y-0.5 hover:border-[#f59e0b] hover:text-[#9a5f05] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v4" />
              <path d="M12 17v4" />
              <path d="M3 12h4" />
              <path d="M17 12h4" />
              <path d="m5.64 5.64 2.83 2.83" />
              <path d="m15.53 15.53 2.83 2.83" />
              <path d="m5.64 18.36 2.83-2.83" />
              <path d="m15.53 8.47 2.83-2.83" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">تخصيص</span>
          </Link>
        </div>
      </div>
    );
  }

  if (isChronoGallery) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-20 z-[76] flex justify-end px-3 md:top-24 md:px-6">
        <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[#d8ddd7] bg-[rgba(255,255,255,0.94)] p-1.5 shadow-[0_22px_64px_-34px_rgba(28,38,48,0.2)] backdrop-blur-xl">
          <span className="hidden items-center gap-2 rounded-full bg-[#f7f8fa] px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#5f6974] sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-[#c59d52]" />
            Chrono Preview
          </span>
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#1f2731] text-white shadow-[0_16px_34px_-18px_rgba(31,39,49,0.44)] transition-transform hover:-translate-y-0.5 hover:bg-[#151b22] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">القوالب</span>
          </Link>
          <Link
            to={storefrontSettingsUrl}
            aria-label="تخصيص سريع"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d8ddd7] bg-white text-[#5f6974] shadow-[0_16px_34px_-18px_rgba(95,105,116,0.14)] transition-transform hover:-translate-y-0.5 hover:border-[#c59d52] hover:text-[#8e6b1f] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v4" />
              <path d="M12 17v4" />
              <path d="M3 12h4" />
              <path d="M17 12h4" />
              <path d="m5.64 5.64 2.83 2.83" />
              <path d="m15.53 15.53 2.83 2.83" />
              <path d="m5.64 18.36 2.83-2.83" />
              <path d="m15.53 8.47 2.83-2.83" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">تخصيص</span>
          </Link>
        </div>
      </div>
    );
  }

  if (isGarageFit) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-20 z-[76] flex justify-end px-3 md:top-24 md:px-6">
        <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[#3b2a24] bg-[rgba(20,19,18,0.92)] p-1.5 shadow-[0_22px_64px_-34px_rgba(12,12,12,0.48)] backdrop-blur-xl">
          <span className="hidden items-center gap-2 rounded-full bg-[#261d1a] px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#f6b26b] sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-[#f97316]" />
            Garage Preview
          </span>
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#f97316] text-white shadow-[0_16px_34px_-18px_rgba(249,115,22,0.48)] transition-transform hover:-translate-y-0.5 hover:bg-[#ea580c] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">القوالب</span>
          </Link>
          <Link
            to={storefrontSettingsUrl}
            aria-label="تخصيص سريع"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#4b3329] bg-[#181614] text-[#f5d6b4] shadow-[0_16px_34px_-18px_rgba(20,19,18,0.42)] transition-transform hover:-translate-y-0.5 hover:border-[#f97316] hover:text-[#ffb76c] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v4" />
              <path d="M12 17v4" />
              <path d="M3 12h4" />
              <path d="M17 12h4" />
              <path d="m5.64 5.64 2.83 2.83" />
              <path d="m15.53 15.53 2.83 2.83" />
              <path d="m5.64 18.36 2.83-2.83" />
              <path d="m15.53 8.47 2.83-2.83" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">تخصيص</span>
          </Link>
        </div>
      </div>
    );
  }

  if (isSproutRoom) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-20 z-[76] flex justify-end px-3 md:top-24 md:px-6">
        <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[#dfe7d5] bg-[rgba(255,255,255,0.94)] p-1.5 shadow-[0_22px_64px_-34px_rgba(42,62,35,0.28)] backdrop-blur-xl">
          <span className="hidden items-center gap-2 rounded-full bg-[#f6fbf1] px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#5b7d24] sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-[#83b735]" />
            Plant Preview
          </span>
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#83b735] text-white shadow-[0_16px_34px_-18px_rgba(131,183,53,0.7)] transition-transform hover:-translate-y-0.5 hover:bg-[#73a32b] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">القوالب</span>
          </Link>
          <Link
            to={storefrontSettingsUrl}
            aria-label="تخصيص سريع"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#dfe7d5] bg-white text-[#48603d] shadow-[0_16px_34px_-18px_rgba(72,96,61,0.18)] transition-transform hover:-translate-y-0.5 hover:border-[#83b735] hover:text-[#6b9a29] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v4" />
              <path d="M12 17v4" />
              <path d="M3 12h4" />
              <path d="M17 12h4" />
              <path d="m5.64 5.64 2.83 2.83" />
              <path d="m15.53 15.53 2.83 2.83" />
              <path d="m5.64 18.36 2.83-2.83" />
              <path d="m15.53 8.47 2.83-2.83" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">تخصيص</span>
          </Link>
        </div>
      </div>
    );
  }

  if (isPcHub) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-20 z-[76] flex justify-center px-3 md:top-24 md:justify-end md:px-6">
        <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[#d7dde7] bg-white/92 p-1.5 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.35)] backdrop-blur-xl">
          <span className="hidden items-center gap-2 rounded-full bg-[#111827] px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-white sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-[#facc15]" />
            Preview
          </span>
          <Link
            to={marketplaceThemesUrl}
            aria-label="العودة إلى القوالب"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#111827] text-white shadow-[0_16px_34px_-18px_rgba(17,24,39,0.72)] transition-transform hover:-translate-y-0.5 hover:bg-[#1f2937] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rtl:rotate-180"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">القوالب</span>
          </Link>
          <Link
            to={storefrontSettingsUrl}
            aria-label="تخصيص سريع"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#f5d76c] bg-[#facc15] text-[#111827] shadow-[0_16px_34px_-18px_rgba(250,204,21,0.62)] transition-transform hover:-translate-y-0.5 hover:bg-[#f5c400] md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v4" />
              <path d="M12 17v4" />
              <path d="M3 12h4" />
              <path d="M17 12h4" />
              <path d="m5.64 5.64 2.83 2.83" />
              <path d="m15.53 15.53 2.83 2.83" />
              <path d="m5.64 18.36 2.83-2.83" />
              <path d="m15.53 8.47 2.83-2.83" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
            <span className="hidden text-sm font-bold md:inline">تخصيص</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`border-b backdrop-blur ${
        isSoleaFemme
          ? "border-primary/10 bg-[linear-gradient(90deg,hsl(var(--secondary)/0.95),hsl(var(--background)/0.98),hsl(var(--secondary)/0.95))]"
          : "border-amber-200 bg-amber-50/95 dark:border-amber-900 dark:bg-amber-950/40"
      }`}
    >
      <div className="container px-4 py-4 md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1 text-right">
            <div
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                isSoleaFemme
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
              }`}
            >
              معاينة مؤقتة
            </div>
            <p
              className={`text-sm font-semibold ${
                isSoleaFemme
                  ? "text-foreground"
                  : "text-amber-950 dark:text-amber-50"
              }`}
            >
              أنت تشاهد الآن قالب {theme.name} قبل تطبيقه على متجرك.
            </p>
            <p
              className={`text-xs leading-6 ${
                isSoleaFemme
                  ? "text-muted-foreground"
                  : "text-amber-800 dark:text-amber-200"
              }`}
            >
              هذه المعاينة لا تغيّر القالب الحالي. ارجع إلى متجر القوالب عندما
              تريد الشراء أو التطبيق.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to={marketplaceThemesUrl}
              className="inline-flex items-center justify-center rounded-2xl bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700"
            >
              العودة إلى متجر القوالب
            </Link>
            <Link
              to={storefrontSettingsUrl}
              className="inline-flex items-center justify-center rounded-2xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100 dark:hover:bg-amber-900/40"
            >
              تخصيص القالب من الإدارة
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

const StorefrontProductPreviewBanner: React.FC<{
  previewProductId?: string | null;
}> = ({ previewProductId }) => {
  const { theme } = useStorefrontTheme();
  const location = useLocation();
  const isSoleaFemme = theme.id === "solea-femme";
  const isVelaFashion = theme.id === "vela-fashion-eg";

  const productRouteKey = getStorefrontProductRouteKey(location.pathname);
  const { product } = useProduct(productRouteKey || undefined, {
    enabled: Boolean(productRouteKey) && !previewProductId,
  });

  const effectiveProductId = previewProductId || product?.id;

  const editLink = effectiveProductId
    ? `/products/${encodeURIComponent(effectiveProductId)}/edit`
    : "/products";
  const editUrl = buildStorefrontPreviewAdminPath(editLink, location.search);
  const productsUrl = buildStorefrontPreviewAdminPath(
    "/products",
    location.search,
  );

  if (theme.id === "dental-lab-elite" || (!productRouteKey && !previewProductId)) {
    return null;
  }

  if (isVelaFashion) {
    return (
      <div className="pointer-events-none fixed bottom-3 end-3 z-[75]">
        <div className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-[#edd5cc] bg-white/92 p-1 shadow-[0_18px_48px_-34px_rgba(60,43,46,0.16)] backdrop-blur-xl">
          <Link
            to={editUrl}
            aria-label="تعديل المنتج"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#d05d4b] text-white transition-transform hover:-translate-y-0.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </Link>
          <Link
            to={productsUrl}
            aria-label="قائمة المنتجات"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#edd5cc] bg-[#fff7f2] text-[#7a5d63] transition-transform hover:-translate-y-0.5 hover:border-[#d05d4b] hover:text-[#d05d4b]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M7 12h10" />
              <path d="M10 18h4" />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  const previewShellClassName = isSoleaFemme
    ? "pointer-events-auto inline-flex items-center gap-1 rounded-full border border-rose-200 bg-white/95 p-1 text-rose-950 shadow-[0_18px_48px_-30px_rgba(190,18,60,0.28)] backdrop-blur-xl"
    : "pointer-events-auto inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/95 p-1 text-slate-800 shadow-[0_18px_48px_-30px_rgba(15,23,42,0.22)] backdrop-blur-xl";
  const editActionClassName = isSoleaFemme
    ? "inline-flex h-9 w-9 items-center justify-center rounded-full bg-rose-600 text-white transition-transform hover:-translate-y-0.5"
    : "inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white transition-transform hover:-translate-y-0.5";
  const productsActionClassName = isSoleaFemme
    ? "inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-900 transition-transform hover:-translate-y-0.5"
    : "inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition-transform hover:-translate-y-0.5";

  return (
    <div className="pointer-events-none fixed bottom-3 end-3 z-[75] max-w-[calc(100vw-1.5rem)]">
      <div className={previewShellClassName} dir={theme.direction}>
        <span className="hidden max-w-[8rem] truncate px-2 text-xs font-bold sm:inline">
          {theme.direction === "rtl" ? "معاينة المنتج" : "Product preview"}
        </span>
        <Link
          to={editUrl}
          aria-label={
            theme.direction === "rtl" ? "تعديل المنتج" : "Edit product"
          }
          className={editActionClassName}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </Link>
        <Link
          to={productsUrl}
          aria-label={
            theme.direction === "rtl" ? "قائمة المنتجات" : "Products list"
          }
          className={productsActionClassName}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 6h18" />
            <path d="M7 12h10" />
            <path d="M10 18h4" />
          </svg>
        </Link>
      </div>
    </div>
  );
};


const MARKETPLACE_PREVIEW_CART_SEED_PREFIX =
  "sf-marketplace-preview-cart-seeded";

type PreviewCartSignatureItem = {
  id: string;
  productId: string;
  variantId?: string | null;
  imageUrl?: string | null;
  price: number;
  basePrice?: number | null;
  quantity: number;
  attributes?: Record<string, unknown> | null;
};

const serializeMarketplacePreviewCartItems = (
  items: PreviewCartSignatureItem[],
) =>
  items
    .map((item) =>
      [
        item.id,
        item.productId,
        item.variantId || "",
        item.imageUrl || "",
        item.price,
        item.basePrice ?? item.price,
        item.quantity,
        JSON.stringify(item.attributes || {}),
      ].join("::"),
    )
    .join("||");

const MarketplacePreviewCartBootstrap: React.FC<{
  previewThemeId?: string | null;
}> = ({ previewThemeId }) => {
  const marketplacePreviewThemeId = previewThemeId || "";
  const location = useLocation();
  const normalizedPath = location.pathname.replace(/\/+$/, "") || "/";
  const shouldShowPreviewCartSeed =
    normalizedPath.endsWith("/cart") ||
    normalizedPath.endsWith("/checkout") ||
    normalizedPath.endsWith("/thank-you");

  useEffect(() => {
    const persistApi = useCartStore.persist;
    if (!persistApi) {
      return;
    }

    const targetStorageName = marketplacePreviewThemeId
      ? getStorefrontPreviewCartStorageName(marketplacePreviewThemeId)
      : DEFAULT_STOREFRONT_CART_STORAGE_NAME;

    if (persistApi.getOptions().name === targetStorageName) {
      return;
    }

    useCartStore.setState({ items: [], isOpen: false });
    persistApi.setOptions({ name: targetStorageName });
    void persistApi.rehydrate();
  }, [marketplacePreviewThemeId]);

  useEffect(() => {
    if (!marketplacePreviewThemeId) {
      return;
    }

    let cancelled = false;

    void import("../../preview/marketplacePreviewCart").then(
      ({ getMarketplacePreviewCartItems }) => {
        if (cancelled) {
          return;
        }

        const previewItems =
          getMarketplacePreviewCartItems(marketplacePreviewThemeId);
        if (previewItems.length === 0) {
          return;
        }

        const seedSignature =
          serializeMarketplacePreviewCartItems(previewItems);
        const activeSeedKey = `${MARKETPLACE_PREVIEW_CART_SEED_PREFIX}:active:${marketplacePreviewThemeId}`;
        const currentItems = useCartStore.getState().items;
        const currentSignature = serializeMarketplacePreviewCartItems(currentItems);

        if (!shouldShowPreviewCartSeed) {
          if (
            currentSignature === seedSignature ||
            (typeof window !== "undefined" &&
              window.sessionStorage.getItem(activeSeedKey) === "1")
          ) {
            useCartStore.setState({ items: [], isOpen: false });
            if (typeof window !== "undefined") {
              window.sessionStorage.removeItem(activeSeedKey);
            }
          }
          return;
        }

        if (currentSignature !== seedSignature) {
          useCartStore.setState({ items: previewItems, isOpen: false });
        }
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(activeSeedKey, "1");
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [marketplacePreviewThemeId, shouldShowPreviewCartSeed]);

  return null;
};


export { StorefrontPreviewBanner, StorefrontProductPreviewBanner, MarketplacePreviewCartBootstrap };
export default StorefrontPreviewBanner;
