import React, { useEffect, useRef } from "react";
import "./annual.css";
import { AnnualFigures, AnnualHero, AnnualMosaic, AnnualStages } from "./AnnualLanding";
import { AnnualClose, AnnualFaq, AnnualPlans } from "./AnnualClose";

const TITLE = "MaxP ، تقرير تشغيل التاجر";
const DESCRIPTION =
  "شغل التاجر بيتقاس بأربع حاجات: أوردر اتأكد، بوليصة طلعت، كاش اتلمّ، وربح اتقفل. MaxP بتحطهم على نفس البيانات.";

/** صفحة «التقرير المطبوع» ، direction: editorial-report · palette: cool grey + cobalt */
const MerchantAnnualLanding: React.FC = () => {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.title = TITLE;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", DESCRIPTION);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.classList.add("an-js");

    const nodes = Array.from(root.querySelectorAll<HTMLElement>(".an-rise, .an-mask"));
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
            ? Array.from(node.parentElement.querySelectorAll<HTMLElement>(".an-rise"))
            : [node];
          node.style.transitionDelay = `${Math.min(Math.max(group.indexOf(node), 0), 4) * 70}ms`;
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
    <div ref={rootRef} className="an min-h-[100dvh]" dir="rtl" data-landing-variant="merchant-annual">
      <AnnualHero onPreloadRegister={preloadRegister} />
      <main>
        <AnnualFigures />
        <AnnualMosaic />
        <AnnualStages />
        <AnnualPlans onPreloadRegister={preloadRegister} />
        <AnnualFaq />
      </main>
      <AnnualClose onPreloadRegister={preloadRegister} />
    </div>
  );
};

export default MerchantAnnualLanding;
