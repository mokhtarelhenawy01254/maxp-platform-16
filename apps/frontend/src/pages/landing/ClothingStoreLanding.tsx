import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import tokenManager from "../../utils/tokenManager";
import { ClothingStoreNavbar } from "./clothing-store/ClothingStoreNavbar";
import { ClothingStoreHero } from "./clothing-store/ClothingStoreHero";
import { ClothingStoreBento } from "./clothing-store/ClothingStoreBento";
import { ClothingStoreToolsGrid } from "./clothing-store/ClothingStoreToolsGrid";
import { ClothingStorePricing } from "./clothing-store/ClothingStorePricing";
import { ClothingStoreLeadForm } from "./clothing-store/ClothingStoreLeadForm";
import { ClothingStoreFAQ } from "./clothing-store/ClothingStoreFAQ";
import { ClothingStoreFooter } from "./clothing-store/ClothingStoreFooter";
import { UtmData } from "./clothing-store/types";
import "./clothing-store/clothingStoreNative.css";
import { ArrowLeft, Zap } from "lucide-react";

const BUNDLE_SLUG = "store-complete-bundle";
const LANDING_SLUG = "clothing-store-bundle";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export const ClothingStoreLanding: React.FC = () => {
  const navigate = useNavigate();
  const [utm, setUtm] = useState<UtmData>({});
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // ── First-touch UTM capture & SEO tags ──
  useEffect(() => {
    document.title = "MaxP لمتاجر الملابس — متجر مجاني 0 ج.م وباقة 999 في الشهر";

    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);

    const fontLink = document.createElement("link");
    fontLink.rel = "stylesheet";
    fontLink.href = "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap";
    document.head.appendChild(fontLink);

    // UTM reading
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
      // ignore storage access issues
    }

    return () => {
      if (meta.parentNode) meta.parentNode.removeChild(meta);
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
    const q = buildQueryString({ tier: "free" });
    navigate(`/auth/register?${q}`);
  }, [navigate, buildQueryString]);

  const handlePaygRegister = useCallback(() => {
    const q = buildQueryString({ tier: "payg" });
    navigate(`/auth/register?${q}`);
  }, [navigate, buildQueryString]);

  const handleBundleCheckout = useCallback(async () => {
    const token = tokenManager.getAccessToken ? tokenManager.getAccessToken() : tokenManager.getToken?.();

    // If user is not logged in, take them to register with plan intent
    if (!token) {
      const q = buildQueryString({ plan: "999", tier: "bundle" });
      navigate(`/auth/register?${q}`);
      return;
    }

    // Direct Kashier hosted checkout for authenticated user
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

  const scrollToPricing = useCallback(() => {
    const el = document.getElementById("pricing");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <div className="csn-root" dir="rtl">
      {/* Platform Navigation */}
      <ClothingStoreNavbar
        onFreeRegister={handleFreeRegister}
        onLogin={handleLogin}
      />

      {/* Main Content Sections */}
      <main>
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

        <ClothingStoreLeadForm
          utm={utm}
          onFreeRegister={handleFreeRegister}
        />

        <ClothingStoreFAQ />
      </main>

      {/* Footer */}
      <ClothingStoreFooter onFreeRegister={handleFreeRegister} />

      {/* Sticky Mobile CTA Bar */}
      <div className="csn-sticky-mobile">
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-400">ابدأ الآن مجاناً</span>
          <span className="text-sm font-bold text-white csn-tabular">0 ج.م / شهر</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={scrollToPricing}
            className="csn-btn-secondary text-xs py-2 px-3 whitespace-nowrap"
          >
            الباقة 999
          </button>
          <button
            type="button"
            onClick={handleFreeRegister}
            className="csn-btn-primary text-xs py-2 px-3 whitespace-nowrap"
          >
            <span>افتح متجرك</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClothingStoreLanding;
