import React from "react";
import { ShieldCheck, Gauge, Zap, TrendingDown, ArrowDownRight } from "lucide-react";
import { TasteMode } from "./types";

interface ClothingTasteTelemetryProps {
  mode: TasteMode;
}

export const ClothingTasteTelemetry: React.FC<ClothingTasteTelemetryProps> = ({ mode }) => {
  if (mode === "slop") {
    // In slop mode, show cookie-cutter clone cards
    return (
      <section className="py-8 border-b border-purple-500/20 bg-purple-950/20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="text-xs text-purple-300 font-semibold mb-4">
            🔥 موثوق من أكثر من 50,000 علامة تجارية في المجرة 🔥
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {["100% نجاح خارق", "10X نمو لا نهائي", "0 ثانية انتظار", "1000% رضا"].map((txt, i) => (
              <div key={i} className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-200 font-bold">
                {txt}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 border-b border-white/[0.08] bg-[#0c0e14]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 items-center">
          
          <div className="flex flex-col text-right">
            <span className="text-2xl font-black text-white cst-tabular tracking-tight">0 ج.م</span>
            <span className="text-xs text-zinc-400 font-medium">متجر أونلاين مجاني دائم</span>
          </div>

          <div className="flex flex-col text-right">
            <span className="text-2xl font-black text-white cst-tabular tracking-tight">1 ج.م/أوردر</span>
            <span className="text-xs text-zinc-400 font-medium">تدفع فقط لما تشحن أوردر</span>
          </div>

          <div className="flex flex-col text-right">
            <span className="text-2xl font-black text-emerald-400 cst-tabular tracking-tight">60%</span>
            <span className="text-xs text-zinc-400 font-medium">انخفاض في مرتجعات المقاسات</span>
          </div>

          <div className="flex flex-col text-right">
            <span className="text-2xl font-black text-blue-400 cst-tabular tracking-tight">P95 &lt; 0.65s</span>
            <span className="text-xs text-zinc-400 font-medium">سرعة تصفح وشراء فورية</span>
          </div>

          <div className="col-span-2 md:col-span-1 flex flex-col text-right border-t md:border-t-0 md:border-r border-white/10 pt-4 md:pt-0 md:pr-6">
            <span className="text-2xl font-black text-amber-400 cst-tabular tracking-tight">1-Click</span>
            <span className="text-xs text-zinc-400 font-medium">بوالص بوسطة وتأكيد واتساب</span>
          </div>

        </div>
      </div>
    </section>
  );
};
