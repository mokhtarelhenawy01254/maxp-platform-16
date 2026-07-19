import React from "react";
import { Link } from "react-router-dom";
import { FooterSettings } from "../../../services/footerSettingsService";
import { withStorefrontCompany } from "../../../utils/storefrontLinks";

interface FooterLuxeProps {
  companyId: string | null;
  settings: FooterSettings;
  storePages: Array<{ id: string; title: string; slug: string }>;
}

const FooterLuxe: React.FC<Readonly<FooterLuxeProps>> = ({
  companyId,
  settings,
  storePages,
}) => {
  const year = new Date().getFullYear().toString();
  const companyDisplayName =
    settings.copyrightText?.match(/©\s*\d{4}\s*([^.]+)/)?.[1]?.trim() ||
    "LUXE";
  const coreLinks = [
    { label: "المنتجات", path: "/shop" },
    { label: "السلة", path: "/shop/cart" },
    { label: "تتبع الطلب", path: "/shop/track-order" },
    { label: "الأسئلة الشائعة", path: "/faq" },
    { label: "تواصل معنا", path: "/contact" },
  ];

  return (
    <footer className="bg-slate-900 text-slate-300 mt-auto" dir="rtl">
      <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3 text-white">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-luxe-500/20 text-luxe-500 font-black">
              {companyDisplayName.slice(0, 1)}
            </span>
            <h2 className="text-2xl font-extrabold tracking-tight">
              {companyDisplayName}
            </h2>
          </div>
          {settings.showAboutStore && (
            <p className="text-sm leading-relaxed text-slate-400">
              {settings.aboutStore}
            </p>
          )}
          <div className="flex items-center gap-3">
            {settings.showEmail && settings.email && (
              <a
                href={`mailto:${settings.email}`}
                className="text-xs uppercase tracking-widest text-luxe-500 hover:text-white transition-colors"
              >
                {settings.email}
              </a>
            )}
          </div>
        </div>

        <div>
          <h5 className="text-white font-bold mb-6">التسوق</h5>
          <ul className="flex flex-col gap-4 text-sm">
            {coreLinks.map((item) => (
              <li key={item.path}>
                <Link
                  className="hover:text-luxe-500 transition-colors"
                  to={withStorefrontCompany(item.path, companyId)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h5 className="text-white font-bold mb-6">المساعدة</h5>
          <ul className="flex flex-col gap-4 text-sm">
            {storePages.slice(0, 4).map((page) => (
              <li key={page.id}>
                <Link
                  className="hover:text-luxe-500 transition-colors"
                  to={withStorefrontCompany(`/shop/page/${page.slug}`, companyId)}
                >
                  {page.title}
                </Link>
              </li>
            ))}
            <li>
              <Link
                className="hover:text-luxe-500 transition-colors"
                to={withStorefrontCompany("/contact", companyId)}
              >
                تواصل معنا
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h5 className="text-white font-bold mb-6">زورينا</h5>
          {settings.showAddress && settings.address && (
            <p className="text-sm mb-4 text-slate-400">{settings.address}</p>
          )}
          {settings.showPhone && settings.phone && (
            <p className="text-sm text-slate-400">{settings.phone}</p>
          )}
          <div className="mt-6">
            <Link
              className="inline-flex items-center gap-2 text-luxe-500 text-sm font-semibold hover:text-white transition-colors"
              to={withStorefrontCompany("/contact", companyId)}
            >
              احجز موعداً
            </Link>
          </div>
        </div>
      </div>

      {settings.showCopyright && (
        <div className="border-t border-slate-800">
          <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
            <p>
              {settings.copyrightText?.replace("{year}", year) ||
                `© ${year} ${companyDisplayName}. جميع الحقوق محفوظة.`}
            </p>
            {storePages.length > 0 && (
              <div className="flex items-center gap-8">
                {storePages.slice(0, 3).map((page) => (
                  <Link
                    key={page.id}
                    className="hover:text-white"
                    to={withStorefrontCompany(`/shop/page/${page.slug}`, companyId)}
                  >
                    {page.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </footer>
  );
};

export default FooterLuxe;
