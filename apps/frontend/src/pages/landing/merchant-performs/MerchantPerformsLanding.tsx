import React, { useEffect, useRef } from "react";
import "./performs.css";
import { PerformsHero } from "./PerformsHero";
import { PerformsBody } from "./PerformsBody";
import PerformsClose, { PerformsFaq, PerformsPlans } from "./PerformsClose";

const TITLE = "MaxP ، جرّب شاشة الطلبات قبل ما تشترك";
const DESCRIPTION =
  "شاشة الطلبات شغّالة على الصفحة نفسها: فلترة، بحث، ورسالة تأكيد من نفس المكان. تبدأ بـ0 ج.م، والباقة الكاملة 999 ج.م في الشهر.";

/** صفحة «المنتج بيشتغل» ، direction: product-performs · palette: frost + slate */
const MerchantPerformsLanding: React.FC = () => {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.title = TITLE;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", DESCRIPTION);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.classList.add("pf-js");

    const nodes = Array.from(root.querySelectorAll<HTMLElement>(".pf-rise"));
    if (typeof IntersectionObserver === "undefined") {
      nodes.forEach((node) => node.classList.add("is-in"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const node = entry.target as HTMLElement;
          const group = node.parentElement
            ? Array.from(node.parentElement.querySelectorAll<HTMLElement>(".pf-rise"))
            : [node];
          node.style.transitionDelay = `${Math.min(Math.max(group.indexOf(node), 0), 4) * 70}ms`;
          node.classList.add("is-in");
          observer.unobserve(node);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const preloadRegister = () => {
    import("../../auth/Register").catch(() => {});
  };

  return (
    <div ref={rootRef} className="pf min-h-[100dvh]" dir="rtl" data-landing-variant="merchant-performs">
      <PerformsHero onPreloadRegister={preloadRegister} />
      <main>
        <PerformsBody />
        <PerformsPlans onPreloadRegister={preloadRegister} />
        <PerformsFaq />
      </main>
      <PerformsClose onPreloadRegister={preloadRegister} />
    </div>
  );
};

export default MerchantPerformsLanding;
