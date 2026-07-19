import React from "react";
import { Link } from "react-router-dom";
import { FooterSettings } from "../../../services/footerSettingsService";
import { withStorefrontCompany } from "../../../utils/storefrontLinks";

interface FooterEliteProps {
  companyId: string | null;
  settings: FooterSettings;
  storePages: Array<{ id: string; title: string; slug: string }>;
}

const FooterElite: React.FC<FooterEliteProps> = ({
  companyId,
  settings,
  storePages,
}) => {
  const year = new Date().getFullYear().toString();
  const companyDisplayName = settings.copyrightText?.match(/©\s*\d{4}\s*([^.]+)/)?.[1]?.trim() || "MAX P ELITE";
  const coreLinks = [
    { label: "المنتجات", path: "/shop" },
    { label: "السلة", path: "/shop/cart" },
    { label: "تتبع الطلب", path: "/shop/track-order" },
    { label: "الأسئلة الشائعة", path: "/faq" },
    { label: "تواصل معنا", path: "/contact" },
  ];

  return (
    <footer className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#030712] text-right mt-auto">
      <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 py-16 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12">
        <div className="col-span-2 lg:col-span-2 space-y-6">
          <Link to={withStorefrontCompany("/", companyId)} className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">
            {companyDisplayName.split(' ').slice(0, -1).join(' ')} <span className="text-indigo-600">{companyDisplayName.split(' ').slice(-1)}</span>
          </Link>
          {settings.showAboutStore && (
            <p className="text-slate-500 dark:text-slate-400 font-medium leading-loose max-w-sm">
              {settings.aboutStore}
            </p>
          )}
        </div>
        
        <div className="space-y-6 text-sm">
          <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-widest">روابط المتجر</h4>
          <ul className="space-y-4 font-bold text-slate-500 dark:text-slate-400">
            {coreLinks.map((item) => (
              <li key={item.path}>
                <Link to={withStorefrontCompany(item.path, companyId)} className="hover:text-indigo-600 transition-colors">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="space-y-6 text-sm">
          <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-widest">الدعم المساعدة</h4>
          <ul className="space-y-4 font-bold text-slate-500 dark:text-slate-400">
            {storePages.slice(0, 4).map(page => (
              <li key={page.id}>
                <Link to={withStorefrontCompany(`/shop/page/${page.slug}`, companyId)} className="hover:text-indigo-600 transition-colors">
                  {page.title}
                </Link>
              </li>
            ))}
            <li><Link to={withStorefrontCompany("/contact", companyId)} className="hover:text-indigo-600 transition-colors">اتصل بنا</Link></li>
          </ul>
        </div>

        <div className="space-y-6 text-sm">
          <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-widest">القائمة البريدية</h4>
          <p className="text-slate-500 dark:text-slate-400 font-bold">اشترك للحصول على تنبيهات حصرية بالإصدارات الجديدة.</p>
          <div className="flex gap-2">
            <input 
              type="email" 
              placeholder="بريدك الإلكتروني"
              className="flex-1 h-12 px-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 outline-none focus:border-indigo-500 transition-all font-bold"
            />
            <button className="px-6 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition-all">اشتراك</button>
          </div>
        </div>
      </div>
      
      {settings.showCopyright && (
        <div className="border-t border-slate-100 dark:border-slate-800 py-8 bg-white dark:bg-[#030712]">
          <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
              {settings.copyrightText?.replace("{year}", year) || `© ${year} ${companyDisplayName} • ALL RIGHTS RESERVED`}
            </p>
          </div>
        </div>
      )}
    </footer>
  );
};

export default FooterElite;
