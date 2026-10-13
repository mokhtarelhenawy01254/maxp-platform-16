import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { MotionConfig } from "framer-motion";
import tokenManager from "../../utils/tokenManager";

import { ClothingTasteNavbar } from "./clothing-taste/ClothingTasteNavbar";
import { ClothingTasteHero } from "./clothing-taste/ClothingTasteHero";
import { ClothingTasteTelemetry } from "./clothing-taste/ClothingTasteTelemetry";
import { ClothingTasteBento } from "./clothing-taste/ClothingTasteBento";
import { ClothingTasteToolsMatrix } from "./clothing-taste/ClothingTasteToolsMatrix";
import { ClothingTasteLookbook } from "./clothing-taste/ClothingTasteLookbook";
import { ClothingTastePricing } from "./clothing-taste/ClothingTastePricing";
import { ClothingTasteLeadForm } from "./clothing-taste/ClothingTasteLeadForm";
import { ClothingTasteFAQ } from "./clothing-taste/ClothingTasteFAQ";
import { ClothingTasteFooter } from "./clothing-taste/ClothingTasteFooter";
import { ClothingTasteTrustStrip } from "./clothing-taste/ClothingTasteTrustStrip";
import { ClothingTasteSocialProof } from "./clothing-taste/ClothingTasteSocialProof";
import { ClothingTasteActivationModal } from "./clothing-taste/ClothingTasteActivationModal";

import { UtmData } from "./clothing-taste/types";
import { WHATSAPP_CONSULT_URL } from "./clothing-taste/clothingTasteData";
import "./clothing-taste/clothingTaste.css";

