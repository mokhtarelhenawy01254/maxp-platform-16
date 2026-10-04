import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Phone, Mail, MapPin, MessageSquare, Sparkles } from "lucide-react";
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
    <footer className="relative border-t border-white/[0.08] bg-[#050505] pt-20 pb-12 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Pre-footer Open Action Section (Zero Box-in-Box) */}
        <div className="relative py-16 sm:py-24 text-center border-b border-white/[0.08] mb-16 overflow-hidden">
          {/* Subtle Ambient Radial Light */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-red-600/[0.06] rounded-full blur-[120px] pointer-events-none"
            aria-hidden="true"
          />

          <div className="max-w-3xl mx-auto space-y-6 relative z-10">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>جاهز لإنهاء فوضى الإكسيل والمشتتات؟</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              ابدأ تشغيل نشاطك بنظام
              <br />
              <span className="text-zinc-400 font-normal">يتحمل أعباء مبيعاتك ومخازنك بالكامل.</span>
            </h2>

            <p className="text-base sm:text-lg text-zinc-300 leading-relaxed max-w-2xl mx-auto font-normal">
              انضم إلى مئات التجار الذين يتابعون أوردراتهم، جرد محلاتهم، ومحادثات واتساب من شاشة واحدة بكل هدوء وثقة.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                to="/register"
                onClick={handleLeadClick("footer_cta_register", "/register")}
                onMouseEnter={onPreloadRegister}
                onFocus={onPreloadRegister}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-full bg-white text-black font-bold px-8 py-4 text-sm hover:bg-zinc-200 transition-all active:scale-[0.98] shadow-xl shadow-white/10"
              >
                <span>ابدأ تجربتك المجانية الآن</span>
                <ArrowLeft className="w-4 h-4" />
              </Link>

              <a
                href="https://wa.me/201123087745?text=مرحباً،%20أريد%20معرفة%20المزيد%20عن%20منصة%20MaxP"
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleLeadClick("footer_whatsapp", "https://wa.me/201123087745")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full text-zinc-300 hover:text-white px-6 py-3.5 text-sm font-medium transition-colors"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>تحدث مع مستشار تشغيل تجاري</span>
              </a>
            </div>

            <span className="block text-xs text-zinc-400 font-mono mt-3">
              بدون بطاقة بنكية • نقل بياناتك القديمة بدون تعطيل • دعم فني مخصص في مصر
            </span>
          </div>
        </div>

        {/* Footer Navigation Columns — Open Clean Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-12 text-xs">
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-white text-black font-black text-xs flex items-center justify-center">
                P
              </span>
              <span className="font-black text-white text-base tracking-tight">
                MAX P
              </span>
            </div>
            <p className="text-zinc-400 text-xs leading-relaxed max-w-sm">
              نظام تشغيل موحد للتجارة والشركات يجمع الرد الآلي بالذكاء الاصطناعي، جرد المخازن، بوالص الشحن، وإدارة الأرباح في مركز قرار واحد.
            </p>
            <div className="text-[11px] text-zinc-400 font-mono space-y-1">
              <div>القاهرة، جمهورية مصر العربية</div>
              <div dir="ltr" className="text-right">support@maxp.online</div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs">الأنظمة الأساسية</h4>
            <ul className="space-y-2 text-zinc-400">
              <li><a href="#systems-slider" className="hover:text-white transition-colors">واتساب والسوشيال الذكي</a></li>
              <li><a href="#systems-slider" className="hover:text-white transition-colors">الكول سنتر والشحن الفوري</a></li>
              <li><a href="#systems-slider" className="hover:text-white transition-colors">المخازن وجرد الفروع (ERP)</a></li>
              <li><a href="#systems-slider" className="hover:text-white transition-colors">نقاط البيع والكاشير (POS)</a></li>
              <li><a href="#systems-slider" className="hover:text-white transition-colors">المالية وصافي الربح (P&L)</a></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs">التكاملات في مصر</h4>
            <ul className="space-y-2 text-zinc-400">
              <li><span>WhatsApp Cloud API</span></li>
              <li><span>شركة بوسطة للشحن</span></li>
              <li><span>بوابات دفع Paymob</span></li>
              <li><span>WooCommerce و Shopify</span></li>
              <li><span>الفاتورة الإلكترونية المصرية</span></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs">روابط سريعة</h4>
            <ul className="space-y-2 text-zinc-400">
              <li><Link to="/login" className="hover:text-white transition-colors">تسجيل الدخول</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">إنشاء حساب جديد</Link></li>
              <li><a href="#calculator" className="hover:text-white transition-colors">حاسبة الوفر</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors">الأسئلة الشائعة</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Rights */}
        <div className="pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400 font-mono">
          <div>
            جميع الحقوق محفوظة © {new Date().getFullYear()} Max P Platform.
          </div>
          <div className="flex items-center gap-6">
            <Link to="/terms" className="hover:text-white transition-colors">الشروط والأحكام</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">سياسة الخصوصية</Link>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default LandingFooter;
