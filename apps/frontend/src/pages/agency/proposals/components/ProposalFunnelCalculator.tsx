import React, { useState, useMemo } from "react";
import { Calculator, ArrowLeft, TrendingUp, Sparkles } from "lucide-react";
import { ProposalFunnelConfig } from "../types";
import { Band, SectionTitle, Lead, Marker, money } from "./ProposalUi";

interface ProposalFunnelCalculatorProps {
  config: ProposalFunnelConfig;
  currency?: string;
}

export const ProposalFunnelCalculator: React.FC<ProposalFunnelCalculatorProps> = ({
  config,
  currency = "ج.م",
}) => {
  const [budget, setBudget] = useState(config?.defaultBudget || 15000);

  const stats = useMemo(() => {
    const cpc = config?.costPerClick || 3.5;
    const leadRate = config?.leadConversionRate || 0.12;
    const showRate = config?.showUpRate || 0.65;
    const enrollRate = config?.enrollmentRate || 0.4;
    const coursePrice = config?.averageCoursePrice || 2200;
    const ltvMonths = config?.studentLtvMonths || 4;

    const clicks = Math.round(budget / cpc);
    const leads = Math.round(clicks * leadRate);
    const attendees = Math.round(leads * showRate);
    const enrolled = Math.round(attendees * enrollRate);

    const cpl = leads > 0 ? Math.round(budget / leads) : 0;
    const cac = enrolled > 0 ? Math.round(budget / enrolled) : 0;

    const initialRevenue = enrolled * coursePrice;
    const ltvRevenue = Math.round(enrolled * coursePrice * ltvMonths * 0.85);
    const roas = budget > 0 ? (initialRevenue / budget).toFixed(2) : "0";
    const ltvRoas = budget > 0 ? (ltvRevenue / budget).toFixed(2) : "0";

    return {
      clicks,
      leads,
      attendees,
      enrolled,
      cpl,
      cac,
      initialRevenue,
      ltvRevenue,
      roas,
      ltvRoas,
    };
  }, [budget, config]);

  const minB = config.minBudget || 5000;
  const maxB = config.maxBudget || 60000;
  const stepB = config.stepBudget || 2500;

  return (
    <Band tone="graphite" id="calculator">
      <div className="space-y-4 max-w-3xl pb-8 border-b border-white/10">
        <Marker>محاكاة العائد المالي وتدفق الطلاب</Marker>
        <SectionTitle>
          كم طالب وإيراد متوقع من كل جنيه يُنفق في الإعلانات؟
        </SectionTitle>
        <Lead>
          نموذج حسابي تفاعلي مبني على أرقام واقعية لقطاع تعليم البرمجة للأطفال في الإسكندرية، مع حساب تكلفة
          الاستقطاب وعائد الاستثمار الفوري والتراكمي.
        </Lead>
      </div>

      {/* Slider Control Bar — Clean Line, No Nested Box */}
      <div className="py-8 space-y-4 border-b border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-sm font-bold text-white/90">
            حدد الميزانية الشهرية المقترحة للحملات:
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl sm:text-4xl font-black text-[#FFD368] tabular-nums">
              {budget.toLocaleString("en-US")}
            </span>
            <span className="text-xs text-[#FFD368]/80 font-bold">{currency} / شهر</span>
          </div>
        </div>

        <input
          type="range"
          min={minB}
          max={maxB}
          step={stepB}
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
          aria-label="الميزانية الإعلانية الشهرية المقترحة"
          className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#FFD368]"
        />

        <div className="flex justify-between text-xs font-mono text-white/40">
          <span>{minB.toLocaleString()} {currency}</span>
          <span className="text-white/60 font-sans">اسحب المؤشر لليمين أو اليسار</span>
          <span>{maxB.toLocaleString()} {currency}</span>
        </div>
      </div>

      {/* 4-Stage Funnel Progression — Flat Grid */}
      <div className="py-8 grid grid-cols-2 lg:grid-cols-4 gap-6 border-b border-white/10">
        <div className="space-y-1">
          <div className="text-xs font-mono text-[#FFD368] font-bold">المرحلة 01</div>
          <div className="text-xs text-white/60 font-medium">زيارات مستهدفة للإعلانات</div>
          <div className="font-mono text-2xl sm:text-3xl font-black text-white tabular-nums pt-1">
            {stats.clicks.toLocaleString("en-US")}
          </div>
          <div className="text-[11px] text-white/40 font-mono">متوسط النقرة 3.5 ج.م</div>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-mono text-[#FFD368] font-bold">المرحلة 02</div>
          <div className="text-xs text-white/60 font-medium">أولياء أمور سجلوا اهتمامهم</div>
          <div className="font-mono text-2xl sm:text-3xl font-black text-white tabular-nums pt-1">
            {stats.leads.toLocaleString("en-US")}
          </div>
          <div className="text-[11px] text-[#FFD368]/90 font-mono">تكلفة التسجيل: {stats.cpl} ج.م</div>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-mono text-[#FFD368] font-bold">المرحلة 03</div>
          <div className="text-xs text-white/60 font-medium">حضور جلسة التقييم بالفرع</div>
          <div className="font-mono text-2xl sm:text-3xl font-black text-white tabular-nums pt-1">
            {stats.attendees.toLocaleString("en-US")}
          </div>
          <div className="text-[11px] text-emerald-400 font-mono">نسبة حضور 65% مع تذكير واتساب</div>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-mono text-[#FFD368] font-bold">المرحلة 04</div>
          <div className="text-xs text-white/60 font-medium">طلاب مسجلين ومسددين</div>
          <div className="font-mono text-2xl sm:text-3xl font-black text-[#FFD368] tabular-nums pt-1">
            {stats.enrolled.toLocaleString("en-US")}
          </div>
          <div className="text-[11px] text-white/40 font-mono">تكلفة الاستحواذ: {stats.cac} ج.م</div>
        </div>
      </div>

      {/* Financial Bottomline Results */}
      <div className="pt-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="space-y-1 border-r-2 border-white/10 pr-4">
          <div className="text-xs text-white/50 font-bold uppercase">إيراد الشهر الأول المباشر</div>
          <div className="font-mono text-2xl sm:text-3xl font-black text-white tabular-nums">
            {stats.initialRevenue.toLocaleString("en-US")} <span className="text-xs font-sans text-white/60">{currency}</span>
          </div>
          <div className="text-xs text-emerald-400 font-medium font-mono">
            عائد إعلاني مباشر: {stats.roas}x ROAS
          </div>
        </div>

        <div className="space-y-1 border-r-2 border-[#FFD368]/40 pr-4">
          <div className="text-xs text-[#FFD368] font-bold uppercase">القيمة التراكمية للطلاب (LTV 4 أشهر)</div>
          <div className="font-mono text-2xl sm:text-3xl font-black text-[#FFD368] tabular-nums">
            {stats.ltvRevenue.toLocaleString("en-US")} <span className="text-xs font-sans text-[#FFD368]/70">{currency}</span>
          </div>
          <div className="text-xs text-[#FFD368]/80 font-medium font-mono">
            عائد تراكمي متوقع: {stats.ltvRoas}x LTV/CAC
          </div>
        </div>

        <div className="text-xs text-white/60 leading-relaxed font-normal bg-white/[0.02] p-4 rounded-lg border border-white/10">
          💡 <strong className="text-white">قوة المنظومة:</strong> اشتراك ولي الأمر في الدورة الأولى يفتح باب استمراره لعدة مراحل،
          ما يجعل تكلفة الاستحواذ تُسدد بالكامل من الأسبوع الثاني للتشغيل.
        </div>
      </div>
    </Band>
  );
};
