import React, { useState } from "react";
import {
  Wand2,
  Sparkles,
  Layers,
  Type,
  Tag,
  Palette,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
  Sliders,
  Move,
  Sun,
  Flame,
  Users,
  Store,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CREATIVE_STUDIO_PRESETS } from "./CreativeStudioPresets";
import { ALLOWED_IMAGE_MODELS } from "./types";
import { CreativeDirectorSuggestions } from "./CreativeDirectorSuggestions";
import type {
  AspectRatioType,
  CreativePreset,
  CanvasOverlaySettings,
  MarketingProduct,
  CreativeAngleSuggestion,
  CreativeModality,
  ShadowType,
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
  onSelectAngle?: (angle: CreativeAngleSuggestion) => void;
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
  onSelectAngle,
  isGenerating,
  onGenerate,
  dailyUsage = 0,
  dailyLimit = 50,
}) => {
  const [activeTab, setActiveTab] = useState<"DIRECTOR" | "PRESETS" | "PHYSICS" | "TYPOGRAPHY" | "ADVANCED">("DIRECTOR");
  const [selectedModality, setSelectedModality] = useState<"ALL" | CreativeModality>("ALL");
  const [showPromptInput, setShowPromptInput] = useState(false);

  const transform = overlay.productTransform || {
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    shadowType: "contact",
  };

  const filteredPresets = CREATIVE_STUDIO_PRESETS.filter((preset) =>
    selectedModality === "ALL" ? true : preset.category === selectedModality
  );

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

      {/* Modern 2026 Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200/80 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/40 px-2 pt-1.5 gap-0.5 overflow-x-auto flex-shrink-0 no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab("DIRECTOR")}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-t-lg transition cursor-pointer border-b-2 whitespace-nowrap ${
            activeTab === "DIRECTOR"
              ? "bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400 shadow-2xs"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border-transparent"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>المخرج الإبداعي</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("PRESETS")}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-t-lg transition cursor-pointer border-b-2 whitespace-nowrap ${
            activeTab === "PRESETS"
              ? "bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400 shadow-2xs"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border-transparent"
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>البيئات الأربعة</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("PHYSICS")}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-t-lg transition cursor-pointer border-b-2 whitespace-nowrap ${
            activeTab === "PHYSICS"
              ? "bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400 shadow-2xs"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border-transparent"
          }`}
        >
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          <span>الظلال والحجم</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("TYPOGRAPHY")}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-t-lg transition cursor-pointer border-b-2 whitespace-nowrap ${
            activeTab === "TYPOGRAPHY"
              ? "bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400 shadow-2xs"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border-transparent"
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>نصوص العرض</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ADVANCED")}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-t-lg transition cursor-pointer border-b-2 whitespace-nowrap ${
            activeTab === "ADVANCED"
              ? "bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400 shadow-2xs"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border-transparent"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>الموديل</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: CREATIVE DIRECTOR */}
        {activeTab === "DIRECTOR" && (
          <div className="space-y-4">
            {selectedProduct ? (
              <CreativeDirectorSuggestions
                product={selectedProduct}
                onSelectAngle={(angle) => {
                  onChangeCustomPrompt(angle.prompt);
                  if (onSelectAngle) onSelectAngle(angle);
                  // Find matching preset
                  const matched = CREATIVE_STUDIO_PRESETS.find((p) => p.category === angle.modality);
                  if (matched) onSelectPreset(matched);
                }}
                isGenerating={isGenerating}
              />
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                <Sparkles className="w-6 h-6 mx-auto mb-2 text-indigo-400" />
                اختر منتجاً من الشريط العلوي ليقوم المخرج الإبداعي باقتراح 3 زوايا تسويقية مخصصة له.
              </div>
            )}
          </div>
        )}

        {/* TAB 2: THE 4 MODALITIES & PRESETS */}
        {activeTab === "PRESETS" && (
          <div className="space-y-3">
            {/* Modality Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
              {(
                [
                  { id: "ALL", label: "الكل", icon: Sparkles },
                  { id: "lifestyle", label: "سياق الحياة", icon: Flame },
                  { id: "on_model", label: "العارض البشري", icon: Users },
                  { id: "direct_response", label: "إعلان تحويل", icon: Compass },
                  { id: "packshot", label: "الكتالوج النقي", icon: Store },
                ] as const
              ).map((mod) => {
                const Icon = mod.icon;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => setSelectedModality(mod.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
                      selectedModality === mod.id
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{mod.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredPresets.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <div
                    key={preset.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectPreset(preset)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectPreset(preset);
                      }
                    }}
                    className={`text-right p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-xs ring-1 ring-indigo-500"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                            preset.badgeColor || "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {preset.category}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {preset.labelAr}
                        </h4>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {preset.descriptionAr}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: SHADOW PHYSICS & TRANSFORM */}
        {activeTab === "PHYSICS" && (
          <div className="space-y-4">
            {/* Shadow Physics Mode */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                فيزياء الظل (Shadow Physics)
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: "contact", label: "ظل التماس الأرضي", desc: "واقعي تحت أسفل المنتج" },
                    { id: "directional", label: "ظل استوديو مائل", desc: "يعكس اتجاه الإضاءة" },
                    { id: "subtle", label: "ظل محيطي ناعم", desc: "خفيف للمنتجات المعلقة" },
                    { id: "none", label: "بدون ظل", desc: "للكتالوج النقي" },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() =>
                      onUpdateOverlay({
                        productTransform: { ...transform, shadowType: s.id as ShadowType },
                      })
                    }
                    className={`p-2.5 rounded-xl border text-right transition cursor-pointer ${
                      transform.shadowType === s.id
                        ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="text-xs font-bold">{s.label}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Scale Slider */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700 dark:text-slate-300">حجم المنتج (Scale)</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">
                  {Math.round(transform.scale * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={transform.scale}
                onChange={(e) =>
                  onUpdateOverlay({
                    productTransform: { ...transform, scale: parseFloat(e.target.value) },
                  })
                }
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Rotation Slider */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700 dark:text-slate-300">تدوير المنتج (Rotation)</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">
                  {transform.rotation}°
                </span>
              </div>
              <input
                type="range"
                min="-30"
                max="30"
                step="1"
                value={transform.rotation}
                onChange={(e) =>
                  onUpdateOverlay({
                    productTransform: { ...transform, rotation: parseInt(e.target.value, 10) },
                  })
                }
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Reset Position Button */}
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  onUpdateOverlay({
                    productTransform: { x: 0, y: 0, scale: 1, rotation: 0, shadowType: "contact" },
                  })
                }
                className="w-full h-8 text-xs rounded-xl border-slate-200 dark:border-slate-800 cursor-pointer gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>إعادة ضبط الموضع والحجم للافتراضي</span>
              </Button>
            </div>
          </div>
        )}

        {/* TAB 4: TYPOGRAPHY & AD COPY */}
        {activeTab === "TYPOGRAPHY" && (
          <div className="space-y-3">
            <div>
              <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                عنوان الإعلان الرئيسي (Headline)
              </Label>
              <Input
                value={overlay.headline}
                onChange={(e) => onUpdateOverlay({ headline: e.target.value })}
                className="h-8 text-xs mt-1"
                placeholder="عنوان العرض الرئيسي..."
              />
            </div>

            <div>
              <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                النص التوضيحي (Subheadline)
              </Label>
              <Input
                value={overlay.subheadline}
                onChange={(e) => onUpdateOverlay({ subheadline: e.target.value })}
                className="h-8 text-xs mt-1"
                placeholder="تفاصيل العرض والشحن..."
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  شارة الخصم (Badge)
                </Label>
                <Input
                  value={overlay.discountBadge}
                  onChange={(e) => onUpdateOverlay({ discountBadge: e.target.value })}
                  className="h-8 text-xs mt-1"
                  placeholder="خصم خاص..."
                />
              </div>

              <div>
                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  زر الحث على الشراء (CTA)
                </Label>
                <Input
                  value={overlay.callToAction}
                  onChange={(e) => onUpdateOverlay({ callToAction: e.target.value })}
                  className="h-8 text-xs mt-1"
                  placeholder="اطلب الآن..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
              <div>
                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  لون الزر الرئيسي
                </Label>
                <input
                  type="color"
                  value={overlay.primaryColor}
                  onChange={(e) => onUpdateOverlay({ primaryColor: e.target.value })}
                  className="w-full h-8 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 p-0.5 mt-1"
                />
              </div>

              <div>
                <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  لون شارة الخصم
                </Label>
                <input
                  type="color"
                  value={overlay.accentColor}
                  onChange={(e) => onUpdateOverlay({ accentColor: e.target.value })}
                  className="w-full h-8 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 p-0.5 mt-1"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: ADVANCED & MODEL */}
        {activeTab === "ADVANCED" && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                نموذج الذكاء الاصطناعي (AI Image Model)
              </Label>
              <div className="space-y-1.5 mt-1.5">
                {ALLOWED_IMAGE_MODELS.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => onSelectModel(model.id)}
                    className={`w-full p-2 rounded-xl border text-right transition flex items-center justify-between cursor-pointer ${
                      selectedModel === model.id
                        ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <span className="text-xs font-bold">{model.nameAr}</span>
                    {model.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                        {model.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800">
              <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                برومبت مخصص إضافي (Prompt)
              </Label>
              <textarea
                value={customPrompt}
                onChange={(e) => onChangeCustomPrompt(e.target.value)}
                placeholder="اكتب تفاصيل إضافية لتخصيص الإضاءة أو خلفية المشهد..."
                className="w-full h-20 p-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 mt-1 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
