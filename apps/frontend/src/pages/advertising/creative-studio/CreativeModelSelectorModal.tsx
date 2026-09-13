import React from "react";
import { X, Check, Zap, Cpu, Layers, ShieldCheck } from "lucide-react";
import { ALLOWED_IMAGE_MODELS } from "./types";

interface CreativeModelSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
}

export const CreativeModelSelectorModal: React.FC<CreativeModelSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedModel,
  onSelectModel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                معرض نماذج التوليد الإعلاني (AI Models Hub 2026)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                اختر محرك الذكاء الاصطناعي الأنسب لحملتك بحسب متطلبات الواقعية والسرعة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Model Cards Grid */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {ALLOWED_IMAGE_MODELS.map((model) => {
            const isSelected = selectedModel === model.id;
            return (
              <div
                key={model.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  onSelectModel(model.id);
                  onClose();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectModel(model.id);
                    onClose();
                  }
                }}
                className={`group relative p-4 rounded-xl border text-right transition cursor-pointer flex flex-col gap-2 ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 ring-1 ring-indigo-600"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isSelected ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950 px-2.5 py-0.5 rounded-full">
                        <Check className="w-3.5 h-3.5" />
                        النموذج النشط حالياً
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition">
                        انقر للتبديل لهذا النموذج
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {model.badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        {model.badge}
                      </span>
                    )}
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {model.nameAr}
                    </h3>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {model.description}
                </p>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-3 text-slate-500">
                    {model.latencyP95 && (
                      <span className="flex items-center gap-1 font-mono">
                        <Zap className="w-3 h-3 text-amber-500" />
                        الاستجابة: {model.latencyP95}
                      </span>
                    )}
                    {model.resolution && (
                      <span className="flex items-center gap-1 font-mono">
                        <Layers className="w-3 h-3 text-blue-500" />
                        دقة التوليد: {model.resolution}
                      </span>
                    )}
                  </div>

                  <span className="font-mono text-xs text-slate-400">
                    {model.id}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            جميع النماذج متوافقة وتدعم معايير التجارة الإلكترونية والتصدير بدقة 2K
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
