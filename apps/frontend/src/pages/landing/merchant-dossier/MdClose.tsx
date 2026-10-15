import React from "react";
import { Link } from "react-router-dom";
import { MD_WHATSAPP, mdWhatsApp } from "./merchantDossierData";

const BLOCKS = [
  { letter: "M", height: "100%", bg: "#f6e016" },
  { letter: "a", height: "76%", bg: "#ebebeb" },
  { letter: "x", height: "88%", bg: "#d9d9d2" },
  { letter: "P", height: "64%", bg: "#f7f7f7" },
];

const COLUMNS = [
  {
    title: "المنتج",
    links: ["المتجر", "الأوردرات", "الشحن", "المخزون"],
  },
  {
    title: "القطاعات",
    links: ["متاجر أونلاين", "مطاعم وكافيهات", "عيادات ومعامل", "شركات بموظفين"],
  },
  {
    title: "المنصة",
    links: ["تسجيل الدخول", "إنشاء حساب", "الأسئلة", "الدعم"],
  },
];

/** الختام: الاسم مبني بالبلوكات على أرض واحدة، وبعده الروابط والاعتمادات. */
export const MdClose: React.FC<{ onPreloadRegister?: () => void }> = ({ onPreloadRegister }) => (
  <footer className="md md-field pt-20" dir="rtl">
    <div className="md-shell">
      <div className="md-rise flex h-[22svh] items-end gap-1 md:h-[34svh]" aria-hidden="true">
        {BLOCKS.map((block) => (
          <span
            key={block.letter}
            className="md-display flex flex-1 items-end justify-center leading-[0.82]"
            style={{ height: block.height, background: block.bg, color: "#0d2a1c" }}
          >
            {block.letter}
          </span>
        ))}
      </div>
      <p className="md-lead mt-8 max-w-[30ch]">نظام تشغيل واحد للمحل والأونلاين.</p>

      <div className="mt-14 grid gap-10 md:grid-cols-12">
        {COLUMNS.map((column) => (
          <div key={column.title} className="md:col-span-3">
            <p className="md-small font-semibold">{column.title}</p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {column.links.map((link) => (
                <li key={link} className="md-small" style={{ color: "#a9b3ad" }}>
                  {link}
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="md:col-span-3">
          <p className="md-small font-semibold">كلّمنا</p>
          <ul className="mt-4 flex flex-col gap-2.5">
            <li className="md-small" style={{ color: "#a9b3ad" }}>
              <a
                href={mdWhatsApp("مرحباً، عايز أعرف أنهي مستوى يناسب شغلي")}
                target="_blank"
                rel="noopener noreferrer"
                className="md-link"
              >
                واتساب
              </a>
            </li>
            <li className="md-small md-num" style={{ color: "#a9b3ad" }}>
              +{MD_WHATSAPP}
            </li>
            <li className="md-small md-num" style={{ color: "#a9b3ad" }}>
              support@maxp.online
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-14 flex flex-wrap items-center justify-between gap-5">
        <p className="md-small" style={{ color: "#a9b3ad" }}>
          © {new Date().getFullYear()} MaxP
        </p>
        <div className="flex flex-wrap items-center gap-6">
          <Link to="/terms" className="md-link md-small" style={{ color: "#a9b3ad" }}>
            الشروط
          </Link>
          <Link to="/privacy" className="md-link md-small" style={{ color: "#a9b3ad" }}>
            الخصوصية
          </Link>
          <Link
            to="/register"
            onMouseEnter={onPreloadRegister}
            onFocus={onPreloadRegister}
            className="md-action"
            style={{ minHeight: 44, padding: "0 18px" }}
          >
            افتح متجرك
          </Link>
        </div>
      </div>

      <p className="md-small mt-12 max-w-[70ch] pb-10" style={{ color: "#8b958f" }}>
        الشاشات في الصفحة دي مصوّرة من المنصة نفسها ببيانات تجريبية، ومفيش أي بيانات عملاء حقيقيين.
      </p>
    </div>
  </footer>
);

export default MdClose;
