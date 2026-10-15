import React from "react";
import { Link } from "react-router-dom";
import { trackPlatformSiteLead } from "../../../utils/platformSiteMetaPixel";
import { BUNDLE_PRICE } from "./merchantDossierData";

const FOLDERS = [
  { id: "facts", label: "الأرقام", tone: "#ebebeb", ink: "#0d2a1c", tabX: "4%", href: "#md-facts" },
  { id: "stages", label: "الرحلة", tone: "#d9d9d2", ink: "#0d2a1c", tabX: "22%", href: "#md-stages" },
  { id: "board", label: "الشاشات", tone: "#ebebeb", ink: "#0d2a1c", tabX: "40%", href: "#md-board" },
  { id: "index", label: "الأدوات", tone: "#0d2a1c", ink: "#f7f7f7", tabX: "58%", href: "#md-index" },
];

const NAV = [
  { href: "#md-stages", label: "الرحلة" },
  { href: "#md-board", label: "الشاشات" },
  { href: "#md-index", label: "الأدوات" },
  { href: "#md-plans", label: "السعر" },
];

interface MdFolderHeroProps {
  onPreloadRegister?: () => void;
  onPreloadAuth?: () => void;
}

/** الهيرو: رزمة ملفات — كل ملف بيبان لسانه واسمه، والملف المفتوح قصاده الفعل الوحيد. */
export const MdFolderHero: React.FC<MdFolderHeroProps> = ({
  onPreloadRegister,
  onPreloadAuth,
}) => (
  <>
    <header className="md" dir="rtl">
      <div className="md-shell flex items-center justify-between gap-4 py-5">
        <a href="#md-top" className="md-link md-num text-[19px] font-semibold" aria-label="MaxP">
          MaxP
        </a>
        <nav className="hidden items-center gap-7 md:flex" aria-label="أقسام الصفحة">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="md-link md-small font-semibold">
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-5">
          <Link
            to="/login"
            onMouseEnter={onPreloadAuth}
            onFocus={onPreloadAuth}
            className="md-link md-small hidden font-semibold sm:inline"
          >
            دخول
          </Link>
          <Link
            to="/register"
            onMouseEnter={onPreloadRegister}
            onFocus={onPreloadRegister}
            onClick={() =>
              trackPlatformSiteLead("dossier_nav_action", { landing_variant: "merchant-dossier" })
            }
            className="md-action md-small"
            style={{ minHeight: 42, padding: "0 16px" }}
          >
            افتح متجرك
          </Link>
        </div>
      </div>
    </header>

    <section id="md-top" className="md pb-6 pt-8 md:pt-14" dir="rtl">
      <div className="md-shell">
        <h1 className="md-display max-w-[16ch]">كل جنيه ليه بوليصة</h1>
        <p className="md-lead mt-7 max-w-[42ch]">
          MaxP ملف واحد: رسالة العميل، تأكيد الأوردر، بوليصة الشحن، والكاش اللي بيوصل. كلهم ماشيين
          على نفس البيانات.
        </p>

        <div className="md-stack mt-12 md:mt-16" aria-label="ملفات المنصة">
          {FOLDERS.map((folder, index) => (
            <a
              key={folder.id}
              href={folder.href}
      className={`md-rise md-folder md-folder--${index} md-tabbed block transition-transform duration-300 ease-out hover:-translate-y-1`}
              style={
                {
                  "--tab-x": folder.tabX,
                  "--tab-w": "132px",
                  "--tab-h": "32px",
                  background: folder.tone,
                  color: folder.ink,
                } as React.CSSProperties
              }
            >
              <span className="md-tab-label">{folder.label}</span>
            </a>
          ))}

          {/* الملف المفتوح */}
          <div
            className="md-folder md-folder--front md-tabbed flex flex-col justify-center gap-5 p-6 md:p-8"
            style={
              {
                "--tab-x": "76%",
                "--tab-w": "132px",
                "--tab-h": "32px",
                background: "#f6e016",
                color: "#0d2a1c",
              } as React.CSSProperties
            }
          >
            <span className="md-tab-label">السعر</span>
            <Link
              to="/register"
              onMouseEnter={onPreloadRegister}
              onFocus={onPreloadRegister}
              onClick={() =>
                trackPlatformSiteLead("dossier_hero_action", {
                  destination: "/register",
                  landing_variant: "merchant-dossier",
                })
              }
              className="md-action md-action--ink self-start"
            >
              0 ج.م، افتح متجرك
            </Link>
            <p className="md-small max-w-[44ch] font-semibold">
              من غير مقدم ومن غير بطاقة بنكية. الباقة الكاملة بـ
              <span className="md-num">{BUNDLE_PRICE}</span> ج.م في الشهر لما تحتاجها.
            </p>
          </div>
        </div>
      </div>
    </section>
  </>
);

export default MdFolderHero;
