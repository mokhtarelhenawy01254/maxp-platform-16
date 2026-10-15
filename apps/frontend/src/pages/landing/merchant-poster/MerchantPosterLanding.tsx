import React, { useEffect, useRef } from "react";
import "./poster.css";
import { PosterFigures, PosterHero, PosterRows, PosterStages } from "./PosterLanding";
import { PosterClose, PosterFaq, PosterPlans } from "./PosterClose";

const TITLE = "MaxP ، كل جنيه ليه بوليصة";
const DESCRIPTION =
  "من رسالة العميل للبوليصة للكاش. نظام واحد بدل 5 برامج: تبدأ بـ0 ج.م، والباقة الكاملة 999 ج.م في الشهر.";

/** صفحة «بوستر الشارع» ، direction: loud-flat-poster · palette: orange + sky + lime */
const MerchantPosterLanding: React.FC = () => {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.title = TITLE;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", DESCRIPTION);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.classList.add("po-js");

    const nodes = Array.from(root.querySelectorAll<HTMLElement>(".po-rise"));
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
            ? Array.from(node.parentElement.querySelectorAll<HTMLElement>(".po-rise"))
            : [node];
          node.style.transitionDelay = `${Math.min(Math.max(group.indexOf(node), 0), 4) * 60}ms`;
          node.classList.add("is-in");
          observer.unobserve(node);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.1 },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const preloadRegister = () => {
    import("../../auth/Register").catch(() => {});
  };

  return (
    <div ref={rootRef} className="po min-h-[100dvh]" dir="rtl" data-landing-variant="merchant-poster">
      <PosterHero onPreloadRegister={preloadRegister} />
      <main>
        <PosterFigures />
        <PosterStages />
        <PosterRows />
        <PosterPlans onPreloadRegister={preloadRegister} />
        <PosterFaq />
      </main>
      <PosterClose onPreloadRegister={preloadRegister} />
    </div>
  );
};

export default MerchantPosterLanding;
