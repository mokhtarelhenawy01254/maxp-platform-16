import React from "react";
import { ShieldCheck, Truck, CreditCard, Building2, CheckCircle2 } from "lucide-react";

export const ClothingTasteTrustStrip: React.FC = () => {
  return (
    <section className="py-5 border-b border-black/[0.06] bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 sm:gap-6">
          
          {/* Trust Statement */}
          <div className="flex items-center gap-2.5 text-xs text-zinc-700">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold text-zinc-900">منظومة موثقة ومربوطة رسمياً في مصر مع:</span>
          </div>

          {/* Integrated Partners Grid */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-zinc-700">
            
            {/* Bosta */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-50 border border-black/[0.06] hover:border-black/15 transition-colors">
              <Truck className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-zinc-900 font-bold">بوسطة • <span className="font-mono">Bosta API</span></span>
              <span className="text-[10px] text-emerald-700 font-bold">شحن آلي ✓</span>
            </div>

            {/* Kashier */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-50 border border-black/[0.06] hover:border-black/15 transition-colors">
              <CreditCard className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-zinc-900 font-bold">كاشير • <span className="font-mono">Kashier</span></span>
              <span className="text-[10px] text-zinc-500 font-medium">بوابة مرخصة</span>
            </div>

            {/* InstaPay */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-50 border border-black/[0.06] hover:border-black/15 transition-colors">
              <Building2 className="w-3.5 h-3.5 text-purple-600" />
              <span className="text-zinc-900 font-bold"><span className="font-mono">InstaPay</span> وميزة</span>
              <span className="text-[10px] text-emerald-700 font-bold">دفع لحظي</span>
            </div>

            {/* Cash on Delivery */}
            <div className="flex items-center gap-2 text-zinc-700 text-xs font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>تسوية تحصيلات COD في حسابك البنكي</span>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
