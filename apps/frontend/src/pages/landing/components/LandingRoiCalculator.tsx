import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calculator, ArrowLeft, Sparkles, TrendingUp, Clock, DollarSign } from "lucide-react";
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
    <section id="calculator" className="relative py-20 sm:py-28 bg-slate-950/70 border-t border-white/10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-4">
            <Calculator className="w-3.5 h-3.5" />
            <span>حاسبة العائد الاستثماري التفاعلية</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight mb-4">
            احسب كم ستوفر وتربح
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
              عند تشغيل نشاطك على Max P
            </span>
          </h2>
          <p className="text-sm sm:text-base text-slate-300">
            أدخل أرقام نشاطك الحالية، وشاهد وفورات الاشتراكات وقيمة المبيعات المستردة من سرعة الرد بالأتمتة.
          </p>
        </div>

        {/* Calculator Interactive Box */}
        <div className="rounded-3xl bg-slate-900/90 border border-white/15 p-6 sm:p-10 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Sliders Input Area */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Slider 1: Revenue */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
                  <span className="text-slate-300">متوسط الإيراد الشهري التقريبي</span>
                  <span className="text-amber-400 font-mono text-base">
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
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>30,000 ج.م</span>
                  <span>1,000,000 ج.م</span>
                </div>
              </div>

              {/* Slider 2: Monthly Chats */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
                  <span className="text-slate-300">عدد محادثات واستفسارات العملاء شهرياً</span>
                  <span className="text-blue-400 font-mono text-base">
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
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>200 محادثة</span>
                  <span>8,000 محادثة</span>
                </div>
              </div>

              {/* Slider 3: Team Members */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
                  <span className="text-slate-300">عدد أفراد فريق المبيعات والتشغيل</span>
                  <span className="text-purple-400 font-mono text-base">
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
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>موظف 1</span>
                  <span>25 موظف</span>
                </div>
              </div>

            </div>

            {/* Results Cards Output Area */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Annual Total Benefit Card */}
              <div className="rounded-2xl bg-gradient-to-br from-emerald-600/20 via-emerald-950/40 to-slate-950 border border-emerald-500/40 p-5 text-center shadow-lg shadow-emerald-950/40">
                <div className="text-[11px] font-bold text-emerald-400 uppercase mb-1 flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  إجمالي العائد الإضافي والوفورات سنوياً
                </div>
                <div className="text-3xl sm:text-4xl font-black text-white tracking-tight my-1">
                  {calculations.annualBenefit.toLocaleString()}{" "}
                  <span className="text-sm font-bold text-emerald-400">ج.م/سنة</span>
                </div>
                <div className="text-[10px] text-slate-300">
                  حوالي {calculations.totalMonthlyBenefit.toLocaleString()} ج.م فائدة شهرية مباشرة
                </div>
              </div>

              {/* Breakdown Rows */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3 space-y-1">
                  <div className="text-slate-400 text-[10px] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-blue-400" />
                    ساعات عمل موفرة
                  </div>
                  <div className="text-base font-black text-white">
                    {calculations.hoursSavedMonthly} ساعة/شهر
                  </div>
                </div>

                <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3 space-y-1">
                  <div className="text-slate-400 text-[10px] flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-amber-400" />
                    مبيعات مستردة بالـ AI
                  </div>
                  <div className="text-base font-black text-white">
                    +{calculations.recoveredSalesMonthly.toLocaleString()} ج.م
                  </div>
                </div>
              </div>

              <Link
                to="/auth/register"
                onClick={() => {
                  trackPlatformSiteLead("roi_calculator_cta", {
                    destination: "/auth/register",
                    landing_variant: "enterprise-os",
                    calculated_benefit: calculations.annualBenefit,
                  });
                }}
                className="w-full relative group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 px-6 py-3 text-xs font-black text-white shadow-lg shadow-red-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <span>ابدأ الآن واسترد مبيعاتك الضائعة</span>
                <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
              </Link>

            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
