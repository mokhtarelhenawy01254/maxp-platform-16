import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import tokenManager from "../../utils/tokenManager";

// Cockpit Dark Components
import { ClothingStoreNavbar } from "./clothing-store/ClothingStoreNavbar";
import { ClothingStoreHero } from "./clothing-store/ClothingStoreHero";
import { ClothingStoreBento } from "./clothing-store/ClothingStoreBento";
import { ClothingStoreToolsGrid } from "./clothing-store/ClothingStoreToolsGrid";
import { ClothingStorePricing } from "./clothing-store/ClothingStorePricing";

// Editorial Luxury Fashion Components
import { ClothingEditorialNavbar } from "./clothing-store/editorial/ClothingEditorialNavbar";
import { ClothingEditorialHero } from "./clothing-store/editorial/ClothingEditorialHero";
import { ClothingEditorialShopLook } from "./clothing-store/editorial/ClothingEditorialShopLook";
import { ClothingEditorialTools } from "./clothing-store/editorial/ClothingEditorialTools";
import { ClothingEditorialPricing } from "./clothing-store/editorial/ClothingEditorialPricing";

// Shared Modules
import { ClothingStoreLeadForm } from "./clothing-store/ClothingStoreLeadForm";
import { ClothingStoreFAQ } from "./clothing-store/ClothingStoreFAQ";
import { ClothingStoreFooter } from "./clothing-store/ClothingStoreFooter";
import { UtmData } from "./clothing-store/types";
import { WHATSAPP_CONSULT_URL } from "./clothing-store/clothingStoreData";

// Scoped CSS
import "./clothing-store/clothingStoreNative.css";
import "./clothing-store/editorial/clothingEditorial.css";
import { ArrowLeft } from "lucide-react";
import { MotionConfig } from "framer-motion";

