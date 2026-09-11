import React, { useEffect } from "react";
import "./landing/platformLanding.css";
import { LandingNav } from "./landing/components/LandingNav";
import { LandingHero } from "./landing/components/LandingHero";
import { LandingMarquee } from "./landing/components/LandingMarquee";
import { LandingSystemStorySlider } from "./landing/components/LandingSystemStorySlider";
import { LandingDayInLifeFlow } from "./landing/components/LandingDayInLifeFlow";
import { LandingRoiCalculator } from "./landing/components/LandingRoiCalculator";
import { LandingFaq } from "./landing/components/LandingFaq";
import { LandingFooter } from "./landing/components/LandingFooter";
import { trackPlatformSiteLead } from "../utils/platformSiteMetaPixel";

const LandingPage: React.FC = () => {
  useEffect(() => {
    document.title = "Max P Business OS — نظام تشغيل التجارة والمتاجر للشركات في مصر";
  }, []);

  const preloadAuth = () => {
    import("./auth/Login").catch(() => {});
  };

  const preloadRegister = () => {
    import("./auth/Register").catch(() => {});
  };

  const handleFloatingWhatsApp = () => {
    trackPlatformSiteLead("floating_whatsapp_pill", {
      destination: "https://wa.me/201123087745",
      landing_variant: "enterprise-os",
    });
  };

  return (
    <div className="premium-landing min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-white/10 selection:text-white relative overflow-x-hidden" dir="rtl">
      {/* Subtle Atmospheric Radial Depth */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.03)_0%,transparent_65%)]" />

      {/* Pure Single-Depth Glass Navigation */}
      <LandingNav
        onPreloadAuth={preloadAuth}
        onPreloadRegister={preloadRegister}
      />

      {/* Main Open Content Sections (Zero Box-in-Box) */}
      <main className="relative z-10">
        {/* 1. Open Hero with Live Operations Telemetry */}
        <LandingHero onPreloadRegister={preloadRegister} />

        {/* 2. Seamless Monochrome Integrations Ticker */}
        <LandingMarquee />

        {/* 3. The 6 Systems Storytelling Slider with Generated Artworks */}
        <LandingSystemStorySlider />

        {/* 4. 24-Hour Order Lifecycle: From WhatsApp to Vault Cash */}
        <LandingDayInLifeFlow />

        {/* 5. Realistic Egyptian Merchant ROI Calculator (EGP) */}
        <LandingRoiCalculator />

        {/* 6. Open Hairline FAQ for Egyptian Merchants */}
        <LandingFaq />

        {/* 7. Open Pre-Footer Action & Footer */}
        <LandingFooter onPreloadRegister={preloadRegister} />
      </main>

      {/* Discreet Floating WhatsApp Quick Connect */}
      <div className="fixed bottom-6 left-6 z-40">
        <a
          href="https://wa.me/201123087745?text=مرحباً،%20أريد%20معرفة%20المزيد%20عن%20منصة%20MaxP"
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleFloatingWhatsApp}
          className="group flex items-center gap-2.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 hover:text-white px-4 py-2.5 text-xs font-mono border border-white/10 backdrop-blur-md transition-all duration-300 shadow-2xl active:scale-95"
          aria-label="تواصل معنا عبر واتساب"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>تحدث معنا عبر واتساب</span>
        </a>
      </div>
    </div>
  );
};

export default LandingPage;
