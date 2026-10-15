import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { trackPlatformSiteLead } from "../../../utils/platformSiteMetaPixel";
import { KitOrdersWorkbench } from "../merchant-kit/KitFragment";
import { KIT_WHATSAPP, kitWhatsApp } from "../merchant-kit/kitData";

/** الهيرو: جملة قصيرة فوق، والشريحة الحقيقية شغّالة على مسرح لوني واحد. */
export const PerformsHero: React.FC<{ onPreloadRegister?: () => void }> = ({
  onPreloadRegister,
}) => {
  const shutterRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = shutterRef.current;
    if (!node) return;
    const timer = window.setTimeout(() => node.classList.add("is-open"), 220);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section className="pf" dir="rtl">
      <header className="pf-shell flex items-center justify-between gap-4 py-5">
        <span className="pf-num pf-body font-bold">MaxP</span>
        <nav className="hidden gap-7 md:flex" aria-label="أقسام الصفحة">
          <a className="pf-small font-semibold" href="#pf-numbers">
            الأرقام
          </a>
          <a className="pf-small font-semibold" href="#pf-parts">
            الشاشات
          </a>
          <a className="pf-small font-semibold" href="#pf-plans">
            السعر
          </a>
        </nav>
        <div className="flex items-center gap-4">
          <a className="pf-small hidden font-semibold sm:inline" href={`tel:+${KIT_WHATSAPP}`}>
            <span className="pf-num">+{KIT_WHATSAPP}</span>
          </a>
          <Link
            to="/register"
            onMouseEnter={onPreloadRegister}
            onFocus={onPreloadRegister}
            onClick={() =>
              trackPlatformSiteLead("performs_nav", { landing_variant: "merchant-performs" })
            }
            className="pf-action"
            style={{ minHeight: 44, padding: "0 18px", fontSize: 14 }}
          >
            افتح متجرك
          </Link>
        </div>
      </header>

      <div className="pf-shell grid gap-10 pb-16 pt-6 lg:grid-cols-12 lg:gap-8 lg:pt-10">
        <div className="min-w-0 lg:col-span-4">
          <h1 className="pf-display">دي مش صورة</h1>
          <p className="pf-lead mt-5 max-w-[30ch]">
            دي شاشة الطلبات نفسها شغّالة على الصفحة. جرّب الفلتر، اضغط على أي طلب، وشوف رسالة
            التأكيد بتطلع من نفس المكان.
          </p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            <Link
              to="/register"
              onMouseEnter={onPreloadRegister}
              onFocus={onPreloadRegister}
              onClick={() =>
                trackPlatformSiteLead("performs_hero_action", {
                  destination: "/register",
                  landing_variant: "merchant-performs",
                })
              }
              className="pf-action"
            >
              ابدأ بـ0 ج.م
            </Link>
            <a
              href={kitWhatsApp("مرحباً، جرّبت شاشة الطلبات على الموقع وعايز أعرف أكتر")}
              target="_blank"
              rel="noopener noreferrer"
              className="pf-action pf-action--quiet"
            >
              كلّمنا على واتساب
            </a>
          </div>
          <p className="pf-small pf-muted mt-3">
            من غير بطاقة بنكية · تفعيل في نفس اليوم · دعم بالعربي من مصر
          </p>
        </div>

        <div className="min-w-0 lg:col-span-8">
          <div className="pf-stage">
            <div ref={shutterRef} className="pf-shutter">
              <KitOrdersWorkbench />
            </div>
          </div>
          <p className="pf-small pf-muted mt-3">
            بيانات الشاشة تجريبية ، الشكل والحقول والتفاعل من المنصة نفسها.
          </p>
        </div>
      </div>
    </section>
  );
};

export default PerformsHero;
