import React, { useState, useMemo } from "react";
import { Calculator, DollarSign, TrendingUp, Users, Award, Percent } from "lucide-react";
import { ProposalFunnelConfig } from "../types";

interface ProposalFunnelCalculatorProps {
  config: ProposalFunnelConfig;
  currency: string;
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
    const enrollRate = config?.enrollmentRate || 0.40;
    const coursePrice = config?.averageCoursePrice || 2200;
    const ltvMonths = config?.studentLtvMonths || 4;

    const clicks = Math.round(budget / cpc);
    const leads = Math.round(clicks * leadRate);
    const attendees = Math.round(leads * showRate);
    const enrolled = Math.round(attendees * enrollRate);

    const cpl = leads > 0 ? Math.round(budget / leads) : 0;
    const cac = enrolled > 0 ? Math.round(budget / enrolled) : 0;

    const initialRevenue = enrolled * coursePrice;
    const ltvRevenue = Math.round(enrolled * coursePrice * ltvMonths * 0.85); // accounting for natural drop-off
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

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Calculator className="size-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-black">حاسبة العائد والنمو التفاعلية (ROI & Funnel Simulator)</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            حرك مؤشر الميزانية الإعلانية لمعاينة تدفق أولياء الأمور والطلاب المتوقعين وعائد الاستثمار
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-7 space-y-6 shadow-xs">
        {/* Slider Controls */}
        <div className="space-y-3 bg-muted/30 p-4 sm:p-5 rounded-xl border border-border/50">
          <div className="flex items-center justify-between">
            <label className="text-xs sm:text-sm font-bold flex items-center gap-2">
              <DollarSign className="size-4 text-primary" />
              <span>الميزانية الإعلانية الشهرية المقترحة:</span>
            </label>
            <div className="text-base sm:text-xl font-black text-primary font-mono tabular-nums">
              {budget.toLocaleString()} {currency}
            </div>
          </div>

          <input
            type="range"
            min={config.minBudget || 5000}
            max={config.maxBudget || 60000}
            step={config.stepBudget || 2500}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full h-2.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />

          <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
            <span>{(config.minBudget || 5000).toLocaleString()} {currency}</span>
            <span className="text-primary font-bold">يمكنك تجربة ميزانيات مختلفة</span>
            <span>{(config.maxBudget || 60000).toLocaleString()} {currency}</span>
          </div>
        </div>

        {/* Funnel Visual Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Users className="size-3.5 text-primary" />
              <span>طلبات تقييم (Leads)</span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-foreground">
              {stats.leads} <span className="text-xs font-normal text-muted-foreground">ولي أمر</span>
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">
              تكلفة الليد: ~{stats.cpl} {currency}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Award className="size-3.5 text-amber-500" />
              <span>حضور الورش بالمقر</span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-amber-600 dark:text-amber-400">
              {stats.attendees} <span className="text-xs font-normal text-muted-foreground">طفل وولي أمر</span>
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">
              بنسبة حضور {Math.round((config.showUpRate || 0.65) * 100)}%
            </div>
          </div>

          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 font-bold">
              <Award className="size-3.5" />
              <span>الاشتراكات المؤكدة</span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {stats.enrolled} <span className="text-xs font-normal text-muted-foreground">طالب جديد</span>
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">
              تكلفة الطالب (CAC): ~{stats.cac} {currency}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-primary font-bold">
              <TrendingUp className="size-3.5" />
              <span>إيراد الشهر الأول المباشر</span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono tabular-nums text-primary">
              {stats.initialRevenue.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{currency}</span>
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">
              عائد مباشر: {stats.roas}x ضعف الصرف
            </div>
          </div>
        </div>

        {/* LTV & Long-Term Compounding Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-l from-primary/10 via-background to-secondary/30 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary">القيمة التراكمية عبر المستويات (Customer Lifetime Value - LTV):</span>
              <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-md font-mono font-bold">
                {config.studentLtvMonths || 4} مستويات
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              بقاء الطالب في كود تريبس وتدرجه في المستويات يولد إجمالي إيرادات تقديرية تصل إلى:
            </p>
          </div>
          <div className="text-left sm:text-right shrink-0">
            <div className="text-2xl font-black text-foreground font-mono tabular-nums">
              {stats.ltvRevenue.toLocaleString()} {currency}
            </div>
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              عائد تراكمي يصل إلى {stats.ltvRoas}x
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
