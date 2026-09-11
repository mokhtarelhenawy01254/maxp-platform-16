import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Clock, DollarSign, Sparkles } from "lucide-react";
import { trackPlatformSiteLead } from "../../../utils/platformSiteMetaPixel";

export const LandingRoiCalculator: React.FC = () => {
  const [dailyOrders, setDailyOrders] = useState(60);
  const [monthlyChats, setMonthlyChats] = useState(1500);
  const [teamSize, setTeamSize] = useState(4);

  // Realistic Egyptian merchant ROI calculations
  const calculations = useMemo(() => {
    // Subscriptions saved (separate CRM, Chatbot, Inventory ERP, HR, Accounting) in EGP
    const softwareSavedMonthly = Math.round(teamSize * 1200 + 4500);
    
    // Hours saved per month in customer service & manual sheet updates
    const hoursSavedMonthly = Math.round((monthlyChats * 0.05) + (teamSize * 22));
    
    // Returned orders saved (preventing fake orders & cancellations: ~450 EGP cost per return)
    const returnedOrdersSaved = Math.round(dailyOrders * 30 * 0.08);
    const returnShippingSavedEgp = returnedOrdersSaved * 95; // 95 EGP average roundtrip shipping loss

    // Recovered sales from instant WhatsApp auto-replies
    const recoveredSalesMonthly = Math.round(dailyOrders * 30 * 0.06 * 550); // average order 550 EGP

    // Total estimated monthly economic benefit in EGP
    const totalMonthlyBenefit = softwareSavedMonthly + returnShippingSavedEgp + Math.round(recoveredSalesMonthly * 0.25);
    const annualBenefit = totalMonthlyBenefit * 12;

    return {
      softwareSavedMonthly,
      hoursSavedMonthly,
      returnedOrdersSaved,
      returnShippingSavedEgp,
      recoveredSalesMonthly,
      totalMonthlyBenefit,
      annualBenefit,
    };
  }, [dailyOrders, monthlyChats, teamSize]);

  return (
    <section id="calculator" className="relative py-24 sm:py-32 border-t border-white/[0.06]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading — Open & Breathable */}
        <div className="max-w-3xl mb-14">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>حاسبة الأثر والوفر المالي للأنشطة التجارية في مصر</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            احسب كم ستوفر شهرياً...
            <br />
            <span className="text-zinc-400 font-normal">بالجنيه المصري وساعات عمل فريقك.</span>
          </h2>
          <p className="mt-3 text-base text-zinc-400 leading-relaxed">
            عدّل الأرقام حسب حجم نشاطك الحالي، وشاهد الوفر الحقيقي في مصاريف الشحن المرتجع، اشتراكات البرامج، وساعات العمل الضائعة.
          </p>
        </div>

        {/* The Open Surface (Zero Box-in-Box) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Sliders Area (7 cols) */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Slider 1: Daily Orders */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="dailyOrdersInput" className="text-sm font-bold text-white">
                  متوسط الطلبات اليومية (أوردر/يوم)
                </label>
                <span className="text-base font-mono font-black text-emerald-400">
                  {dailyOrders} أوردر
                </span>
              </div>
              <input
                id="dailyOrdersInput"
                type="range"
                min="10"
                max="500"
                step="10"
                value={dailyOrders}
                onChange={(e) => setDailyOrders(Number(e.target.value))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
              />
              <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                <span>10 أوردرات</span>
                <span>250 أوردر</span>
                <span>500+ أوردر</span>
              </div>
            </div>

            {/* Slider 2: Monthly WhatsApp Chats */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="monthlyChatsInput" className="text-sm font-bold text-white">
                  رسائل الواتساب والسوشيال شهرياً
                </label>
                <span className="text-base font-mono font-black text-emerald-400">
                  {monthlyChats.toLocaleString("ar-EG")} محادثة
                </span>
              </div>
              <input
                id="monthlyChatsInput"
                type="range"
                min="300"
                max="15000"
                step="300"
                value={monthlyChats}
                onChange={(e) => setMonthlyChats(Number(e.target.value))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
              />
              <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                <span>300 رسالة</span>
                <span>7,500 رسالة</span>
                <span>15,000+ رسالة</span>
              </div>
            </div>

            {/* Slider 3: Team Size */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="teamSizeInput" className="text-sm font-bold text-white">
                  حجم الفريق (كول سنتر، مخزن، مبيعات)
                </label>
                <span className="text-base font-mono font-black text-emerald-400">
                  {teamSize} أفراد
                </span>
              </div>
              <input
                id="teamSizeInput"
                type="range"
                min="1"
                max="30"
                step="1"
                value={teamSize}
                onChange={(e) => setTeamSize(Number(e.target.value))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
              />
              <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                <span>فرد واحد</span>
                <span>15 فرداً</span>
                <span>30+ فرداً</span>
              </div>
            </div>

          </div>

          {/* Results Area (5 cols) — Open Clean Vertical Column */}
          <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-r border-white/[0.08] pt-8 lg:pt-0 lg:pr-10 space-y-6">
            
            {/* Big Headline Stat */}
            <div>
              <span className="text-xs font-mono text-zinc-400 block mb-1">
                إجمالي الوفر والعائد المتوقع شهرياً:
              </span>
              <div className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                {calculations.totalMonthlyBenefit.toLocaleString("ar-EG")} <span className="text-xl text-emerald-400 font-bold">ج.م/شهر</span>
              </div>
              <span className="text-xs text-zinc-400 font-mono mt-1 block">
                أكثر من {(calculations.annualBenefit / 1000).toFixed(0)} ألف جنيه وفر سنوي لنشاطك
              </span>
            </div>

            {/* Breakdown Items (No Cards) */}
            <div className="space-y-3 border-t border-white/[0.08] pt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">توفير اشتراكات البرامج المتفرقة:</span>
                <span className="font-mono font-bold text-white">
                  {calculations.softwareSavedMonthly.toLocaleString("ar-EG")} ج.م
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">وفر مصاريف شحن المرتجع الملغي:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {calculations.returnShippingSavedEgp.toLocaleString("ar-EG")} ج.م
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">ساعات عمل موفرة لفريقك شهرياً:</span>
                <span className="font-mono font-bold text-white">
                  {calculations.hoursSavedMonthly} ساعة
                </span>
              </div>
            </div>

            {/* CTA */}
            <div className="pt-2">
              <Link
                to="/register"
                onClick={() =>
                  trackPlatformSiteLead({
                    cta_type: "roi_calculator_start",
                    placement: "roi_calculator_results",
                  })
                }
                className="w-full inline-flex items-center justify-center gap-2.5 rounded-full bg-white text-black font-bold px-6 py-3.5 text-sm hover:bg-zinc-200 transition-all active:scale-[0.98]"
              >
                <span>ابدأ في تحقيق هذا الوفر الآن</span>
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <span className="block text-center text-[10px] text-zinc-400 font-mono mt-2">
                تجربة مجانية بالكامل • بدون إدخال فيزا
              </span>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};

export default LandingRoiCalculator;
