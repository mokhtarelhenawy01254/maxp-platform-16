import React from "react";
import { PLATFORM_TELEMETRY } from "./clothingTasteData";

export const ClothingTasteTelemetry: React.FC = () => {
  return (
    <section className="py-7 border-b border-black/[0.06] bg-[#F4F0E8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 items-center">
          
          <div className="flex flex-col text-right">
            <span className="text-2xl font-black text-[#141416] cst-tabular tracking-tight">
              {PLATFORM_TELEMETRY.activeStores} متجر
            </span>
            <span className="text-xs text-zinc-600 font-medium">نشط يدير مبيعاته على MaxP</span>
          </div>

          <div className="flex flex-col text-right">
            <span className="text-2xl font-black text-[#141416] cst-tabular tracking-tight">
              {PLATFORM_TELEMETRY.monthlyOrders} أوردر
            </span>
            <span className="text-xs text-zinc-600 font-medium">تمت معالجته وشحنه في آخر 30 يوم</span>
          </div>

          <div className="flex flex-col text-right">
            <span className="text-2xl font-black text-emerald-800 cst-tabular tracking-tight">
              17 أداة
            </span>
            <span className="text-xs text-zinc-600 font-medium">في باقة واحدة بـ 999 ج.م/شهر</span>
          </div>

          <div className="flex flex-col text-right">
            <span className="text-2xl font-black text-emerald-800 cst-tabular tracking-tight">
              1,937 ج.م
            </span>
            <span className="text-xs text-zinc-600 font-medium">وفر شهري (قيمة منفردة 2,936 ج.م)</span>
          </div>

          <div className="col-span-2 md:col-span-1 flex flex-col text-right border-t md:border-t-0 md:border-r border-black/10 pt-4 md:pt-0 md:pr-6">
            <span className="text-2xl font-black text-[#141416] cst-tabular tracking-tight">
              0% عمولة
            </span>
            <span className="text-xs text-zinc-600 font-medium">أرباح مبيعاتك بالكامل في جيبك</span>
          </div>

        </div>
      </div>
    </section>
  );
};