const BUNDLE_SLUG = "store-complete-bundle";
const LANDING_SLUG = "clothing-store-bundle";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export const ClothingStoreLanding: React.FC = () => {
  const navigate = useNavigate();
  const [utm, setUtm] = useState<UtmData>({});
  const [, setIsCheckingOut] = useState(false);
  const [activeMode, setActiveMode] = useState<"editorial" | "cockpit">("editorial");

  // ── First-touch UTM capture & SEO tags ──
  useEffect(() => {
    const LANDING_TITLE = "MaxP لمتاجر الملابس — متجر مجاني 0 ج.م وباقة 999 في الشهر";
    const LANDING_DESCRIPTION = "باقة متجر الملابس الكاملة: متجر إلكتروني فاخر، كاشير فروع سحابي، مصفوفة مقاسات، ربط شحن بوسطة، ومستشار مقاسات ذكي — 999 ج.م/شهر شامل 17 أداة.";
    document.title = LANDING_TITLE;

    const metaChanges: Array<{ el: HTMLMetaElement; prev: string | null }> = [];
    const setMeta = (attr: "name" | "property", key: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      const prev = el ? el.content : null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.content = content;
      metaChanges.push({ el, prev });
    };
    setMeta("property", "og:title", LANDING_TITLE);
    setMeta("property", "og:description", LANDING_DESCRIPTION);
    setMeta("name", "twitter:title", LANDING_TITLE);
    setMeta("name", "twitter:description", LANDING_DESCRIPTION);

    // حدّث الـ canonical الموجود من index.html بدل إضافة ثانٍ (ملف واحد فقط مسموح)
    const canonical = document.head.querySelector<HTMLLinkElement>("link[rel='canonical']");
    const prevCanonical = canonical ? canonical.href : null;
    if (canonical) {
      canonical.href = `${window.location.origin}/lp/${LANDING_SLUG}`;
    } else {
      const created = document.createElement("link");
      created.rel = "canonical";
      created.href = `${window.location.origin}/lp/${LANDING_SLUG}`;
      document.head.appendChild(created);
    }

    const robotsMeta = document.createElement("meta");
    robotsMeta.name = "robots";
    robotsMeta.content = "noindex, nofollow";
    document.head.appendChild(robotsMeta);

    const fontLink = document.createElement("link");
    fontLink.rel = "stylesheet";
    fontLink.href = "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Playfair+Display:ital,wght@0,600;1,600&display=swap";
    document.head.appendChild(fontLink);

    // Read UTM
    try {
      const q = new URLSearchParams(window.location.search);
      const parsed: Record<string, string> = {};
      UTM_KEYS.forEach((k) => {
        const v = q.get(k);
        if (v) parsed[k] = v;
      });

      if (Object.keys(parsed).length > 0) {
        sessionStorage.setItem("cslp_utm", JSON.stringify(parsed));
        setUtm(parsed);
      } else {
        const stored = sessionStorage.getItem("cslp_utm");
        if (stored) setUtm(JSON.parse(stored));
      }
    } catch {
      // ignore
    }

    return () => {
      metaChanges.forEach(({ el, prev }) => {
        if (prev === null) {
          if (el.parentNode) el.parentNode.removeChild(el);
        } else {
          el.content = prev;
        }
      });
      if (canonical) {
        if (prevCanonical !== null) canonical.href = prevCanonical;
        else if (canonical.parentNode) canonical.parentNode.removeChild(canonical);
      }
      if (robotsMeta.parentNode) robotsMeta.parentNode.removeChild(robotsMeta);
      if (fontLink.parentNode) fontLink.parentNode.removeChild(fontLink);
    };
  }, []);

  const buildQueryString = useCallback(
    (extraParams: Record<string, string> = {}) => {
      const parts: string[] = [`landingBundle=${LANDING_SLUG}`];
      Object.entries(extraParams).forEach(([k, v]) => {
        if (v) parts.push(`${k}=${encodeURIComponent(v)}`);
      });
      UTM_KEYS.forEach((k) => {
        if (utm[k]) parts.push(`${k}=${encodeURIComponent(utm[k] as string)}`);
      });
      parts.push(`redirect=${encodeURIComponent(`/lp/${LANDING_SLUG}`)}`);
      return parts.join("&");
    },
    [utm]
  );

  // ── Registration & Checkout Handlers ──
  const handleFreeRegister = useCallback(() => {
    const q = buildQueryString({ tier: "free", source: "clothing", action: "free" });
    navigate(`/auth/register?${q}`);
  }, [navigate, buildQueryString]);

  const handlePaygRegister = useCallback(() => {
    const q = buildQueryString({ tier: "payg", source: "clothing", action: "free" });
    navigate(`/auth/register?${q}`);
  }, [navigate, buildQueryString]);

  const handleBundleCheckout = useCallback(async () => {
    const token = tokenManager.getAccessToken ? tokenManager.getAccessToken() : tokenManager.getToken?.();

    if (!token) {
      const q = buildQueryString({ plan: "999", tier: "bundle", source: "clothing", action: "paid" });
      navigate(`/auth/register?${q}`);
      return;
    }

    setIsCheckingOut(true);
    try {
      const res = await fetch(`/api/v1/marketplace/bundles/${BUNDLE_SLUG}/checkout`, {
        method: "POST",
        headers: {
          ...tokenManager.createAuthHeaders({ "Content-Type": "application/json" }),
        },
        credentials: "include",
        body: JSON.stringify({ utm, redirectUrl: window.location.href }),
      });

      const data = await res.json();
      if (data?.success && data?.sessionUrl) {
        window.location.href = data.sessionUrl;
        return;
      }
      alert(data?.message || "تعذر بدء الدفع، حاول مرة أخرى.");
    } catch {
      alert("تعذر الاتصال ببوابة الدفع، حاول مرة أخرى.");
    } finally {
      setIsCheckingOut(false);
    }
  }, [navigate, buildQueryString, utm]);

  const handleLogin = useCallback(() => {
    navigate("/auth/login");
  }, [navigate]);

  const prefersReducedMotion = () =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const scrollToPricing = useCallback(() => {
    const el = document.getElementById(activeMode === "editorial" ? "editorial-pricing" : "pricing");
    if (el) el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [activeMode]);

  return (
    <MotionConfig reducedMotion="user">
    <div className={activeMode === "editorial" ? "cse-root" : "csn-root"} dir="rtl">
      {/* Dynamic Navigation according to active mode */}
      {activeMode === "editorial" ? (
        <ClothingEditorialNavbar
          onFreeRegister={handleFreeRegister}
          onLogin={handleLogin}
          currentMode={activeMode}
          onToggleMode={setActiveMode}
        />
      ) : (
        <ClothingStoreNavbar
          onFreeRegister={handleFreeRegister}
          onLogin={handleLogin}
          currentMode={activeMode}
          onToggleMode={setActiveMode}
        />
      )}

      {/* Main Content Sections */}
      <main>
        {activeMode === "editorial" ? (
          <>
            {/* 1. Editorial Fashion Hero with Interactive Size Advisor */}
            <ClothingEditorialHero
              onFreeRegister={handleFreeRegister}
              onPricingScroll={scrollToPricing}
            />

            {/* 2. Interactive "Shop The Look" Module */}
            <ClothingEditorialShopLook
              onFreeRegister={handleFreeRegister}
              onPricingScroll={scrollToPricing}
            />

            {/* 3. The 17 Fashion Tools Suite Matrix */}
            <ClothingEditorialTools
              onPricingScroll={scrollToPricing}
            />

            {/* 4. Luxury Pricing Engine */}
            <ClothingEditorialPricing
              onFreeRegister={handleFreeRegister}
              onPaygRegister={handlePaygRegister}
              onBundleCheckout={handleBundleCheckout}
            />
          </>
        ) : (
          <>
            {/* Cockpit Mode Components */}
            <ClothingStoreHero
              onFreeRegister={handleFreeRegister}
              onPricingScroll={scrollToPricing}
            />
            <ClothingStoreBento />
            <ClothingStoreToolsGrid
              onSelectBundle={scrollToPricing}
            />
            <ClothingStorePricing
              onFreeRegister={handleFreeRegister}
              onPaygRegister={handlePaygRegister}
              onBundleCheckout={handleBundleCheckout}
            />
          </>
        )}

        {/* Shared Direct CRM Lead Intake Form */}
        <ClothingStoreLeadForm
          utm={utm}
          onFreeRegister={handleFreeRegister}
        />

        {/* Shared FAQ */}
        <ClothingStoreFAQ />
      </main>

      {/* Footer */}
      <ClothingStoreFooter onFreeRegister={handleFreeRegister} activeMode={activeMode} />

      {/* Sticky Mobile CTA Bar */}
      <div className={activeMode === "editorial" ? "cse-sticky-mobile" : "csn-sticky-mobile"}>
        <div className="flex flex-col">
          <span className="text-[10px] text-zinc-500 font-semibold">ابدأ متجرك 0 ج.م</span>
          <span className="text-sm font-extrabold text-zinc-950 cse-tabular">بدون بطاقة دفع</span>
        </div>

        <div className="flex items-center gap-1.5">
          <a
            href={WHATSAPP_CONSULT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs p-2.5 rounded-xl border border-black/10 font-bold bg-white text-emerald-700 flex items-center justify-center min-h-[44px] min-w-[44px]"
            title="تواصل عبر واتساب"
            aria-label="تواصل مع خبير الأزياء عبر واتساب"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </a>
          <button
            type="button"
            onClick={scrollToPricing}
            className="text-xs py-2 px-3 rounded-xl border border-black/10 font-bold bg-white text-black min-h-[44px]"
          >
            باقة 999
          </button>
          <button
            type="button"
            onClick={handleFreeRegister}
            className={activeMode === "editorial" ? "cse-btn-primary text-xs py-2 px-3 whitespace-nowrap min-h-[44px]" : "csn-btn-primary text-xs py-2 px-3 whitespace-nowrap min-h-[44px]"}
          >
            <span>افتح متجرك</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
    </MotionConfig>
  );
};

export default ClothingStoreLanding;
