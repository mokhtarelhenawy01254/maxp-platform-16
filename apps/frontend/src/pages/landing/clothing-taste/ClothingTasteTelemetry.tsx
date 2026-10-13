import React from "react";

export const ClothingTasteTelemetry: React.FC = () => {
  return (
    <section className="py-7 border-b border-black/[0.06] bg-[#F4F0E8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 items-center">
          
          <div className="flex flex-col text-right">
            <span className="text-2xl font-black text-[#141416] cst-tabular tracking-tight">0 ج.م</span>
            <span className="text-xs text-zinc-600 font-medium">متجر أونلاين مجاني دائم</span>
          </div>

          <div className="flex flex-col text-right">
            <span className="text-2xl font-black text-[#141416] cst-tabular tracking-tight">1 ج.م/أوردر</span>
            <span className="text-xs text-zinc-600 font-medium">ادفع فقط لما تشحن أوردر</span>
          </div>

          <div className="flex flex-col text-right">
            <span className="text-2xl font-black text-emerald-800 cst-tabular tracking-tight">60%</span>
            <span className="text-xs text-zinc-600 font-medium">انخفاض في مرتجعات المقاسات</span>
          </div>

          <div className="flex flex-col text-right">
            <span className="text-2xl font-black text-[#141416] cst-tabular tracking-tight">0% عمولة</span>
            <span className="text-xs text-zinc-600 font-medium">أرباح مبيعاتك كاملة في جيبك</span>
          </div>

          <div className="col-span-2 md:col-span-1 flex flex-col text-right border-t md:border-t-0 md:border-r border-black/10 pt-4 md:pt-0 md:pr-6">
            <span className="text-2xl font-black text-amber-700 cst-tabular tracking-tight">1-Click</span>
            <span className="text-xs text-zinc-600 font-medium">بوالص بوسطة وتأكيد واتساب</span>
          </div>

        </div>
      </div>
    </section>
  );
};
