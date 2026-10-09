import React, { useState } from "react";
import { Plus, Check, ShoppingBag, ArrowLeft, Layers, Sparkles } from "lucide-react";

export const ClothingEditorialShopLook: React.FC = () => {
  const [activeItem, setActiveItem] = useState<number>(0);
  const [isLookAdded, setIsLookAdded] = useState(false);

  const lookItems = [
    {
      id: 1,
      name: "سويت شيرت أوفر سايز قطن مصري ثقيل",
      price: 650,
      color: "أسود فحمي",
      material: "قطن ميلتون مصري 100% مبطن فرو ناعم",
      topPercent: "28%",
      leftPercent: "50%",
    },
    {
      id: 2,
      name: "بنطلون كارغو 6 جيوب بقصة مريحة",
      price: 550,
      color: "بيج رملي",
      material: "جابردين قطن متين مقاوم للتمدد",
      topPercent: "62%",
      leftPercent: "50%",
    },
    {
      id: 3,
      name: "كاب البراند المطرز (Heavy Canvas)",
      price: 200,
      color: "أسود مطفي",
      material: "كانفاس متين مع تطريز بارز عالي الدقة",
      topPercent: "12%",
      leftPercent: "50%",
    },
  ];

  const totalPrice = lookItems.reduce((acc, item) => acc + item.price, 0); // 1,400 EGP

  return (
    <section id="shop-the-look" className="py-20 border-b border-black/[0.06] bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="text-right max-w-2xl mb-12">
          <div className="cse-badge mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>محرك مضاعفة المبيعات التلقائي</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight mb-3">
            ميزة «Shop The Look» — بيع الطقم بالكامل بنقرة واحدة
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 leading-relaxed">
            الزبون الذي يدخل لشراء تيشيرت واحد، تظهر له صورة الموديل بالطقم المنسق كاملاً. نقرة واحدة تضيف التيشيرت مع البنطلون والكاب لترفع متوسط قيمة الأوردر بنسبة 45%.
          </p>
        </div>

        {/* 2-Column Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Visual Canvas with Hotspots (6 cols) */}
          <div className="lg:col-span-6 bg-[#FAF8F5] border border-black/[0.08] rounded-2xl p-6 sm:p-8 relative min-h-[440px] flex flex-col justify-between overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-zinc-800 tracking-wider">
                LOOK #04 • كايرو كوليكشن
              </span>
              <span className="text-xs text-emerald-700 bg-emerald-100/70 font-bold px-2.5 py-0.5 rounded-full">
                تنسيق أوتوماتيكي
              </span>
            </div>

            {/* Stylized Visual Outfit Box */}
            <div className="relative my-auto py-10 flex flex-col items-center justify-center">
              <div className="w-48 sm:w-60 h-72 border border-black/[0.1] rounded-2xl bg-gradient-to-b from-zinc-900 via-zinc-800 to-zinc-700 flex flex-col items-center justify-center shadow-lg relative">
                
                {/* Hotspot 1: Cap */}
                <div
                  onClick={() => setActiveItem(2)}
                  className="absolute top-4 left-1/2 -translate-x-1/2 cursor-pointer z-20"
                >
                  <div className={`cse-hotspot ${activeItem === 2 ? "ring-2 ring-amber-400 scale-125" : ""}`}>
                    3
                  </div>
                </div>

                {/* Hotspot 2: Hoodie */}
                <div
                  onClick={() => setActiveItem(0)}
                  className="absolute top-24 left-1/2 -translate-x-1/2 cursor-pointer z-20"
                >
                  <div className={`cse-hotspot ${activeItem === 0 ? "ring-2 ring-amber-400 scale-125" : ""}`}>
                    1
                  </div>
                </div>

                {/* Hotspot 3: Pants */}
                <div
                  onClick={() => setActiveItem(1)}
                  className="absolute bottom-8 left-1/2 -translate-x-1/2 cursor-pointer z-20"
                >
                  <div className={`cse-hotspot ${activeItem === 1 ? "ring-2 ring-amber-400 scale-125" : ""}`}>
                    2
                  </div>
                </div>

                <div className="text-center text-white/90 p-4">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-amber-300 opacity-90" />
                  <div className="text-xs font-bold">طقم الشارع العصري المتكامل</div>
                  <div className="text-[10px] text-zinc-300 mt-1">انقر على أي نقطة لاكتشاف القطعة</div>
                </div>
              </div>
            </div>

            <div className="text-center text-xs text-zinc-500 pt-2 border-t border-black/[0.06]">
              تم تفعيل ميزة التنسيق لـ 38 براند ملابس نشط على MaxP
            </div>
          </div>

          {/* Detailed Item List & Total Order CTA (6 cols) */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
            
            {/* 3 Items Breakdown */}
            <div className="space-y-3">
              {lookItems.map((item, idx) => {
                const isSelected = activeItem === idx;
                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveItem(idx)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#FAF8F5] border-black shadow-sm"
                        : "bg-white border-black/[0.08] hover:border-black/20"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-black text-white text-[10px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <h4 className="text-sm font-bold text-zinc-950">{item.name}</h4>
                      </div>
                      <span className="text-sm font-extrabold text-black cse-tabular">
                        {item.price} ج.م
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-500 pr-7">
                      <span>الخامة: {item.material}</span>
                      <span className="text-zinc-700 font-medium">{item.color}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Box & One-Click Add */}
            <div className="bg-[#FAF8F5] border border-black/[0.1] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs text-zinc-500">إجمالي الطقم المنسق كاملاً:</div>
                  <div className="text-2xl font-black text-zinc-950 cse-tabular">
                    {totalPrice.toLocaleString("en-US")}{" "}
                    <span className="text-sm font-medium text-zinc-600">ج.م</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-full">
                    توفير وقت الزبون والشحن الموحد
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsLookAdded(true)}
                className="cse-btn-primary w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2"
              >
                {isLookAdded ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>تمت إضافة الطقم كاملاً للسلة بنجاح!</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4 text-amber-300" />
                    <span>أضف الطقم كاملاً إلى سلة الشراء بنقرة واحدة</span>
                  </>
                )}
              </button>

              <div className="text-center text-[11px] text-zinc-500 mt-2.5">
                ربط مباشر مع كاشير المحل وبوسطة — خصم تلقائي من مخزون الفروع.
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
