import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Phone, Mail, MapPin } from "lucide-react";
import { trackPlatformSiteLead } from "../../../utils/platformSiteMetaPixel";

interface LandingFooterProps {
  onPreloadRegister?: () => void;
}

export const LandingFooter: React.FC<LandingFooterProps> = ({
  onPreloadRegister,
}) => {
  const handleLeadClick =
    (eventSource: string, destination: string) => () => {
      trackPlatformSiteLead(eventSource, {
        destination,
        landing_variant: "enterprise-os",
      });
    };

  return (
    <footer className="relative border-t border-white/[0.08] bg-[#050505] pt-24 pb-12 overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        
        {/* Pre-footer High Impact CTA with Double-Bezel */}
        <div className="p-1 sm:p-1.5 rounded-[2.5rem] bg-white/[0.03] border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] shadow-2xl mb-24">
          <div className="rounded-[calc(2.5rem-0.375rem)] bg-zinc-950 p-8 sm:p-14 text-center">
            <div className="max-w-2xl mx-auto space-y-6">
              <span className="inline-block text-[11px] font-mono text-zinc-400 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10">
                START OPERATING TODAY
              </span>

              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                ابدأ تشغيل نشاطك بنظام
                <br />
                <span className="text-zinc-400 font-normal">يتحمل أعباء يومك بالكامل.</span>
              </h2>

              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-sans">
                انضم إلى مئات التجار والشركات التي تتابع مبيعاتها، مخازنها، ومحادثات عملائها من شاشة واحدة بكل هدوء وثقة.
              </p>

              {/* Island Button with Button-in-Button */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link
                  to="/auth/register"
                  onClick={handleLeadClick("footer_cta_register", "/auth/register")}
                  onMouseEnter={onPreloadRegister}
                  onFocus={onPreloadRegister}
                  className="w-full sm:w-auto group inline-flex items-center justify-between rounded-full bg-zinc-100 hover:bg-white text-zinc-950 font-bold px-6 py-3.5 text-sm transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] shadow-md"
                >
                  <span>بدء التجربة المجانية</span>
                  <span className="w-7 h-7 rounded-full bg-zinc-900 text-white flex items-center justify-center mr-3 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-x-1">
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </span>
                </Link>

                <a
                  href="https://wa.me/201123087745?text=مرحباً،%20أريد%20معرفة%20المزيد%20عن%20منصة%20MaxP"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleLeadClick("footer_whatsapp_consultant", "whatsapp")}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 px-6 py-3.5 text-sm font-medium text-zinc-300 transition-all duration-300"
                >
                  <span>تحدث مع استشاري تشغيل</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Navigation Columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16 text-xs font-sans">
          <div>
            <div className="font-bold text-white text-sm mb-4 font-mono">المنظومة</div>
            <ul className="space-y-2.5 text-zinc-400">
              <li><a href="#tools" className="hover:text-white transition-colors">صندوق الوارد الموحد</a></li>
              <li><a href="#tools" className="hover:text-white transition-colors">المخازن والمستودعات</a></li>
              <li><a href="#tools" className="hover:text-white transition-colors">مسارات المبيعات (CRM)</a></li>
              <li><a href="#tools" className="hover:text-white transition-colors">التسويات المالية والعمولات</a></li>
              <li><a href="#tools" className="hover:text-white transition-colors">إنتاجية ومتابعة الموظفين</a></li>
            </ul>
          </div>

          <div>
            <div className="font-bold text-white text-sm mb-4 font-mono">القطاعات</div>
            <ul className="space-y-2.5 text-zinc-400">
              <li><span className="text-zinc-300">المتاجر الإلكترونية والبراندات</span></li>
              <li><span className="text-zinc-300">شركات الجملة والتوزيع</span></li>
              <li><span className="text-zinc-300">العيادات والمراكز الطبية</span></li>
              <li><span className="text-zinc-300">وكالات التسويق وإدارة الحسابات</span></li>
              <li><span className="text-zinc-300">الشركات الخدمية والمكاتب</span></li>
            </ul>
          </div>

          <div>
            <div className="font-bold text-white text-sm mb-4 font-mono">التواصل والدعم</div>
            <ul className="space-y-3 text-zinc-400 font-mono">
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>info@maxp.online</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span dir="ltr">+20 11 2308 7745</span>
              </li>
              <li className="flex items-center gap-2 font-sans">
                <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>القاهرة، جمهورية مصر العربية</span>
              </li>
            </ul>
          </div>

          <div>
            <div className="font-bold text-white text-sm mb-4 font-mono">الخصوصية والشروط</div>
            <ul className="space-y-2.5 text-zinc-400">
              <li><Link to="/privacy-policy" className="hover:text-white transition-colors">سياسة الخصوصية</Link></li>
              <li><Link to="/terms-of-service" className="hover:text-white transition-colors">الشروط والأحكام</Link></li>
              <li><Link to="/data-deletion" className="hover:text-white transition-colors">حذف البيانات والأمان</Link></li>
              <li><Link to="/auth/login" className="hover:text-white transition-colors">بوابة دخول العملاء</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Rights */}
        <div className="pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-400 font-mono">
          <div>
            © {new Date().getFullYear()} MAX P BUSINESS OS. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <span>تشفير بيانات كامل</span>
            <span>•</span>
            <span>استقرار تشغيلي 99.9%</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
