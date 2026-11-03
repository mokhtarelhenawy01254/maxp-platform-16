import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MessageCircle, Phone, ShieldCheck } from "lucide-react";

export const OlFooter: React.FC = () => {
  return (
    <footer className="bg-[#002624] text-white pt-20 pb-12 border-t border-[#013735]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Pre-footer Conversion Banner with Operix Banner Background */}
        <div
          className="rounded-3xl bg-[#013735] border border-[#3fffba]/25 p-8 sm:p-14 text-center relative overflow-hidden mb-20 shadow-2xl bg-center bg-cover"
          style={{ backgroundImage: "url('/operix-assets/banner-bg.svg')" }}
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#3fffba]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#3fffba]/15 text-[#3fffba] text-xs font-bold mb-6">
              <ShieldCheck className="w-4 h-4" />
              <span>تجربة مجانية 14 يوماً بدون بطاقة ائتمان</span>
            </span>

            <h3 className="text-3xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
              جاهز تدير عمليات تجارتك بطريقة أذكى؟
            </h3>

            <p className="mt-4 text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
              انضم إلى مئات المتاجر التي تستخدم MaxP لإدارة الطلبات والشحن والنمو — كلها في نظام واحد.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/register"
                className="ol-btn-mint px-9 py-4 rounded-xl text-base font-bold inline-flex items-center gap-2.5 shadow-lg"
              >
                <span>ابدأ الآن مجاناً</span>
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <a
                href="https://wa.me/201123087745?text=مرحباً،%20أريد%20الاشتراك%20في%20منصة%20MaxP"
                target="_blank"
                rel="noopener noreferrer"
                className="px-7 py-4 rounded-xl text-base font-bold bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-colors inline-flex items-center gap-2.5"
              >
                <MessageCircle className="w-5 h-5 text-emerald-400" />
                <span>تحدث مع فريق العمليات</span>
              </a>
            </div>
          </div>
        </div>

        {/* Footer Navigation Columns */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 border-b border-white/10 pb-14 text-xs">
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-[#3fffba] text-[#002624] font-bold flex items-center justify-center text-lg">
                M
              </div>
              <span className="font-bold text-2xl text-white">MaxP OS</span>
            </div>
            <p className="text-zinc-400 leading-relaxed max-w-sm mb-5 text-sm">
              نظام التشغيل المتكامل لإدارة وتأكيد الطلبات، المخزون، وربط شركات
              الشحن وخدمة العملاء للتجارة الإلكترونية في مصر والشرق الأوسط.
            </p>
            <div className="flex items-center gap-3 text-zinc-400 text-sm">
              <a
                href="tel:+201123087745"
                className="hover:text-[#3fffba] transition-colors flex items-center gap-2"
              >
                <Phone className="w-4 h-4" />
                <span dir="ltr">+20 112 308 7745</span>
              </a>
            </div>
          </div>

          <div>
            <h5 className="font-bold text-white mb-4 text-sm">وحدات النظام</h5>
            <ul className="space-y-2.5 text-zinc-400 text-sm">
              <li><a href="#cockpit" className="hover:text-white transition-colors">إدارة الطلبات</a></li>
              <li><a href="#cockpit" className="hover:text-white transition-colors">إدارة المخزون</a></li>
              <li><a href="#cockpit" className="hover:text-white transition-colors">نظام التذاكر</a></li>
              <li><a href="#cockpit" className="hover:text-white transition-colors">إدارة الشحن</a></li>
              <li><a href="#cockpit" className="hover:text-white transition-colors">أتمتة العمليات</a></li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold text-white mb-4 text-sm">التكاملات</h5>
            <ul className="space-y-2.5 text-zinc-400 text-sm">
              <li><a href="#integrations" className="hover:text-white transition-colors">بوسطة (Bosta)</a></li>
              <li><a href="#integrations" className="hover:text-white transition-colors">أرامكس (Aramex)</a></li>
              <li><a href="#integrations" className="hover:text-white transition-colors">واتساب بيزنس API</a></li>
              <li><a href="#integrations" className="hover:text-white transition-colors">إنستاباي وفوري</a></li>
              <li><a href="#integrations" className="hover:text-white transition-colors">شوبيفاي وسلة وزد</a></li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold text-white mb-4 text-sm">الشركة</h5>
            <ul className="space-y-2.5 text-zinc-400 text-sm">
              <li><a href="#pricing" className="hover:text-white transition-colors">الأسعار</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors">الأسئلة الشائعة</a></li>
              <li><Link to="/about" className="hover:text-white transition-colors">عن MaxP</Link></li>
              <li><Link to="/privacy" className="hover:text-white transition-colors">الخصوصية والشروط</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Credits */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4">
          <p>© {new Date().getFullYear()} MaxP Platform. جميع الحقوق محفوظة.</p>
          <p>صُنع بكل فخر لتمكين التجارة والعمليات في مصر والخليج</p>
        </div>
      </div>
    </footer>
  );
};
