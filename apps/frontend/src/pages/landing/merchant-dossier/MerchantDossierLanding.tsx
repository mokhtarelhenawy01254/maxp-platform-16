import React, { useEffect, useRef } from "react";
import "./merchantDossier.css";
import { MdFolderHero } from "./MdFolderHero";
import { MdWorldBand } from "./MdWorldBand";
import { MdStats } from "./MdStats";
import { MdStages } from "./MdStages";
import { MdBoard } from "./MdBoard";
import { MdStreetBand } from "./MdStreetBand";
import { MdIndex } from "./MdIndex";
import { MdPlans } from "./MdPlans";
import { MdCards } from "./MdCards";
import { MdStart } from "./MdStart";
import { MdClose } from "./MdClose";

const TITLE = "MaxP ، كل جنيه ليه بوليصة";
const DESCRIPTION =
  "ملف واحد لمتجرك: رسالة العميل، تأكيد الأوردر على واتساب، بوليصة الشحن، والكاش عند الاستلام. تبدأ بـ0 ج.م، والباقة الكاملة 999 ج.م في الشهر.";

const MerchantDossierLanding: React.FC = () => {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.title = TITLE;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", DESCRIPTION);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.classList.add("md-js");

    const nodes = Array.from(root.querySelectorAll<HTMLElement>(".md-rise"));
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
            ? Array.from(node.parentElement.querySelectorAll<HTMLElement>(".md-rise"))
            : [node];
          const index = Math.max(0, group.indexOf(node));
          node.style.transitionDelay = `${Math.min(index, 4) * 70}ms`;
          node.classList.add("is-in");
          observer.unobserve(node);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const preloadRegister = () => {
    import("../../auth/Register").catch(() => {});
  };

  const preloadAuth = () => {
    import("../../auth/Login").catch(() => {});
  };

  return (
    <div ref={rootRef} className="md" dir="rtl" data-landing-variant="merchant-dossier">
      <MdFolderHero onPreloadRegister={preloadRegister} onPreloadAuth={preloadAuth} />
      <main>
        <MdWorldBand />
        <MdStats />
        <MdStages />
        <MdBoard />
        <MdStreetBand />
        <MdIndex />
        <MdPlans onPreloadRegister={preloadRegister} />
        <MdCards />
        <MdStart onPreloadRegister={preloadRegister} />
      </main>
      <MdClose onPreloadRegister={preloadRegister} />
    </div>
  );
};

export default MerchantDossierLanding;
