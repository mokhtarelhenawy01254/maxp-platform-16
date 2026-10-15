import React from "react";
import { Link } from "react-router-dom";
import { trackPlatformSiteLead } from "../../../utils/platformSiteMetaPixel";
import { PLATFORM_STATS, PLATFORM_STATS_DATE, mdlWhatsAppLink } from "./merchantDaylightData";
import MdlOrderSurface from "./MdlOrderSurface";

// تسميات قصيرة للعرض — الأرقام نفسها من PLATFORM_STATS (مصدر واحد).
const STAT_SHORT_LABELS = ["متجر شغال", "أوردر / 30 يوم", "أداة في باقة"];

interface MdlHeroProps {
  onPreloadRegister?: () => void;
}

export const MdlHero: React.FC<MdlHeroProps> = ({ onPreloadRegister }) => {
  return (
    <section id="mdl-top" className="mdl" dir="rtl">
      <div className="mdl-shell grid gap-10 pb-12 pt-10 lg:grid-cols-12 lg:gap-12 lg:pb-16 lg:pt-16">
        <div className="min-w-0 lg:col-span-6">
          <p className="mdl-eyebrow">منصة تشغيل للمتاجر والشركات في مصر</p>

          <h1 className="mdl-h1 mt-3">
            من أول رسالة على واتساب…
            <br />
            لآخر جنيه في الخزنة.
          </h1>

          <p className="mdl-lead mt-5 max-w-[46ch]">
            MaxP بتجمع المتجر والأوردرات والشحن والمخزون والحسابات في نظام واحد بيقرأ نفس
            البيانات. بدل <span className="mdl-num">4</span> أو <span className="mdl-num">5</span>{" "}
            برامج بتدفع اشتراكها كل شهر ومش بتتكلم مع بعض.
          </p>

          <div className="mt-7 flex flex-wrap gap-2.5">
            <Link
              to="/register"
              onMouseEnter={onPreloadRegister}
              onFocus={onPreloadRegister}
              onClick={() =>
                trackPlatformSiteLead("hero_register", {
                  destination: "/register",
                  landing_variant: "merchant-daylight",
                })
              }
              className="mdl-btn mdl-btn--primary"
            >
              افتح متجرك مجانًا
            </Link>
            <a
              href={mdlWhatsAppLink("مرحباً، عايز أعرف أنهي باقة تناسب نشاطي وابتدأ إزاي")}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                trackPlatformSiteLead("hero_whatsapp", {
                  destination: "whatsapp",
                  landing_variant: "merchant-daylight",
                })
              }
              className="mdl-btn mdl-btn--wa"
            >
              اسأل على واتساب
            </a>
            <a href="#mdl-pricing" className="mdl-btn mdl-btn--ghost">
              شوف الأسعار
            </a>
          </div>

          <p className="mt-3 text-[12.5px] text-[#6B7280]">
            من غير بطاقة بنكية · تفعيل في نفس اليوم · دعم بالعربي من مصر
          </p>

          <dl className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-[#E6E8EC] bg-[#E6E8EC]">
            {PLATFORM_STATS.map((stat, index) => (
              <div
                key={stat.label}
                className="min-w-0 bg-white px-2.5 py-3.5 text-center sm:px-4 sm:text-right"
                title={stat.label}
              >
                <dt className="mdl-num text-[19px] font-bold leading-none sm:text-[22px]">
                  {stat.value}
                </dt>
                <dd className="mt-1.5 text-[12px] leading-snug text-[#6B7280]">
                  {STAT_SHORT_LABELS[index] || stat.label}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-[11.5px] text-[#9AA1AC]">{PLATFORM_STATS_DATE}</p>
        </div>

        <div className="min-w-0 lg:col-span-6">
          <MdlOrderSurface />
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {[
              "WhatsApp Cloud API",
              "بوسطة",
              "Turbo",
              "QP Express",
              "Paymob",
              "الفاتورة الإلكترونية ETA",
            ].map((integration) => (
              <li key={integration} className="mdl-chip">
                {integration}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default MdlHero;
