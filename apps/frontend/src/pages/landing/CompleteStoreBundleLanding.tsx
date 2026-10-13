import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle } from "lucide-react";
import tokenManager from "../../utils/tokenManager";

import { CsbNavbar } from "./complete-store/CsbNavbar";
import { CsbHero } from "./complete-store/CsbHero";
import { CsbJourney } from "./complete-store/CsbJourney";
import { CsbFamilies } from "./complete-store/CsbFamilies";
import { CsbCalculator } from "./complete-store/CsbCalculator";
import { CsbCompare } from "./complete-store/CsbCompare";
import { CsbFaq } from "./complete-store/CsbFaq";
import { CsbFooter } from "./complete-store/CsbFooter";

import {
  BUNDLE_SLUG,
  LANDING_SLUG,
  UTM_KEYS,
  WHATSAPP_CONSULT_URL,
  TRIAL_DAYS,
  BUNDLE_PRICE,
  csbFmt,
} from "./complete-store/csbData";
import { useRevealOnScroll } from "./complete-store/csbHooks";
import "./complete-store/csb.css";

export const CompleteStoreBundleLanding: React.FC = () => {
  const navigate = useNavigate();
  const [utm, setUtm] = useState<Record<string, string>>({});
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  useRevealOnScroll(rootRef);

  // ── SEO tags + UTM first-touch ──
  useEffect(() => {
    const TITLE = "باقة المتجر الكاملة — 17 أداة بـ999 ج.م/شهر بدل 2,936 | MaxP";
    const DESC =
      "المتجر + مسار الطلبات + واتساب الأوردرات + الشحن الذكي + المخزون + المرتجعات + تحليلات الأرباح وإسناد الحملات — اشتراك واحد بـ999 ج.م/شهر مع تجربة 7 أيام مجانًا.";
    document.title = TITLE;

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

    setMeta("property", "og:title", TITLE);
    setMeta("property", "og:description", DESC);
    setMeta("name", "twitter:title", TITLE);
    setMeta("name", "twitter:description", DESC);

    const robotsMeta = document.createElement("meta");
    robotsMeta.name = "robots";
    robotsMeta.content = "noindex, nofollow";
    document.head.appendChild(robotsMeta);

    try {
      const q = new URLSearchParams(window.location.search);
      const parsed: Record<string, string> = {};
      UTM_KEYS.forEach((k) => {
        const v = q.get(k);
        if (v) parsed[k] = v;
      });
      if (Object.keys(parsed).length > 0) {
        sessionStorage.setItem("csb_utm", JSON.stringify(parsed));
        setUtm(parsed);
      } else {
        const stored = sessionStorage.getItem("csb_utm");
        if (stored) setUtm(JSON.parse(stored));
      }
    } catch {
      // ignore
    }

    return () => {
      metaChanges.forEach(({ el, prev }) => {
        if (prev === null) {
          el.parentNode?.removeChild(el);
        } else {
          el.content = prev;
        }
      });
      if (robotsMeta.parentNode) robotsMeta.parentNode.removeChild(robotsMeta);
    };
  }, []);

  const buildRegisterQuery = useCallback(
    (extra: Record<string, string> = {}) => {
      const parts: string[] = [`landingBundle=${BUNDLE_SLUG}`];
      Object.entries(extra).forEach(([k, v]) => {
        if (v) parts.push(`${k}=${encodeURIComponent(v)}`);
      });
      UTM_KEYS.forEach((k) => {
        if (utm[k]) parts.push(`${k}=${encodeURIComponent(utm[k])}`);
      });
      parts.push(`redirect=${encodeURIComponent(`/lp/${LANDING_SLUG}`)}`);
      return parts.join("&");
    },
    [utm]
  );

  /** CTA الرئيسي: مسجل؟ → كاشير Kashier مباشرة. مش مسجل؟ → تسجيل ورجوع للاندنج. */
  const handlePrimary = useCallback(async () => {
    const token = tokenManager.getAccessToken
      ? tokenManager.getAccessToken()
      : tokenManager.getToken?.();

    if (!token) {
      navigate(`/auth/register?${buildRegisterQuery({ source: LANDING_SLUG, action: "paid" })}`);
      return;
    }

    if (isCheckingOut) return;
    setIsCheckingOut(true);
    try {
      const res = await fetch(`/api/v1/marketplace/bundles/${BUNDLE_SLUG}/checkout`, {
        method: "POST",
        headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }),
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
  }, [navigate, buildRegisterQuery, utm, isCheckingOut]);

  return (
    <div className="csb-root" dir="rtl" ref={rootRef}>
      <CsbNavbar onTrial={handlePrimary} />

      <main>
        <CsbHero onPrimary={handlePrimary} />
        <CsbJourney />
        <CsbFamilies />
        <CsbCalculator />
        <CsbCompare />
        <CsbFaq />
        <CsbFooter onPrimary={handlePrimary} />
      </main>

      {/* الشريط اللاصق موبايل */}
      <div className="csb-sticky-mobile">
        <div className="csb-sticky-meta">
          <b>
            {csbFmt(BUNDLE_PRICE)} ج.م/شهر — 17 أداة
          </b>
          بدل 2,936 · تجربة {TRIAL_DAYS} أيام
        </div>
        <div style={{ display: "flex", gap: 6, flex: "none" }}>
          <a
            href={WHATSAPP_CONSULT_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="استشارة واتساب"
            className="csb-btn csb-btn-ghost csb-btn-sm"
            style={{ minHeight: 38, minWidth: 38, padding: 0 }}
          >
            <MessageCircle size={16} strokeWidth={2.2} />
          </a>
          <button
            type="button"
            onClick={handlePrimary}
            className="csb-btn csb-btn-primary csb-btn-sm"
            style={{ minHeight: 38 }}
          >
            ابدأ مجانًا
            <ArrowLeft size={14} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompleteStoreBundleLanding;
