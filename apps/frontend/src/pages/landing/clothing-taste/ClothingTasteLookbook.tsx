import React, { useState } from "react";
import { ArrowLeft, Check, Sparkles, RefreshCw, Barcode, ShoppingBag } from "lucide-react";
import { TasteMode } from "./types";

interface ClothingTasteLookbookProps {
  onFreeRegister: () => void;
  mode: TasteMode;
}

export const ClothingTasteLookbook: React.FC<ClothingTasteLookbookProps> = ({
  onFreeRegister,
  mode,
}) => {
  const [selectedColor, setSelectedColor] = useState<"obsidian" | "bone" | "olive">("obsidian");
  const [selectedSize, setSelectedSize] = useState<"M" | "L" | "XL">("L");
  const [inventory, setInventory] = useState({
    maadiBranch: 14,
    onlineStore: 38,
  });
  const [lastSoldAt, setLastSoldAt] = useState<string | null>(null);

  const colors = [
    { id: "obsidian", label: "أسود كربوني (Obsidian)", hex: "#121316" },
    { id: "bone", label: "أبيض عاجي (Bone Cream)", hex: "#F5F3EF" },
    { id: "olive", label: "زيتي داكن (Forest Olive)", hex: "#2E3628" },
  ];

  const handleSimulateBranchSale = () => {
    if (inventory.maadiBranch <= 0) return;
    setInventory((prev) => ({
      ...prev,
      maadiBranch: prev.maadiBranch - 1,
    }));
    setLastSoldAt(new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  };

  if (mode === "slop") {
    // ── Slop Mode: The Cartoon 3D Memoji + Rainbow Glowing Border Cliché ──
    return (
      <section className="py-16 border-b border-purple-500/20 bg-[#100926] text-center">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-xs text-purple-400 font-bold mb-2">
            ✨ كوليكشن المستقبل الخارق ثلاثي الأبعاد ✨
          </div>
          <h2 className="text-3xl font-black text-white mb-6">
            موديلات تفوق الخيال بلمسة سحرية روبوتية 🤖
          </h2>
          <div className="p-8 rounded-3xl bg-purple-950/40 border-2 border-dashed border-purple-400/50 shadow-[0_0_40px_rgba(168,85,247,0.3)] max-w-md mx-auto">
            <div className="text-6xl mb-4 animate-bounce">🕶️👕</div>
            <div className="inline-block px-4 py-1 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold mb-3">
              🔥 خصم 95% ينتهي بعد قليل! 🔥
            </div>
            <p className="text-sm text-purple-200/80 mb-6">
              ملابس ذكية مزودة بخاصية التفكير التلقائي تجعل كل من يراك ينبهر فوراً بذكائك الفائق!
            </p>
            <button
              onClick={onFreeRegister}
              className="cst-btn-primary py-3 px-8 text-sm font-black w-full"
            >
              🚀 امتلك الكوليكشن الخارق الآن 🚀
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ── Taste Mode: Architectural Interactive Lookbook Matrix ──
  return (
    <section className="py-16 border-b border-white/[0.08] bg-[#090A0F]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        <div className="max-w-2xl mb-10 text-right">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-mono text-zinc-300 mb-3">
            <span>تجربة حية لتزامن مبيعات البراند</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight mb-2">
            مصفوفة المقاسات والألوان وتزامن الفروع لحظة بلحظة
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            جرّب بنفسك: عند بيع قطعة من داخل فرع المحل، تتحدث الأرقام فورياً في المتجر الإلكتروني لمنع البيع المزدوج أو خيبة أمل الزبون.
          </p>
        </div>

        {/* The Atelier Lookbook Card */}
        <div className="cst-panel rounded-2xl p-6 sm:p-8 bg-[#111318] border border-white/10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Visual Lookbook Sample (5 cols) */}
            <div className="lg:col-span-5 rounded-xl overflow-hidden bg-black/60 border border-white/10 p-6 flex flex-col justify-between min-h-[340px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-zinc-400">كود المنتج: MP-704-TEE</span>
                <span className="text-xs font-mono text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10">
                  متزامن لحظياً ✓
                </span>
              </div>

              {/* Minimalist Graphic Blueprint of the Garment */}
              <div className="my-6 text-center">
                <div
                  className="w-32 h-36 mx-auto rounded-xl border border-white/20 flex flex-col items-center justify-center transition-all duration-300 shadow-inner"
                  style={{
                    backgroundColor: colors.find((c) => c.id === selectedColor)?.hex,
                    color: selectedColor === "bone" ? "#111" : "#fff",
                  }}
                >
                  <ShoppingBag className="w-8 h-8 opacity-40 mb-2" />
                  <span className="text-xs font-mono font-bold">280 GSM</span>
                  <span className="text-[10px] opacity-75">قطن مصري 100%</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-zinc-400 border-t border-white/10 pt-3">
                <span>سعر القطعة الرسمي:</span>
                <span className="text-white font-bold text-sm cst-tabular">550 ج.م</span>
              </div>
            </div>

            {/* Matrix & Interactive Branch Controls (7 cols) */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
              
              <div>
                <h3 className="text-xl font-bold text-white mb-1">
                  تيشيرت أوفرسايز بوكسي (Heavyweight Boxy Tee)
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  تشكيلة الموسم الجديد — قماش قطني معالج مع مصفوفة مقاسات دقيقة تدعم تعدد الفروع والمستودعات.
                </p>
              </div>

              {/* Color Swatches */}
              <div>
                <label className="text-xs text-zinc-400 block mb-2 font-medium">
                  اختر اللون: <span className="text-white font-semibold">{colors.find((c) => c.id === selectedColor)?.label}</span>
                </label>
                <div className="flex items-center gap-2.5">
                  {colors.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedColor(c.id as any)}
                      className={`h-8 px-3 rounded-lg border text-xs font-bold transition-all flex items-center gap-2 ${
                        selectedColor === c.id
                          ? "border-blue-500 bg-white/10 text-white shadow-sm"
                          : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full border border-black/30" style={{ backgroundColor: c.hex }} />
                      <span>{c.label.split(" ")[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Size Matrix Selector */}
              <div>
                <label className="text-xs text-zinc-400 block mb-2 font-medium">
                  اختر المقاس:
                </label>
                <div className="flex items-center gap-2">
                  {(["M", "L", "XL"] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setSelectedSize(sz)}
                      className={`w-12 h-10 rounded-lg text-sm font-bold font-mono transition-all ${
                        selectedSize === sz
                          ? "bg-white text-black shadow-md"
                          : "bg-white/5 text-zinc-400 border border-white/10 hover:text-white"
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Inventory Gauges Across Locations */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-black/40 border border-white/10 text-xs font-mono">
                <div>
                  <div className="text-zinc-400 mb-1">مخزون فرع المعادي (المحل):</div>
                  <div className="text-xl font-bold text-white cst-tabular">
                    {inventory.maadiBranch} قطعة
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1">كاشير Cloud POS</div>
                </div>

                <div>
                  <div className="text-zinc-400 mb-1">المعروض في المتجر الأونلاين:</div>
                  <div className="text-xl font-bold text-blue-400 cst-tabular">
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
                  className="cst-btn-secondary text-xs py-2.5 px-4 font-bold flex items-center justify-center gap-2"
                >
                  <Barcode className="w-4 h-4 text-zinc-400" />
                  <span>محاكاة مسح باركود وبيعه في فرع المعادي</span>
                </button>

                {lastSoldAt && (
                  <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 self-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
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
