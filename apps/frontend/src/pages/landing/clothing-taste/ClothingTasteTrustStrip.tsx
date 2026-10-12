import React from "react";
import { ShieldCheck, Truck, CreditCard, Building2, CheckCircle2 } from "lucide-react";

export const ClothingTasteTrustStrip: React.FC = () => {
  return (
    <section className="py-6 border-b border-white/[0.08] bg-[#07080c]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          
          {/* Trust Statement */}
          <div className="flex items-center gap-2.5 text-xs text-zinc-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold text-white">منظومة موثقة ومربوطة رسمياً في مصر مع:</span>
          </div>

          {/* Integrated Partners Grid */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-xs text-zinc-400">
            
            {/* Bosta */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
              <Truck className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-white font-bold">بوسطة • <span className="font-mono">Bosta API</span></span>
              <span className="text-[10px] text-emerald-400">شحن آلي ✓</span>
            </div>

            {/* Kashier */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
              <CreditCard className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-white font-bold">كاشير • <span className="font-mono">Kashier</span></span>
              <span className="text-[10px] text-zinc-400">بوابة مرخصة</span>
            </div>

            {/* InstaPay */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
              <Building2 className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-white font-bold"><span className="font-mono">InstaPay</span> وميزة</span>
              <span className="text-[10px] text-emerald-400">دفع لحظي</span>
            </div>

            {/* Cash on Delivery */}
            <div className="flex items-center gap-2 text-zinc-300 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>تسوية تحصيلات COD في حسابك البنكي</span>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
