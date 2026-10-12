import React from "react";
import { X, Check, AlertTriangle, Sparkles, SlidersHorizontal, ArrowLeft } from "lucide-react";
import { AUDIT_COMPARISON_MATRIX } from "./clothingTasteData";
import { TasteMode } from "./types";

interface ClothingTasteAuditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mode: TasteMode;
  onToggleMode: (mode: TasteMode) => void;
}

export const ClothingTasteAuditDrawer: React.FC<ClothingTasteAuditDrawerProps> = ({
  isOpen,
  onClose,
  mode,
  onToggleMode,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#0c0e14] border border-white/15 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-right">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#111318]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="إغلاق نافذة المقارنة"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-400" />
                <span>تشريح الفرق الهندسي: استخدام Taste-Skill مقابل القوالب النمطية</span>
              </h3>
              <p className="text-xs text-zinc-400">
                مقارنة دقيقة توضح كيف تحول المنصة من مجرد «كلام تسويقي مكرر» إلى شاشات إنتاجية احترافية
              </p>
            </div>
          </div>

          {/* Quick Mode Toggle inside Modal */}
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/10">
            <button
              type="button"
              onClick={() => onToggleMode("taste")}
              className={`py-1 px-3 rounded text-xs font-bold transition-all ${
                mode === "taste"
                  ? "bg-white text-black shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              ✨ وضع المهارة
            </button>
            <button
              type="button"
              onClick={() => onToggleMode("slop")}
              className={`py-1 px-3 rounded text-xs font-bold transition-all ${
                mode === "slop"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              🤖 القالب النمطي
            </button>
          </div>
        </div>

        {/* Scrollable Audit Matrix Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 leading-relaxed">
            <strong>قاعدة Taste-Skill الأساسية:</strong> «التصميم الجيد لا يبدو مولداً بواسطة الذكاء الاصطناعي». يتم استبدال الانطباعات العشوائية (تدرجات النيون البنفسجية، و3 بطاقات متطابقة، وكلمات الحشو) ببيانات تشغيلية دقيقة (P95 &lt; 0.65s، و60% خفض مرتجعات)، وواجهة متماسكة ذات سطح واحد.
          </div>

          <div className="space-y-3">
            {AUDIT_COMPARISON_MATRIX.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-[#111318] border border-white/10 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                    {item.ruleCode} • {item.pillar}
                  </span>
                  <span className="text-sm font-bold text-white">{item.pillarTitle}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed">
                  
                  {/* Without Skill (AI Slop) */}
                  <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20 text-red-200">
                    <div className="flex items-center gap-1.5 font-bold text-red-400 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>بدون المهارة (نمط الـ AI Slop الشائع):</span>
                    </div>
                    <p className="text-zinc-300">{item.slopSymptom}</p>
                  </div>

                  {/* With Skill (Taste-Skill) */}
                  <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-emerald-200">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-400 mb-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>باستخدام Taste-Skill (التنفيذ المتقن):</span>
                    </div>
                    <p className="text-zinc-300">{item.tasteExecution}</p>
                  </div>

                </div>

                <div className="text-[11px] text-zinc-400 font-mono border-t border-white/5 pt-2">
                  <span className="text-zinc-300 font-semibold">الأثر التجاري على التاجر: </span>
                  <span>{item.whyItMatters}</span>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between bg-[#111318]">
          <span className="text-xs text-zinc-400 font-mono">
            جميع معايير Taste-Skill مطبقة بنسبة 100% في هذه الصفحة.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="cst-btn-primary text-xs py-2 px-5 font-bold"
          >
            إغلاق ومتابعة الصفحة
          </button>
        </div>

      </div>
    </div>
  );
};
