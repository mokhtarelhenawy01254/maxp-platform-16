import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Clock, DollarSign } from "lucide-react";
import { trackPlatformSiteLead } from "../../../utils/platformSiteMetaPixel";

export const LandingRoiCalculator: React.FC = () => {
  const [revenue, setRevenue] = useState(150000);
  const [monthlyChats, setMonthlyChats] = useState(1200);
  const [teamSize, setTeamSize] = useState(4);

  // Realistic ROI calculations
  const calculations = useMemo(() => {
    // Subscriptions saved (separate CRM, Chatbot, Inventory, HR, Marketing)
    const softwareSavedMonthly = Math.min(8500, Math.max(3200, Math.round(teamSize * 750 + 2000)));
    
    // Hours saved per month (3 mins per chat automation + 15 mins daily per employee on manual tasks)
    const hoursSavedMonthly = Math.round((monthlyChats * 0.04) + (teamSize * 18));
    
    // Recovered sales from instant 2-second AI auto-replies (conservatively 6% of revenue)
    const recoveredSalesMonthly = Math.round(revenue * 0.065);

    // Total estimated monthly benefit
    const totalMonthlyBenefit = softwareSavedMonthly + recoveredSalesMonthly;
    const annualBenefit = totalMonthlyBenefit * 12;

    return {
      softwareSavedMonthly,
      hoursSavedMonthly,
      recoveredSalesMonthly,
      totalMonthlyBenefit,
      annualBenefit,
    };
  }, [revenue, monthlyChats, teamSize]);

  return (
    <section id="calculator" className="relative py-24 sm:py-36 border-t border-white/[0.06] bg-zinc-950/40">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        
        {/* Section Heading */}
        <div className="max-w-2xl mb-16 text-right">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-zinc-400 text-[11px] font-mono mb-4">
            <span>حاسبة الأثر المالي والتشغيلي</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.15] mb-4">
            احسب كم ستوفر شهرياً،
            <br />
            <span className="text-zinc-400 font-normal">وقيمة المبيعات المستردة.</span>
          </h2>
          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
            حرك المؤشرات حسب أرقام نشاطك الحالية وشاهد الوفر المتوقع في اشتراكات البرامج وساعات العمل المهدرة.
          </p>
        </div>

        {/* Double-Bezel Calculator Container */}
        <div className="p-1 sm:p-1.5 rounded-[2.5rem] bg-white/[0.03] border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] shadow-2xl">
          <div className="rounded-[calc(2.5rem-0.375rem)] bg-zinc-950 p-6 sm:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              
              {/* Sliders Input Area */}
              <div className="lg:col-span-7 space-y-7">
                
                {/* Slider 1: Revenue */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs sm:text-sm font-medium">
                    <span className="text-zinc-300 font-sans">متوسط الإيراد الشهري للنشاط</span>
                    <span className="text-white font-mono text-base font-bold">
                      {revenue.toLocaleString()} ج.م
                    </span>
                  </div>
                  <input
                    type="range"
                    min="30000"
                    max="1000000"
                    step="10000"
                    value={revenue}
                    onChange={(e) => setRevenue(Number(e.target.value))}
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                    <span>30,000 ج.م</span>
                    <span>1,000,000 ج.م</span>
                  </div>
                </div>

                {/* Slider 2: Monthly Inbound Chats */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs sm:text-sm font-medium">
                    <span className="text-zinc-300 font-sans">عدد محادثات العملاء شهرياً</span>
                    <span className="text-white font-mono text-base font-bold">
                      {monthlyChats.toLocaleString()} محادثة
                    </span>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="8000"
                    step="100"
                    value={monthlyChats}
                    onChange={(e) => setMonthlyChats(Number(e.target.value))}
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                    <span>200 محادثة</span>
                    <span>8,000 محادثة</span>
                  </div>
                </div>

                {/* Slider 3: Team Members */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs sm:text-sm font-medium">
                    <span className="text-zinc-300 font-sans">عدد أفراد فريق المبيعات والتشغيل</span>
                    <span className="text-white font-mono text-base font-bold">
                      {teamSize} أفراد
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="25"
                    step="1"
                    value={teamSize}
                    onChange={(e) => setTeamSize(Number(e.target.value))}
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                    <span>فرد 1</span>
                    <span>25 فرداً</span>
                  </div>
                </div>

              </div>

              {/* Outputs Box */}
              <div className="lg:col-span-5 space-y-4">
                
                {/* Total Annual Benefit */}
                <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 text-center space-y-2">
                  <div className="text-[11px] font-mono text-zinc-400 uppercase">
                    إجمالي العائد الإضافي والوفر السنوي
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                    {calculations.annualBenefit.toLocaleString()} <span className="text-xs font-normal text-zinc-400">ج.م/سنة</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono">
                    حوالي {calculations.totalMonthlyBenefit.toLocaleString()} ج.م فائدة شهرية مباشرة
                  </div>
                </div>

                {/* Breakdown Rows */}
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 space-y-1">
                    <div className="text-zinc-400 text-[10px] flex items-center gap-1 font-sans">
                      <Clock className="w-3 h-3 text-zinc-400" />
                      ساعات عمل موفرة
                    </div>
                    <div className="text-sm font-bold text-white">
                      {calculations.hoursSavedMonthly} ساعة/شهر
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 space-y-1">
                    <div className="text-zinc-400 text-[10px] flex items-center gap-1 font-sans">
                      <DollarSign className="w-3 h-3 text-emerald-400" />
                      مبيعات مستردة
                    </div>
                    <div className="text-sm font-bold text-emerald-400">
                      +{calculations.recoveredSalesMonthly.toLocaleString()} ج.م
                    </div>
                  </div>
                </div>

                {/* CTA Button with Button-in-Button pattern */}
                <Link
                  to="/auth/register"
                  onClick={() => {
                    trackPlatformSiteLead("roi_calculator_cta", {
                      destination: "/auth/register",
                      landing_variant: "enterprise-os",
                      calculated_benefit: calculations.annualBenefit,
                    });
                  }}
                  className="w-full group inline-flex items-center justify-between rounded-full bg-zinc-100 hover:bg-white text-zinc-950 font-bold px-6 py-3.5 text-xs transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] shadow-md"
                >
                  <span>ابدأ واسترد مبيعاتك الضائعة</span>
                  <span className="w-6 h-6 rounded-full bg-zinc-900 text-white flex items-center justify-center mr-2 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-x-1">
                    <ArrowLeft className="w-3 h-3" />
                  </span>
                </Link>

              </div>

            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