const BUNDLE_SLUG = "store-complete-bundle";
const LANDING_SLUG = "clothing-taste";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export const ClothingStoreTasteLanding: React.FC = () => {
  const navigate = useNavigate();
  const [utm, setUtm] = useState<UtmData>({});
  const [, setIsCheckingOut] = useState(false);
  const [isActivationOpen, setIsActivationOpen] = useState(false);

  // ── First-touch UTM capture & SEO tags ──
  useEffect(() => {
    const LANDING_TITLE = "MaxP للأزياء والملابس — 17 أداة لإدارة المتجر والفروع والشحن";
    const LANDING_DESCRIPTION = "منظومة متاجر وبراندات الملابس في مصر: 17 أداة في باقة واحدة تشمل متجر أونلاين، كاشير فروع بالباركود، ربط شحن بوسطة وتوربو، تأكيد واتساب، وتشخيص أسباب المرتجعات.";
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

    const canonical = document.head.querySelector<HTMLLinkElement>("link[rel='canonical']");
    const prevCanonical = canonical ? canonical.href : null;
    if (canonical) {
      canonical.href = `${window.location.origin}/lp/${LANDING_SLUG}`;
    }

    const robotsMeta = document.createElement("meta");
    robotsMeta.name = "robots";
    robotsMeta.content = "noindex, nofollow";
    document.head.appendChild(robotsMeta);

    // Read UTM
    try {
      const q = new URLSearchParams(window.location.search);
      const parsed: Record<string, string> = {};
      UTM_KEYS.forEach((k) => {
        const v = q.get(k);
        if (v) parsed[k] = v;
      });

      if (Object.keys(parsed).length > 0) {
        sessionStorage.setItem("cst_utm", JSON.stringify(parsed));
        setUtm(parsed);
      } else {
        const stored = sessionStorage.getItem("cst_utm");
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
      if (canonical && prevCanonical !== null) {
        canonical.href = prevCanonical;
      }
      if (robotsMeta.parentNode) {
        robotsMeta.parentNode.removeChild(robotsMeta);
      }
    };
  }, []);

  const buildQueryString = useCallback(
    (extraParams: Record<string, string> = {}) => {
      // Use existing clothing-store-bundle slug for backend default apps initialization
      const parts: string[] = [`landingBundle=clothing-store-bundle`];
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

  const handleFreeRegister = useCallback(() => {
    setIsActivationOpen(true);
  }, []);

  const handleContinueToRegister = useCallback(
    (prefilled: { brandName: string; phone: string }) => {
      const extraParams: Record<string, string> = {
        tier: "free",
        source: "clothing-taste",
        action: "free",
      };
      if (prefilled?.brandName) extraParams.companyName = prefilled.brandName;
      if (prefilled?.phone) extraParams.phone = prefilled.phone;
      const q = buildQueryString(extraParams);
      navigate(`/auth/register?${q}`);
    },
    [navigate, buildQueryString]
  );

  const handlePaygRegister = useCallback(() => {
    const q = buildQueryString({ tier: "payg", source: "clothing-taste", action: "free" });
    navigate(`/auth/register?${q}`);
  }, [navigate, buildQueryString]);

  const handleBundleCheckout = useCallback(async () => {
    const token = tokenManager.getAccessToken ? tokenManager.getAccessToken() : tokenManager.getToken?.();

    if (!token) {
      const q = buildQueryString({ plan: "999", tier: "bundle", source: "clothing-taste", action: "paid" });
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

  const scrollToPricing = useCallback(() => {
    const el = document.getElementById("pricing");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="cst-root" dir="rtl">
        
        {/* Modern Boutique Navbar */}
        <ClothingTasteNavbar
          onFreeRegister={handleFreeRegister}
          onLogin={handleLogin}
        />

        <main>
          {/* Luxury Fashion Editorial Hero */}
          <ClothingTasteHero
            onFreeRegister={handleFreeRegister}
            onPricingScroll={scrollToPricing}
          />

          {/* Trusted Egyptian Integrations Strip (Bosta, Kashier, InstaPay) */}
          <ClothingTasteTrustStrip />

          {/* Commercial Highlights Strip */}
          <ClothingTasteTelemetry />

          {/* Asymmetric 8:4 Bento Grid */}
          <ClothingTasteBento
            onPricingScroll={scrollToPricing}
          />

          {/* Interactive Lookbook & Size Matrix Live Sync */}
          <ClothingTasteLookbook
            onFreeRegister={handleFreeRegister}
          />

          {/* Real Social Proof & Authentic Merchant Case Studies */}
          <ClothingTasteSocialProof />

          {/* 17 Fashion Tools Suite Matrix */}
          <ClothingTasteToolsMatrix
            onPricingScroll={scrollToPricing}
          />

          {/* 3-Tier Pricing Engine */}
          <ClothingTastePricing
            onFreeRegister={handleFreeRegister}
            onPaygRegister={handlePaygRegister}
            onBundleCheckout={handleBundleCheckout}
          />

          {/* Frictionless Merchant Consultation & Lead Capture Form */}
          <ClothingTasteLeadForm
            utm={utm}
            onFreeRegister={handleFreeRegister}
          />

          {/* Merchant FAQ Section */}
          <ClothingTasteFAQ />
        </main>

        {/* Footer */}
        <ClothingTasteFooter
          onFreeRegister={handleFreeRegister}
        />

        {/* 60-Second Fast Activation Modal */}
        <ClothingTasteActivationModal
          isOpen={isActivationOpen}
          onClose={() => setIsActivationOpen(false)}
          utm={utm}
          onContinueToRegister={handleContinueToRegister}
        />

        {/* Sticky Mobile Conversion Bar */}
        <div className="cst-sticky-mobile">
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-zinc-400 font-semibold">ابدأ متجرك 0 ج.م</span>
            <span className="text-xs font-black text-white cst-tabular">بدون بطاقة دفع</span>
          </div>

          <div className="flex items-center gap-1.5">
            <a
              href={WHATSAPP_CONSULT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs p-2 rounded-lg border border-white/10 bg-white/5 text-emerald-400 flex items-center justify-center min-h-[38px] min-w-[38px]"
              title="تواصل عبر واتساب"
              aria-label="استشارة واتساب"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={scrollToPricing}
              className="text-xs py-2 px-2.5 rounded-lg border border-white/10 bg-white/5 text-white font-bold min-h-[38px]"
            >
              باقة 999
            </button>
            <button
              type="button"
              onClick={handleFreeRegister}
              className="cst-btn-primary text-xs py-2 px-3 whitespace-nowrap min-h-[38px]"
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

export default ClothingStoreTasteLanding;
