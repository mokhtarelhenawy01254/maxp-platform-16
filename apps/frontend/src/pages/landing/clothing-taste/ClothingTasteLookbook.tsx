import React, { useState } from "react";
import { ArrowLeft, Check, Sparkles, RefreshCw, Barcode, ShoppingBag, Eye, Printer } from "lucide-react";

interface ClothingTasteLookbookProps {
  onFreeRegister?: () => void;
}

export const ClothingTasteLookbook: React.FC<ClothingTasteLookbookProps> = ({
  onFreeRegister,
}) => {
  const [selectedProduct, setSelectedProduct] = useState<"streetwear" | "coat">("streetwear");
  const [selectedSize, setSelectedSize] = useState<"M" | "L" | "XL">("L");
  const [inventory, setInventory] = useState({
    maadiBranch: 14,
    onlineStore: 38,
  });
  const [lastSoldAt, setLastSoldAt] = useState<string | null>(null);
  const [soldReceiptId, setSoldReceiptId] = useState<number>(9420);

  const products = {
    streetwear: {
      name: "تيشيرت أوفرسايز بوكسي (Heavyweight Boxy Tee)",
      sku: "MP-704-TEE",
      price: 550,
      fabric: "قطن مصري 100% معالج ضد الانكماش (280 GSM)",
      image: "/images/fashion/editorial-streetwear.jpg",
      tagline: "كوليكشن الصيف — قصة مريحة مع جدول قياسات دقيق بالسنتيمتر",
    },
    coat: {
      name: "جاكيت وتوتشت كلاسيك (Tailored Wool Coat)",
      sku: "MP-812-COT",
      price: 1450,
      fabric: "صوف مخلوط فاخر مع بطانة حريرية إيطالية",
      image: "/images/fashion/editorial-coat.jpg",
      tagline: "كوليكشن الشتاء — تفصيل هندسي يدعم تعدد المقاسات في الفروع",
    },
  };

  const current = products[selectedProduct];

  const handleSimulateBranchSale = () => {
    if (inventory.maadiBranch <= 0) return;
    setInventory((prev) => ({
      ...prev,
      maadiBranch: prev.maadiBranch - 1,
    }));
    setSoldReceiptId((prev) => prev + 1);
    setLastSoldAt(
      new Date().toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    );
  };

  return (
    <section className="py-20 border-b border-black/[0.06] bg-[#FAF8F5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="max-w-2xl mb-12 text-right">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-100 border border-zinc-200 text-xs font-mono text-zinc-700 mb-3">
            <Barcode className="w-3.5 h-3.5 text-zinc-700" />
            <span>تجربة بصرية وحية للمنتج وتزامن الفروع</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-[#141416] tracking-tight leading-tight mb-2">
            كيف يرى زبونك ملابسك.. وكيف يضبط الكاشير مخزونك لحظياً؟
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 leading-relaxed">
            معاينة حقيقية لكاتالوج ملابس براندك: جودة عرض فوتوغرافية فاخرة للمشتري، مع محاكاة مباشرة لبيع القطعة في فرع المحل ومزامنتها في المتجر خلال جزء من الثانية.
          </p>
        </div>

        {/* The Live Interactive Atelier Card */}
        <div className="cst-panel rounded-2xl p-6 sm:p-8 bg-white border border-black/[0.08] shadow-md">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Visual Real Garment Photo Sample (5 cols) */}
            <div className="lg:col-span-5 rounded-2xl overflow-hidden bg-[#FAF8F5] border border-black/[0.08] flex flex-col justify-between shadow-xs">
              <div className="p-4 flex items-center justify-between border-b border-black/[0.06] bg-white">
                <span className="text-xs font-mono text-zinc-600 font-bold">كود: {current.sku}</span>
                <span className="text-xs font-mono text-emerald-800 font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                  متزامن لحظياً ✓
                </span>
              </div>

              {/* Real Editorial Model Photo */}
              <div className="relative h-80 sm:h-96 w-full overflow-hidden bg-zinc-100">
                <img
                  src={current.image}
                  alt={current.name}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  loading="lazy"
                />
                
                {/* Floating Specs Pill */}
                <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-md text-white text-xs font-mono flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-amber-300" />
                  <span>{current.fabric.split(" ")[0]} {current.fabric.split(" ")[1]}</span>
                </div>
              </div>

              <div className="p-4 bg-white border-t border-black/[0.06] flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500">سعر القطعة الرسمي:</span>
                <span className="text-[#141416] font-black text-base cst-tabular">{current.price} ج.م</span>
              </div>
            </div>

            {/* Matrix & Interactive Branch Controls (7 cols) */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-6 text-right">
              
              {/* Product Selector Switcher */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedProduct("streetwear")}
                  className={`py-1.5 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                    selectedProduct === "streetwear"
                      ? "bg-[#141416] text-white border-[#141416]"
                      : "bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200"
                  }`}
                >
                  موديل التيشيرت الأوفرسايز
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProduct("coat")}
                  className={`py-1.5 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                    selectedProduct === "coat"
                      ? "bg-[#141416] text-white border-[#141416]"
                      : "bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200"
                  }`}
                >
                  موديل الجاكيت الكلاسيك
                </button>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black text-[#141416] mb-1.5">
                  {current.name}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                  {current.tagline}
                </p>
                <div className="text-xs font-mono text-zinc-500 mt-2 bg-zinc-50 border border-black/[0.06] p-2 rounded-lg inline-block">
                  خامة التصنيع: <strong className="text-zinc-800">{current.fabric}</strong>
                </div>
              </div>

              {/* Size Matrix Selector */}
              <div>
                <label className="text-xs text-zinc-700 block mb-2 font-semibold">
                  المقاس المختار للمعاينة:
                </label>
                <div className="flex items-center gap-2">
                  {(["M", "L", "XL"] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setSelectedSize(sz)}
                      className={`w-12 h-10 rounded-lg text-sm font-bold font-mono transition-all cursor-pointer ${
                        selectedSize === sz
                          ? "bg-[#141416] text-white shadow-md"
                          : "bg-zinc-100 text-zinc-700 border border-zinc-200 hover:bg-zinc-200"
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Inventory Gauges Across Locations */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-[#FAF8F5] border border-black/[0.06] text-xs font-mono">
                <div>
                  <div className="text-zinc-600 mb-1 font-medium">مخزون فرع المعادي (المحل):</div>
                  <div className="text-2xl font-black text-[#141416] cst-tabular">
                    {inventory.maadiBranch} قطعة
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1">كاشير Cloud POS (باركود)</div>
                </div>

                <div>
                  <div className="text-zinc-600 mb-1 font-medium">المعروض في المتجر الأونلاين:</div>
                  <div className="text-2xl font-black text-blue-700 cst-tabular">
                    {inventory.onlineStore} قطعة
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1">متجر الويب الفاخر</div>
                </div>
              </div>

              {/* Live Action Trigger: Simulate Sale in Store */}
              <div className="p-4 rounded-xl bg-zinc-50 border border-black/[0.06] space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleSimulateBranchSale}
                    className="cst-btn-secondary text-xs py-2.5 px-4 font-bold flex items-center justify-center gap-2 cursor-pointer bg-white"
                  >
                    <Barcode className="w-4 h-4 text-zinc-800" />
                    <span>محاكاة مسح باركود وبيعه في فرع المعادي</span>
                  </button>

                  {lastSoldAt && (
                    <span className="text-[11px] font-mono text-emerald-800 font-bold flex items-center gap-1.5 self-center">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                      <span>تم الخصم والمزامنة الساعة {lastSoldAt}</span>
                    </span>
                  )}
                </div>

                {/* Simulated Thermal Print Line */}
                {lastSoldAt && (
                  <div className="text-[11px] font-mono text-zinc-600 bg-white p-2.5 rounded-lg border border-black/[0.06] flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Printer className="w-3.5 h-3.5 text-zinc-500" />
                      <span>إيصال كاشير #{soldReceiptId} • طابعة حرارية 80mm</span>
                    </span>
                    <span className="text-emerald-700 font-bold">خصم متزامن: -1 قطعة</span>
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
