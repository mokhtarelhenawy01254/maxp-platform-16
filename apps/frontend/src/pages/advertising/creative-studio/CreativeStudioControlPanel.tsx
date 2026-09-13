import React, { useState } from "react";
import {
  Wand2,
  Sparkles,
  Layers,
  Ratio,
  Type,
  Tag,
  Palette,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
  Sliders,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CREATIVE_STUDIO_PRESETS } from "./CreativeStudioPresets";
import { ALLOWED_IMAGE_MODELS } from "./types";
import type {
  AspectRatioType,
  CreativePreset,
  CanvasOverlaySettings,
  MarketingProduct,
} from "./types";

interface CreativeStudioControlPanelProps {
  selectedProduct: MarketingProduct | null;
  selectedPresetId: string;
  onSelectPreset: (preset: CreativePreset) => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  aspectRatio: AspectRatioType;
  onChangeAspectRatio: (ratio: AspectRatioType) => void;
  overlay: CanvasOverlaySettings;
  onUpdateOverlay: (updates: Partial<CanvasOverlaySettings>) => void;
  customPrompt: string;
  onChangeCustomPrompt: (prompt: string) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  dailyUsage?: number;
  dailyLimit?: number;
}

export const CreativeStudioControlPanel: React.FC<CreativeStudioControlPanelProps> = ({
  selectedProduct,
  selectedPresetId,
  onSelectPreset,
  selectedModel,
  onSelectModel,
  aspectRatio,
  onChangeAspectRatio,
  overlay,
  onUpdateOverlay,
  customPrompt,
  onChangeCustomPrompt,
  isGenerating,
  onGenerate,
  dailyUsage = 0,
  dailyLimit = 50,
}) => {
  const [activeTab, setActiveTab] = useState<"PRESETS" | "TYPOGRAPHY" | "ADVANCED">("PRESETS");
  const [showPromptInput, setShowPromptInput] = useState(false);

  return (
    <div className="h-full flex flex-col bg-slate-50/50 dark:bg-slate-950/40 border-l border-slate-200/80 dark:border-slate-800 overflow-hidden select-none">
      {/* Top Action Bar: Generate CTA + Quota */}
      <div className="p-3 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating || !selectedProduct}
            className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs active:scale-[0.97] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Wand2 className="w-3.5 h-3.5 text-indigo-200" />
            )}
            <span>{isGenerating ? "جاري التوليد..." : "توليد المشهد بالذكاء الاصطناعي"}</span>
          </Button>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
          <span>الرصيد:</span>
          <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">
            {dailyUsage}/{dailyLimit}
          </span>
        </div>
      </div>

      {/* Sub-Tabs: Presets vs Typography vs Advanced */}
      <div className="flex border-b border-slate-200/80 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/40 px-3 pt-1.5 gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("PRESETS")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-t-lg transition cursor-pointer border-b-2 ${
            activeTab === "PRESETS"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>بيئات الاستوديو</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("TYPOGRAPHY")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-t-lg transition cursor-pointer border-b-2 ${
            activeTab === "TYPOGRAPHY"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>النصوص والعروض</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ADVANCED")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-t-lg transition cursor-pointer border-b-2 ${
            activeTab === "ADVANCED"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>المقاس والبرومبت</span>
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Tab 1: Studio Environment Presets */}
        {activeTab === "PRESETS" && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CREATIVE_STUDIO_PRESETS.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onSelectPreset(preset)}
                    className={`relative text-right p-3 rounded-xl border transition-all text-xs cursor-pointer flex flex-col justify-between h-28 overflow-hidden group ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 ring-1 ring-indigo-500 shadow-xs"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50"
                    }`}
                  >
                    {/* Background Subtle Gradient Simulation */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${preset.previewGradient} opacity-15 pointer-events-none group-hover:opacity-25 transition-opacity`}
                    />

                    <div className="relative z-10 flex items-start justify-between gap-1.5">
                      <div>
                        <h3 className="font-black text-slate-900 dark:text-white leading-tight">
                          {preset.labelAr}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-sans">{preset.labelEn}</p>
                      </div>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-indigo-300 animate-pulse" />
                      )}
                    </div>

                    <p className="relative z-10 text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {preset.descriptionAr}
                    </p>

                    <div className="relative z-10 flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span>{preset.lightingStyle}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Typography & Badge Controls */}
        {activeTab === "TYPOGRAPHY" && (
          <div className="space-y-3 bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                العنوان الرئيسي للإعلان
              </Label>
              <Input
                value={overlay.headline}
                onChange={(e) => onUpdateOverlay({ headline: e.target.value })}
                placeholder="مثال: خصم 40% لفترة محدودة"
                className="h-8 text-xs rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                العنوان الفرعي أو ميزة المنتج
              </Label>
              <Input
                value={overlay.subheadline}
                onChange={(e) => onUpdateOverlay({ subheadline: e.target.value })}
                placeholder="مثال: شحن مجاني ودفع عند الاستلام لجميع المحافظات"
                className="h-8 text-xs rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  شارة الخصم / البادج
                </Label>
                <Input
                  value={overlay.discountBadge}
                  onChange={(e) => onUpdateOverlay({ discountBadge: e.target.value })}
                  placeholder="وفّر 30%"
                  className="h-8 text-xs rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  زر الدعوة للإجراء (CTA)
                </Label>
                <Input
                  value={overlay.callToAction}
                  onChange={(e) => onUpdateOverlay({ callToAction: e.target.value })}
                  placeholder="اطلب الآن"
                  className="h-8 text-xs rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  سعر البيع
                </Label>
                <Input
                  type="number"
                  value={overlay.price ?? ""}
                  onChange={(e) =>
                    onUpdateOverlay({ price: e.target.value ? Number(e.target.value) : null })
                  }
                  className="h-8 text-xs rounded-lg tabular-nums"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  السعر قبل الخصم (اختياري)
                </Label>
                <Input
                  type="number"
                  value={overlay.originalPrice ?? ""}
                  onChange={(e) =>
                    onUpdateOverlay({
                      originalPrice: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="299"
                  className="h-8 text-xs rounded-lg tabular-nums"
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                تموضع النصوص على الكانفاس
              </Label>
              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    { id: "top-right", label: "أعلى اليمين" },
                    { id: "top-center", label: "أعلى الوسط" },
                    { id: "top-left", label: "أعلى اليسار" },
                    { id: "bottom-right", label: "أسفل اليمين" },
                    { id: "bottom-center", label: "أسفل الوسط" },
                    { id: "bottom-left", label: "أسفل اليسار" },
                  ] as const
                ).map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => onUpdateOverlay({ textPosition: pos.id })}
                    className={`py-1 text-[10px] font-bold rounded-md border transition cursor-pointer ${
                      overlay.textPosition === pos.id
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Aspect Ratio & Advanced Prompt */}
        {activeTab === "ADVANCED" && (
          <div className="space-y-4">
            {/* AI Image Generation Model Selector */}
            <div className="space-y-2 bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  نموذج الذكاء الاصطناعي المعتمد
                </Label>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
                  OpenRouter Engine
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {ALLOWED_IMAGE_MODELS.map((m) => {
                  const isCurrent = selectedModel === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onSelectModel(m.id)}
                      className={`p-2 rounded-lg border text-right transition cursor-pointer flex items-center justify-between gap-1.5 ${
                        isCurrent
                          ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold ring-1 ring-indigo-500"
                          : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="truncate">
                        <div className="text-xs leading-tight">{m.nameAr}</div>
                        <div className="text-[9px] text-slate-400 font-mono">{m.nameEn}</div>
                      </div>
                      {m.badge && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex-shrink-0">
                          {m.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                مقاس الصورة الإعلانية المستهدفة
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "1:1" as AspectRatioType, label: "مربع 1:1", hint: "Instagram / Feed" },
                  { id: "9:16" as AspectRatioType, label: "ستوري 9:16", hint: "Reels / TikTok" },
                  { id: "16:9" as AspectRatioType, label: "عريض 16:9", hint: "Facebook Banner" },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onChangeAspectRatio(r.id)}
                    className={`p-2 rounded-xl border text-right transition cursor-pointer ${
                      aspectRatio === r.id
                        ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-bold"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-xs font-bold">{r.label}</div>
                    <div className="text-[10px] text-slate-400">{r.hint}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  توجيه مخصص للمشهد الإعلاني (AI Prompt)
                </Label>
                <button
                  type="button"
                  onClick={() => setShowPromptInput(!showPromptInput)}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>{showPromptInput ? "إخفاء" : "تعديل حر"}</span>
                  {showPromptInput ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              </div>

              {showPromptInput && (
                <textarea
                  value={customPrompt}
                  onChange={(e) => onChangeCustomPrompt(e.target.value)}
                  placeholder="أضف تفاصيل مخصصة للخلفية، الإضاءة، أو السطح..."
                  rows={3}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
