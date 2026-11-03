import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ArrowLeft, Sparkles } from "lucide-react";

export const OlPricing: React.FC = () => {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <section id="pricing" className="py-20 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#013735]/5 text-[#013735] text-xs font-bold mb-4">
            <span>أسعار بسيطة وشفافة</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold text-[#013735] tracking-tight">
            باقات واضحة بدون عمولات خفية
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-[#4e6362]">
            لا نأخذ أي نسبة من مبيعاتك (0% عمولة). اختر الخطة المناسبة لحجم
            عملياتك وألغِ اشتراكك في أي وقت.
          </p>

          {/* Toggle */}
          <div className="mt-8 inline-flex items-center p-1 rounded-2xl bg-white border border-[#013735]/15 shadow-sm">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                !isAnnual
                  ? "bg-[#013735] text-white"
                  : "text-[#4e6362] hover:text-[#013735]"
              }`}
            >
              دفع شهري
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                isAnnual
                  ? "bg-[#013735] text-white"
                  : "text-[#4e6362] hover:text-[#013735]"
              }`}
            >
              <span>دفع سنوي</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#3fffba] text-[#002624] font-bold">
                وفر 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. Starter */}
          <div className="ol-card p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-[#4e6362] block mb-1">
                باقة الانطلاقة
              </span>
              <h3 className="text-xl font-bold text-[#013735]">ستارتر (Starter)</h3>
              <p className="text-xs text-[#4e6362] mt-2">
                مثالية للمتاجر الناشئة والصفحات التي تبدأ بيعها على السوشيال ميديا.
              </p>

              <div className="my-6">
                <span className="text-3xl sm:text-4xl font-bold text-[#013735] tabular-nums">
                  {isAnnual ? "490" : "590"}
                </span>
                <span className="text-xs text-[#4e6362] mr-1.5">ج.م / شهرياً</span>
              </div>

              <div className="space-y-3 border-t border-[#013735]/10 pt-6 text-xs text-[#072524]">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>حتى 400 طلب شهرياً</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>ربط بوسطة وأرامكس وطباعة البوالص</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>تأكيد الطلبات آلياً عبر واتساب</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>مستخدمان اثنان (2 Users)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>0% عمولة على المبيعات</span>
                </div>
              </div>
            </div>

            <Link
              to="/register"
              className="mt-8 ol-btn-ghost w-full py-3 rounded-xl text-center font-bold text-xs"
            >
              ابدأ مجاناً 14 يوم
            </Link>
          </div>

          {/* 2. Growth (Featured) */}
          <div className="ol-card p-6 sm:p-8 flex flex-col justify-between border-2 border-[#013735] relative shadow-xl">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#013735] text-[#3fffba] text-[11px] font-bold shadow-md">
              الأكثر اختياراً لفرق العمليات
            </div>

            <div>
              <span className="text-xs font-bold text-[#02817d] block mb-1">
                باقة التوسع
              </span>
              <h3 className="text-xl font-bold text-[#013735]">نمو (Growth)</h3>
              <p className="text-xs text-[#4e6362] mt-2">
                للمتاجر والعلامات التجارية التي تشحن يومياً وتبحث عن تقليل المرتجع وأتمتة التجهيز.
              </p>

              <div className="my-6">
                <span className="text-3xl sm:text-4xl font-bold text-[#013735] tabular-nums">
                  {isAnnual ? "990" : "1,190"}
                </span>
                <span className="text-xs text-[#4e6362] mr-1.5">ج.م / شهرياً</span>
              </div>

              <div className="space-y-3 border-t border-[#013735]/10 pt-6 text-xs text-[#072524]">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#22c790]" />
                  <span className="font-bold">حتى 1,800 طلب شهرياً</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#22c790]" />
                  <span>تأكيد طلبات غير محدود + روبوت واتساب ذكي</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#22c790]" />
                  <span>مزامنة فروع ومخازن متعددة ونقاط البيع POS</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#22c790]" />
                  <span>مطابقة كشوف حساب تحصيلات الـ COD</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#22c790]" />
                  <span>حتى 6 مستخدمين وصلاحيات مخصصة</span>
                </div>
              </div>
            </div>

            <Link
              to="/register"
              className="mt-8 ol-btn-primary w-full py-3.5 rounded-xl text-center font-bold text-xs shadow-md"
            >
              ابدأ تجربتك الآن مجاناً
            </Link>
          </div>

          {/* 3. Enterprise */}
          <div className="ol-card p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-[#4e6362] block mb-1">
                باقة الشركات الكبرى
              </span>
              <h3 className="text-xl font-bold text-[#013735]">المؤسسات (Scale)</h3>
              <p className="text-xs text-[#4e6362] mt-2">
                للشركات ومجموعات البراندات التي تحتاج تخصيص كامل وربط عبر الـ API وسيرفر مخصص.
              </p>

              <div className="my-6">
                <span className="text-3xl sm:text-4xl font-bold text-[#013735] tabular-nums">
                  {isAnnual ? "2,490" : "2,990"}
                </span>
                <span className="text-xs text-[#4e6362] mr-1.5">ج.م / شهرياً</span>
              </div>

              <div className="space-y-3 border-t border-[#013735]/10 pt-6 text-xs text-[#072524]">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>طلبات وبوالص غير محدودة</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>مدير حساب مخصص وتدريب لفريقك كاملاً</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>ربط API خاص وWebhooks وتكامل مخصص</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>عدد لا محدود من المستخدمين والفروع</span>
                </div>
              </div>
            </div>

            <a
              href="https://wa.me/201123087745?text=مرحباً،%20أريد%20الاستفسار%20عن%20باقة%20المؤسسات%20في%20MaxP"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 ol-btn-ghost w-full py-3 rounded-xl text-center font-bold text-xs"
            >
              تواصل مع المبيعات
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
