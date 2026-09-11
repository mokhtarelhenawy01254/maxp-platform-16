import React, { useEffect } from "react";
import "./landing/platformLanding.css";
import { LandingNav } from "./landing/components/LandingNav";
import { LandingHero } from "./landing/components/LandingHero";
import { LandingMarquee } from "./landing/components/LandingMarquee";
import { LandingBentoGrid } from "./landing/components/LandingBentoGrid";
import { LandingInteractiveDemo } from "./landing/components/LandingInteractiveDemo";
import { LandingComparison } from "./landing/components/LandingComparison";
import { LandingRoiCalculator } from "./landing/components/LandingRoiCalculator";
import { LandingTestimonials } from "./landing/components/LandingTestimonials";
import { LandingFaq } from "./landing/components/LandingFaq";
import { LandingFooter } from "./landing/components/LandingFooter";
import { trackPlatformSiteLead } from "../utils/platformSiteMetaPixel";

const LandingPage: React.FC = () => {
  useEffect(() => {
    document.title = "Max P Business OS — نظام تشغيل الأعمال الموحد للشركات والمتاجر";
  }, []);

  const preloadAuth = () => {
    import("./auth/Login").catch(() => {});
  };

  const preloadRegister = () => {
    import("./auth/Register").catch(() => {});
  };

  return (
    <div className="premium-landing min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-white/10 selection:text-white relative overflow-x-hidden" dir="rtl">
      {/* Subtle Atmospheric Depth Layer */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.03)_0%,transparent_60%)]" />

      {/* Modern Island Navigation */}
      <LandingNav
        onPreloadAuth={preloadAuth}
        onPreloadRegister={preloadRegister}
      />

      {/* Main Content Sections */}
      <main className="relative z-10">
        {/* Hero Section with Double-Bezel Live Operations Console */}
        <LandingHero onPreloadRegister={preloadRegister} />

        {/* Restrained Monochrome Integrations Ticker */}
        <LandingMarquee />

        {/* Double-Bezel Architecture Grid */}
        <LandingBentoGrid />

        {/* Live Interactive Module Sandbox */}
        <LandingInteractiveDemo />

        {/* High-Contrast Grounded Comparison */}
        <LandingComparison />

        {/* Realistic ROI Calculator */}
        <LandingRoiCalculator />

        {/* Authentic Customer Testimonials */}
        <LandingTestimonials />

        {/* Physics-Based Accordion FAQ */}
        <LandingFaq />
      </main>

      {/* Sleek Footer with Final CTA */}
      <LandingFooter onPreloadRegister={preloadRegister} />

      {/* Restrained Floating WhatsApp Action Pill */}
      <a
        href="https://wa.me/201123087745?text=مرحباً،%20أود%20الاستفسار%20عن%20منصة%20Max%20P"
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          trackPlatformSiteLead("whatsapp_floating_button", {
            destination: "whatsapp",
            landing_variant: "enterprise-os",
          });
        }}
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2.5 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-100 px-4 py-2.5 rounded-full shadow-2xl border border-white/10 backdrop-blur-md transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-105 active:scale-95"
        aria-label="تواصل معنا عبر واتساب"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs font-medium font-sans">تحدث معنا عبر واتساب</span>
      </a>
    </div>
  );
};

export default LandingPage;
