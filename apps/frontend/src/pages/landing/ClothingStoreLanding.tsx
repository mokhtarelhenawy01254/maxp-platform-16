import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CLOTHING_STORE_LANDING_MARKUP } from "./clothingStoreLandingMarkup";
import "./clothingStoreLanding.css";
import tokenManager from "../../utils/tokenManager";

/**
 * «باقة متجر الملابس» — integrated landing (Phase 2, native to the platform).
 * Content: v5 direction A («دفتر المتجر الرابح») — numbers frozen: 0 / 1 / 999 / 2,936.
 * Flows:
 *  - «ابدأ مجانًا» → /auth/register?landingBundle=clothing-store-bundle (free tier auto-install).
 *  - «اشترك بالباقة 999» → Kashier checkout (POST /marketplace/bundles/store-complete-bundle/checkout)
 *    → hosted payment → webhook activates the 17 apps.
 *  - WhatsApp lead form kept as the secondary channel (utm passthrough).
 * Draft: noindex until Mokhtar's written approval.
 */
const WHATSAPP_NUMBER = "201123087745"; // pending Mokhtar's official number confirmation
const BUNDLE_SLUG = "store-complete-bundle";
const LANDING_SLUG = "clothing-store-bundle";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

const readUtm = (): Record<string, string> => {
  try {
    const q = new URLSearchParams(window.location.search);
    const fromQuery: Record<string, string> = {};
    UTM_KEYS.forEach((k) => {
      const v = q.get(k);
      if (v) fromQuery[k] = v;
    });
    if (Object.keys(fromQuery).length > 0) {
      sessionStorage.setItem("cslp_utm", JSON.stringify(fromQuery));
      return fromQuery;
    }
    const stored = sessionStorage.getItem("cslp_utm");
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

const buildUtmSuffix = (utm: Record<string, string>): string => {
  const parts = UTM_KEYS.map((k) => (utm[k] ? `${k}=${utm[k]}` : null)).filter(Boolean);
  return parts.length ? `\n\n[${parts.join(" | ")}]` : "";
};

const ClothingStoreLanding: React.FC = () => {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "MaxP لمتاجر الملابس — متجر مجاني 0 ج.م وباقة 999 في الشهر";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    // Cairo font (same as the approved v5 design)
    const fontLink = document.createElement("link");
    fontLink.rel = "stylesheet";
    fontLink.href = "https://fonts.googleapis.com/css2?family=Cairo:wght@400;800&display=swap";
    document.head.appendChild(fontLink);
    readUtm(); // first-touch capture into sessionStorage

    return () => {
      if (meta.parentNode) meta.parentNode.removeChild(meta);
      if (fontLink.parentNode) fontLink.parentNode.removeChild(fontLink);
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // ── CTA delegation: register / checkout flows ──
    const onCtaClick = async (el: Element) => {
      const action = el.getAttribute("data-action");
      const utm = readUtm();
      const utmQuery = UTM_KEYS.map((k) => (utm[k] ? `${k}=${encodeURIComponent(utm[k])}` : null))
        .filter(Boolean)
        .join("&");

      if (action === "register") {
        const query = [
          "landingBundle=" + LANDING_SLUG,
          utmQuery,
          "redirect=" + encodeURIComponent(`/lp/${LANDING_SLUG}`),
        ]
          .filter(Boolean)
          .join("&");
        navigate(`/auth/register?${query}`);
        return true;
      }
      if (action === "checkout") {
        const token = tokenManager.getAccessToken ? tokenManager.getAccessToken() : tokenManager.getToken?.();
        if (!token) {
          const query = [
            "landingBundle=" + LANDING_SLUG,
            "plan=999",
            utmQuery,
            "redirect=" + encodeURIComponent(`/lp/${LANDING_SLUG}`),
          ]
            .filter(Boolean)
            .join("&");
          navigate(`/auth/register?${query}`);
          return true;
        }
        try {
          el.setAttribute("disabled", "true");
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
            return true;
          }
          el.removeAttribute("disabled");
          alert(data?.message || "تعذر بدء الدفع، حاول مرة أخرى");
        } catch {
          el.removeAttribute("disabled");
          alert("تعذر بدء الدفع، حاول مرة أخرى");
        }
        return true;
      }
      return false;
    };

    const clickHandler = (e: Event) => {
      const target = e.target as HTMLElement;
      const cta = target.closest("[data-action]");
      if (cta) {
        e.preventDefault();
        onCtaClick(cta).catch(() => {});
        return;
      }
      const anchor = target.closest("a[href^='#']");
      if (anchor) {
        const id = anchor.getAttribute("href")?.slice(1);
        if (id) {
          const dest = document.getElementById(id);
          if (dest) {
            e.preventDefault();
            dest.scrollIntoView({ behavior: "smooth" });
          }
        }
      }
    };
    root.addEventListener("click", clickHandler);

    // ── WhatsApp lead form (secondary channel, utm passthrough) ──
    const submitHandler = (e: Event) => {
      const form = e.target as HTMLFormElement;
      if (form.id !== "leadForm") return;
      e.preventDefault();
      const msg = document.getElementById("formMsg");
      const n = form.elements.namedItem("name") as HTMLInputElement | null;
      const p = form.elements.namedItem("phone") as HTMLInputElement | null;
      const t = form.elements.namedItem("type") as HTMLSelectElement | null;
      if (!n?.value.trim()) {
        if (msg) msg.textContent = "اكتب اسمك الأول.";
        n?.focus();
        return;
      }
      if (!p?.value.trim()) {
        if (msg) msg.textContent = "اكتب رقم الموبايل.";
        p?.focus();
        return;
      }
      const utm = readUtm();
      const text =
        "أهلاً، عايز أفتح متجر مجاني على MaxP.\n" +
        "الاسم: " + n.value.trim() + "\n" +
        "الموبايل: " + p.value.trim() + "\n" +
        "النشاط: " + (t?.value || "غير محدد") +
        buildUtmSuffix(utm);
      window.dataLayer = window.dataLayer || [];
      (window as unknown as { dataLayer: unknown[] }).dataLayer.push({ event: "lead_submit", cta: "form-submit", utm });
      if (msg) msg.textContent = "بنجهز لك المحادثة…";
      window.open(
        `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`,
        "_blank",
        "noopener"
      );
    };
    root.addEventListener("submit", submitHandler);

    // ── Demo quick replies ──
    const REPLIES: Record<string, string> = {
      "الشحن لمصر الجديدة بياخد قد إيه؟": "التوصيل متاح لمصر الجديدة، والدفع عند الاستلام متاح كمان.",
      "عندي مقاس 44؟": "مقاس 44 متاح — تحب أحجزه مع الأوردر؟",
      "عايز أرجّع المقاس": "تمام، بنسجّل المرتجع بسبب «المقاس»، والمندوب بيوصلك للاستلام."
    };
    const thread = root.querySelector("#thread");
    const demoHandler = (e: Event) => {
      const btn = (e.target as HTMLElement).closest("#qp button") as HTMLButtonElement | null;
      if (!btn) return;
      const qq = btn.getAttribute("data-q") || "";
      if (thread) {
        thread.insertAdjacentHTML(
          "beforeend",
          `<p class="who">العميل</p><div class="bub">${qq}<time>الآن</time></div>`
        );
      }
      window.dataLayer = window.dataLayer || [];
      (window as unknown as { dataLayer: unknown[] }).dataLayer.push({ event: "demo_click", cta: qq });
      window.setTimeout(() => {
        if (thread) {
          thread.insertAdjacentHTML(
            "beforeend",
            `<p class="who">رد المنصة</p><div class="bub out">${REPLIES[qq] || ""}<time>الآن</time></div>`
          );
        }
      }, 420);
    };
    root.addEventListener("click", demoHandler);

    // ── Reveal on scroll (fail-safe) ──
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false;
    const sections = Array.from(root.querySelectorAll("section"));
    let cleanupReveal = () => {};
    if (!reduceMotion && sections.length) {
      sections.forEach((s) => s.classList.add("rv"));
      const io = typeof IntersectionObserver === "function"
        ? new IntersectionObserver(
            (entries) => entries.forEach((en) => en.isIntersecting && en.target.classList.add("seen")),
            { rootMargin: "0px 0px -8% 0px" }
          )
        : null;
      if (io) sections.forEach((s) => io.observe(s));
      const reveal = () => sections.forEach((s) => {
        if (!s.classList.contains("seen") && s.getBoundingClientRect().top < window.innerHeight * 0.94) {
          s.classList.add("seen");
        }
      });
      window.addEventListener("scroll", reveal, { passive: true });
      const showAll = window.setTimeout(() => sections.forEach((s) => s.classList.add("seen")), 1500);
      cleanupReveal = () => {
        io?.disconnect();
        window.removeEventListener("scroll", reveal);
        window.clearTimeout(showAll);
      };
    }

    // ── Sticky mobile CTA ──
    const sticky = root.querySelector<HTMLElement>("#stickyCta");
    const syncSticky = () => sticky?.classList.toggle("on", window.pageYOffset > 380);
    window.addEventListener("scroll", syncSticky, { passive: true });
    syncSticky();

    return () => {
      root.removeEventListener("click", clickHandler);
      root.removeEventListener("submit", submitHandler);
      root.removeEventListener("click", demoHandler);
      cleanupReveal();
      window.removeEventListener("scroll", syncSticky);
      if (meta.parentNode) meta.parentNode.removeChild(meta);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  return (
    <div
      ref={rootRef}
      className="cslp-root"
      dir="rtl"
      // v5 direction-A content (numbers frozen: 0 / 1 / 999 / 2,936) — static marketing
      // markup wired through delegated listeners above.
      dangerouslySetInnerHTML={{ __html: CLOTHING_STORE_LANDING_MARKUP }}
    />
  );
};

export default ClothingStoreLanding;
