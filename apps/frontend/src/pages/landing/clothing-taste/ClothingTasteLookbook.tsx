import React, { useState } from "react";
import { ArrowLeft, Check, Sparkles, RefreshCw, Barcode, ShoppingBag } from "lucide-react";

interface ClothingTasteLookbookProps {
  onFreeRegister?: () => void;
}

export const ClothingTasteLookbook: React.FC<ClothingTasteLookbookProps> = ({
  onFreeRegister,
}) => {
  const [selectedColor, setSelectedColor] = useState<"obsidian" | "bone" | "olive">("obsidian");
  const [selectedSize, setSelectedSize] = useState<"M" | "L" | "XL">("L");
  const [inventory, setInventory] = useState({
    maadiBranch: 14,
    onlineStore: 38,
  });
  const [lastSoldAt, setLastSoldAt] = useState<string | null>(null);

  const colors = [
    { id: "obsidian", label: "أسود كربوني (Obsidian)", hex: "#141416" },
    { id: "bone", label: "أبيض عاجي (Bone Cream)", hex: "#FAF8F5" },
    { id: "olive", label: "زيتي داكن (Forest Olive)", hex: "#2E3628" },
  ];

  const handleSimulateBranchSale = () => {
    if (inventory.maadiBranch <= 0) return;
    setInventory((prev) => ({
      ...prev,
      maadiBranch: prev.maadiBranch - 1,
    }));
    setLastSoldAt(
      new Date().toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    );
  };

  return (
    <section className="py-16 border-b border-black/[0.06] bg-[#FAF8F5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="max-w-2xl mb-10 text-right">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-100 border border-zinc-200 text-xs font-mono text-zinc-700 mb-3">
            <span>تجربة حية لتزامن مبيعات البراند</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-[#141416] tracking-tight leading-tight mb-2">
            مصفوفة المقاسات والألوان وتزامن الفروع لحظة بلحظة
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 leading-relaxed">
            جرّب بنفسك: عند بيع قطعة من داخل فرع المحل، تتحدث الأرقام فورياً في المتجر الإلكتروني لمنع البيع المزدوج أو خيبة أمل الزبون.
          </p>
        </div>

        {/* The Atelier Lookbook Card */}
        <div className="cst-panel rounded-2xl p-6 sm:p-8 bg-white border border-black/[0.08] shadow-md">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Visual Lookbook Sample (5 cols) */}
            <div className="lg:col-span-5 rounded-xl overflow-hidden bg-[#FAF8F5] border border-black/[0.06] p-6 flex flex-col justify-between min-h-[340px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-zinc-500">كود المنتج: MP-704-TEE</span>
                <span className="text-xs font-mono text-emerald-800 font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                  متزامن لحظياً ✓
                </span>
              </div>

              {/* Minimalist Graphic Blueprint of the Garment */}
              <div className="my-6 text-center">
                <div
                  className="w-32 h-36 mx-auto rounded-xl border border-black/10 flex flex-col items-center justify-center transition-all duration-300 shadow-sm"
                  style={{
                    backgroundColor: colors.find((c) => c.id === selectedColor)?.hex,
                    color: selectedColor === "bone" ? "#141416" : "#ffffff",
                  }}
                >
                  <ShoppingBag className="w-8 h-8 opacity-40 mb-2" />
                  <span className="text-xs font-mono font-bold">280 GSM</span>
                  <span className="text-[10px] opacity-80">قطن مصري 100%</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-zinc-500 border-t border-black/[0.06] pt-3">
                <span>سعر القطعة الرسمي:</span>
                <span className="text-[#141416] font-black text-sm cst-tabular">550 ج.م</span>
              </div>
            </div>

            {/* Matrix & Interactive Branch Controls (7 cols) */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-6 text-right">
              
              <div>
                <h3 className="text-xl font-black text-[#141416] mb-1">
                  تيشيرت أوفرسايز بوكسي (Heavyweight Boxy Tee)
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                  تشكيلة الموسم الجديد — قماش قطني معالج مع مصفوفة مقاسات دقيقة تدعم تعدد الفروع والمستودعات.
                </p>
              </div>

              {/* Color Swatches */}
              <div>
                <label className="text-xs text-zinc-700 block mb-2 font-medium">
                  اختر اللون: <span className="text-[#141416] font-bold">{colors.find((c) => c.id === selectedColor)?.label}</span>
                </label>
                <div className="flex items-center gap-2.5">
                  {colors.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedColor(c.id as any)}
                      className={`h-9 px-3.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        selectedColor === c.id
                          ? "border-[#141416] bg-zinc-100 text-[#141416] shadow-sm ring-1 ring-[#141416]"
                          : "border-black/[0.08] bg-white text-zinc-600 hover:text-[#141416] hover:bg-zinc-50"
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ backgroundColor: c.hex }} />
                      <span>{c.label.split(" ")[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Size Matrix Selector */}
              <div>
                <label className="text-xs text-zinc-700 block mb-2 font-medium">
                  اختر المقاس:
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
                  <div className="text-zinc-600 mb-1">مخزون فرع المعادي (المحل):</div>
                  <div className="text-xl font-black text-[#141416] cst-tabular">
                    {inventory.maadiBranch} قطعة
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1">كاشير Cloud POS</div>
                </div>

                <div>
                  <div className="text-zinc-600 mb-1">المعروض في المتجر الأونلاين:</div>
                  <div className="text-xl font-black text-blue-700 cst-tabular">
                    {inventory.onlineStore} قطعة
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1">متجر الويب الفاخر</div>
                </div>
              </div>

              {/* Live Action Trigger: Simulate Sale in Store */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSimulateBranchSale}
                  className="cst-btn-secondary text-xs py-2.5 px-4 font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Barcode className="w-4 h-4 text-zinc-700" />
                  <span>محاكاة مسح باركود وبيعه في فرع المعادي</span>
                </button>

                {lastSoldAt && (
                  <span className="text-[11px] font-mono text-emerald-700 font-bold flex items-center gap-1.5 self-center">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                    <span>تم الخصم والمزامنة الساعة {lastSoldAt}</span>
                  </span>
                )}
              </div>

            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
