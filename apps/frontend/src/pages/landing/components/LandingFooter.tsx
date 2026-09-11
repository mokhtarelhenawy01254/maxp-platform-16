import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, Phone, Mail, MapPin } from "lucide-react";

interface LandingFooterProps {
  onPreloadRegister?: () => void;
}

export const LandingFooter: React.FC<LandingFooterProps> = ({
  onPreloadRegister,
}) => {
  return (
    <footer className="relative border-t border-white/10 bg-slate-950 pt-20 pb-12 overflow-hidden">
      {/* Background Accent */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-red-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        
        {/* Pre-footer High Impact CTA Card */}
        <div className="relative rounded-3xl bg-gradient-to-br from-red-950/40 via-slate-900 to-slate-950 border border-red-500/30 p-8 sm:p-14 text-center shadow-2xl mb-20 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-2xl mx-auto space-y-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              ابدأ تجربتك المجانية اليوم
            </span>

            <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
              جاهز لتتخلص من فوضى التشغيل
              <br />
              <span className="bg-gradient-to-r from-red-500 via-amber-400 to-amber-200 bg-clip-text text-transparent">
                وتضاعف مبيعاتك وأرباحك؟
              </span>
            </h2>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              انضم إلى مئات الشركات الذكية التي تدير كل تفاصيل البيع، المحادثات، والمخازن في شاشة واحدة. لا تحتاج بطاقة بنكية للتجربة.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                to="/auth/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-amber-600 px-8 py-4 text-sm font-black text-white shadow-xl shadow-red-600/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
                onMouseEnter={onPreloadRegister}
                onFocus={onPreloadRegister}
              >
                <span>ابدأ تشغيل نشاطك الآن</span>
                <ArrowLeft className="w-4 h-4" />
              </Link>

              <a
                href="https://wa.me/201123087745?text=مرحباً،%20أريد%20معرفة%20المزيد%20عن%20منصة%20MaxP"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 px-6 py-4 text-sm font-bold text-slate-200 transition-all"
              >
                <span>تحدث مع مستشار تشغيل</span>
              </a>
            </div>
          </div>
        </div>

        {/* Footer Navigation Columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16 text-xs">
          <div>
            <div className="font-bold text-white text-sm mb-4">المنظومة</div>
            <ul className="space-y-2.5 text-slate-400">
              <li><a href="#tools" className="hover:text-white transition-colors">صندوق الوارد الذكي</a></li>
              <li><a href="#tools" className="hover:text-white transition-colors">وكلاء الـ AI التوليديين</a></li>
              <li><a href="#tools" className="hover:text-white transition-colors">المخازن والمشتريات</a></li>
              <li><a href="#tools" className="hover:text-white transition-colors">شريحة الـ CRM ومسارات البيع</a></li>
              <li><a href="#tools" className="hover:text-white transition-colors">المحفظة والتسويات المالية</a></li>
            </ul>
          </div>

          <div>
            <div className="font-bold text-white text-sm mb-4">حلول القطاعات</div>
            <ul className="space-y-2.5 text-slate-400">
              <li><span className="text-slate-300">المتاجر الإلكترونية والبراندات</span></li>
              <li><span className="text-slate-300">تجارة الجملة والتوزيع</span></li>
              <li><span className="text-slate-300">العيادات والمراكز الطبية</span></li>
              <li><span className="text-slate-300">وكالات التسويق وإدارة العملاء</span></li>
              <li><span className="text-slate-300">الشركات الخدمية والمقاولات</span></li>
            </ul>
          </div>

          <div>
            <div className="font-bold text-white text-sm mb-4">تواصل معنا</div>
            <ul className="space-y-3 text-slate-400">
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>info@maxp.online</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span dir="ltr">+20 11 2308 7745</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>القاهرة، جمهورية مصر العربية</span>
              </li>
            </ul>
          </div>

          <div>
            <div className="font-bold text-white text-sm mb-4">القوانين والامتثال</div>
            <ul className="space-y-2.5 text-slate-400">
              <li><Link to="/privacy-policy" className="hover:text-white transition-colors">سياسة الخصوصية</Link></li>
              <li><Link to="/terms-of-service" className="hover:text-white transition-colors">الشروط والأحكام</Link></li>
              <li><Link to="/data-deletion" className="hover:text-white transition-colors">حذف البيانات والأمان</Link></li>
              <li><Link to="/auth/login" className="hover:text-white transition-colors">بوابة دخول العملاء</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Rights */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            © {new Date().getFullYear()} MAX P BUSINESS OS. جميع الحقوق محفوظة.
          </div>
          <div className="flex items-center gap-4">
            <span>مدعوم بالذكاء الاصطناعي التوليدي</span>
            <span>•</span>
            <span>أمان بيانات مشفر 100%</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
