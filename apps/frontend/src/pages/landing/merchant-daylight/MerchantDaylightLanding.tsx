import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import "./merchantDaylight.css";
import { trackPlatformSiteLead } from "../../../utils/platformSiteMetaPixel";
import { MdlTopBar } from "./MdlTopBar";
import { MdlHero } from "./MdlHero";
import { MdlSolutions } from "./MdlSolutions";
import { MdlJourney } from "./MdlJourney";
import { MdlValueLedger } from "./MdlValueLedger";
import { MdlBeforeAfter } from "./MdlBeforeAfter";
import { MdlPricing } from "./MdlPricing";
import { MdlFaq } from "./MdlFaq";
import { MdlFinalCta } from "./MdlFinalCta";
import { MdlFooter } from "./MdlFooter";
import { mdlWhatsAppLink } from "./merchantDaylightData";

const PAGE_TITLE = "MaxP — نظام تشغيل واحد لمتجرك وأوردراتك وشحنك";
const PAGE_DESCRIPTION =
  "متجر إلكتروني، إدارة أوردرات، تأكيد على واتساب، شحن وبوالص، مخزون، وقياس أرباح — في نظام واحد يبدأ من 0 ج.م وباقة كاملة بـ999 ج.م/شهر.";

const setMetaDescription = () => {
  const tag = document.querySelector('meta[name="description"]');
  if (!tag) return;
  tag.setAttribute("content", PAGE_DESCRIPTION);
};

const MerchantDaylightLanding: React.FC = () => {
  useEffect(() => {
    document.title = PAGE_TITLE;
    setMetaDescription();
  }, []);

  const preloadAuth = () => {
    import("../../auth/Login").catch(() => {});
  };

  const preloadRegister = () => {
    import("../../auth/Register").catch(() => {});
  };

  return (
    <div
      className="mdl min-h-screen bg-white pb-20 md:pb-0"
      dir="rtl"
      data-landing-variant="merchant-daylight"
    >
      <MdlTopBar onPreloadAuth={preloadAuth} onPreloadRegister={preloadRegister} />

      <main>
        <MdlHero onPreloadRegister={preloadRegister} />
        <MdlSolutions />
        <MdlJourney />
        <MdlValueLedger />
        <MdlBeforeAfter />
        <MdlPricing onPreloadRegister={preloadRegister} />
        <MdlFaq />
        <MdlFinalCta onPreloadRegister={preloadRegister} />
      </main>

      <MdlFooter />

      {/* شريط إجراء ثابت على الموبايل فقط */}
      <div className="mdl mdl-sticky md:hidden" dir="rtl">
        <Link
          to="/register"
          onMouseEnter={preloadRegister}
          onFocus={preloadRegister}
          onClick={() =>
            trackPlatformSiteLead("sticky_register", {
              destination: "/register",
              landing_variant: "merchant-daylight",
            })
          }
          className="mdl-btn mdl-btn--primary flex-1"
        >
          افتح متجر مجاني
        </Link>
        <a
          href={mdlWhatsAppLink("مرحباً، عايز أعرف أنهي باقة تناسب نشاطي")}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            trackPlatformSiteLead("sticky_whatsapp", {
              destination: "whatsapp",
              landing_variant: "merchant-daylight",
            })
          }
          className="mdl-btn mdl-btn--ghost"
        >
          واتساب
        </a>
      </div>
    </div>
  );
};

export default MerchantDaylightLanding;
