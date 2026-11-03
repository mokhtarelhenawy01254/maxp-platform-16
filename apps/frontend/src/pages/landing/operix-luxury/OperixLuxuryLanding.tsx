import React, { useEffect } from "react";
import "./operixLuxury.css";
import { OlNav } from "./components/OlNav";
import { OlHero } from "./components/OlHero";
import { OlCockpitSurface } from "./components/OlCockpitSurface";
import { OlMarquee } from "./components/OlMarquee";
import { OlWhyMaxP } from "./components/OlWhyMaxP";
import { OlModulesBento } from "./components/OlModulesBento";
import { OlIntegrations } from "./components/OlIntegrations";
import { OlTestimonials } from "./components/OlTestimonials";
import { OlPricing } from "./components/OlPricing";
import { OlFaq } from "./components/OlFaq";
import { OlFooter } from "./components/OlFooter";
import { trackPlatformSiteLead } from "../../../utils/platformSiteMetaPixel";

export const OperixLuxuryLanding: React.FC = () => {
  useEffect(() => {
    document.title =
      "MaxP Business OS | نظام تشغيل وإدارة عمليات المتاجر والتجارة في مصر والخليج";

    // Track landing view
    trackPlatformSiteLead("page_view", {
      landing_variant: "operix-luxury",
    });
  }, []);

  const preloadAuth = () => {
    import("../../auth/Login").catch(() => {});
  };

  const preloadRegister = () => {
    import("../../auth/Register").catch(() => {});
  };

  return (
    <div className="ol-luxury-root selection:bg-[#013735] selection:text-[#3fffba]">
      {/* Background Perspective Grid */}
      <div className="absolute inset-0 pointer-events-none ol-grid-bg z-0" />

      {/* Top Navigation Bar */}
      <OlNav
        onPreloadAuth={preloadAuth}
        onPreloadRegister={preloadRegister}
      />

      {/* Main Full Narrative Flow (Exact Operix Section Cadence) */}
      <main className="relative z-10">
        {/* 1 & 2. Unified Hero with Authentic Operix 3D Backdrop & Cockpit Stage */}
        <section id="home" className="ol-hero-unified">
          {/* Authentic Operix 3D Backdrop (Streaks + Perspective Grid + Glowing Horizon) */}
          <div className="ol-hero-backdrop" aria-hidden="true">
            <div className="streaks">
              <img src="/operix-assets/hero-bg.webp" alt="" />
            </div>
            <img className="grid" src="/operix-assets/perspective-grid.svg" alt="" />
            <div className="horizon" />
          </div>

          <div className="relative z-10">
            <OlHero />
            <OlCockpitSurface />
          </div>
        </section>

        {/* 3. Egyptian & Regional Merchant Brands Marquee */}
        <OlMarquee />

        {/* 4. Core Modules Bento Showcase */}
        <OlModulesBento />

        {/* 5. Why Choose MaxP? (The 6 Architectural Pillars) */}
        <OlWhyMaxP />

        {/* 6. Dual-Strip Moving Integrations Ecosystem */}
        <OlIntegrations />

        {/* 7. Real Merchant Stories & Verified Case Studies */}
        <OlTestimonials />

        {/* 8. Comprehensive Merchant FAQ */}
        <OlFaq />

        {/* 9. Pre-Footer Action Banner & Footer */}
        <OlFooter />
      </main>

      {/* Floating WhatsApp Action Pill */}
      <div className="fixed bottom-6 left-6 z-40">
        <a
          href="https://wa.me/201123087745?text=مرحباً،%20أريد%20معرفة%20المزيد%20عن%20نظام%20MaxP"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2.5 rounded-full bg-[#013735] text-white hover:bg-[#025956] px-4 py-2.5 text-xs font-bold border border-[#3fffba]/30 backdrop-blur-md transition-all duration-300 shadow-xl active:scale-95"
          aria-label="تواصل معنا عبر واتساب"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-[#3fffba] animate-ping" />
          <span>اسأل خبير العمليات عبر واتساب</span>
        </a>
      </div>
    </div>
  );
};

export default OperixLuxuryLanding;
