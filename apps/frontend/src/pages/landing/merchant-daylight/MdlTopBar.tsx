import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { trackPlatformSiteLead } from "../../../utils/platformSiteMetaPixel";
import { mdlWhatsAppLink } from "./merchantDaylightData";

const NAV_ITEMS = [
  { href: "#mdl-solutions", label: "الحلول حسب نشاطك" },
  { href: "#mdl-journey", label: "رحلة الأوردر" },
  { href: "#mdl-value", label: "ليه أرخص" },
  { href: "#mdl-pricing", label: "الأسعار" },
];

interface MdlTopBarProps {
  onPreloadAuth?: () => void;
  onPreloadRegister?: () => void;
}

export const MdlTopBar: React.FC<MdlTopBarProps> = ({
  onPreloadAuth,
  onPreloadRegister,
}) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, [open]);

  return (
    <header className="mdl sticky top-0 z-40 border-b border-[#E6E8EC] bg-white/95 backdrop-blur">
      <div className="mdl-shell flex h-[62px] items-center justify-between gap-4">
        <a href="#mdl-top" className="flex items-center gap-2 no-underline" aria-label="MaxP — الصفحة الرئيسية">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#0E1116] text-[13px] font-bold text-white">
            M
          </span>
          <span className="text-[15px] font-bold text-[#0E1116]">MaxP</span>
          <span className="hidden text-[11px] font-semibold text-[#6B7280] sm:inline">
            نظام تشغيل المتاجر
          </span>
        </a>

        <nav className="hidden items-center gap-1 md:flex" aria-label="أقسام الصفحة">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-[13.5px] font-semibold text-[#39414D] no-underline transition-colors hover:bg-[#F1F3F6] hover:text-[#0E1116]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            to="/login"
            onMouseEnter={onPreloadAuth}
            onFocus={onPreloadAuth}
            onClick={() =>
              trackPlatformSiteLead("nav_login", { landing_variant: "merchant-daylight" })
            }
            className="rounded-lg px-3 py-2 text-[13.5px] font-semibold text-[#39414D] no-underline transition-colors hover:bg-[#F1F3F6]"
          >
            دخول
          </Link>
          <Link
            to="/register"
            onMouseEnter={onPreloadRegister}
            onFocus={onPreloadRegister}
            onClick={() =>
              trackPlatformSiteLead("nav_register", {
                destination: "/register",
                landing_variant: "merchant-daylight",
              })
            }
            className="mdl-btn mdl-btn--primary mdl-btn--sm"
          >
            افتح متجر مجاني
          </Link>
        </div>

        <button
          type="button"
          aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-lg border border-[#E6E8EC] bg-white text-[#0E1116] md:hidden"
        >
          <span className="sr-only">القائمة</span>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" fill="none">
            {open ? (
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            ) : (
              <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-[#E6E8EC] bg-white md:hidden">
          <nav className="mdl-shell flex flex-col py-2" aria-label="أقسام الصفحة">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="border-b border-[#F1F3F6] py-3 text-[14px] font-semibold text-[#39414D] no-underline last:border-b-0"
              >
                {item.label}
              </a>
            ))}
            <div className="flex gap-2 py-3">
              <Link to="/login" className="mdl-btn mdl-btn--ghost mdl-btn--sm flex-1">
                دخول
              </Link>
              <Link to="/register" className="mdl-btn mdl-btn--primary mdl-btn--sm flex-1">
                افتح متجر مجاني
              </Link>
            </div>
            <a
              href={mdlWhatsAppLink("مرحباً، عايز أعرف أنهي باقة تناسب نشاطي في MaxP")}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                trackPlatformSiteLead("nav_whatsapp", { landing_variant: "merchant-daylight" })
              }
              className="pb-3 text-[14px] font-semibold text-[#0B7A52] no-underline"
            >
              اسأل على واتساب
            </a>
          </nav>
        </div>
      )}
    </header>
  );
};

export default MdlTopBar;
