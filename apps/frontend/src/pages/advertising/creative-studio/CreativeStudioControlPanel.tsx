import React, { useState, useRef } from "react";
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
  Bot,
  Upload,
  Image as ImageIcon,
  Lock,
  Unlock,
  Check,
  X,
  Cpu,
  Bookmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CREATIVE_STUDIO_PRESETS } from "./CreativeStudioPresets";
import { ALLOWED_IMAGE_MODELS } from "./types";
import { CreativeDirectorSuggestions } from "./CreativeDirectorSuggestions";
import { CreativeAiChatCoPilot } from "./CreativeAiChatCoPilot";
import type {
  AspectRatioType,
  CreativePreset,
  CanvasOverlaySettings,
  MarketingProduct,
  CreativeAngleSuggestion,
  CreativeModality,
  ShadowType,
  BrandKitSettings,
  BatchCountType,
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
  referenceImageUrl: string | null;
  onSetReferenceImageUrl: (url: string | null) => void;
  brandKit: BrandKitSettings;
  onUpdateBrandKit: (updates: Partial<BrandKitSettings>) => void;
  batchCount: BatchCountType;
  onChangeBatchCount: (count: BatchCountType) => void;
  onOpenModelModal: () => void;
  onTriggerGenerateWithPrompt: (prompt: string) => void;
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
  referenceImageUrl,
  onSetReferenceImageUrl,
  brandKit,
  onUpdateBrandKit,
  batchCount,
  onChangeBatchCount,
  onOpenModelModal,
  onTriggerGenerateWithPrompt,
}) => {
  const [activeTab, setActiveTab] = useState<
    "DIRECTOR" | "COPILOT" | "PRESETS" | "PHYSICS" | "TYPOGRAPHY" | "ADVANCED"
  >("DIRECTOR");
  const [selectedModality, setSelectedModality] = useState<"ALL" | CreativeModality>("ALL");
  const [showPromptInput, setShowPromptInput] = useState(false);
  const refFileInputRef = useRef<HTMLInputElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

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

  const handleRefImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          onSetReferenceImageUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          onUpdateOverlay({
            logo: {
              ...(overlay.logo || {
                position: "top-right",
                size: "md",
                opacity: 1,
              }),
              url: reader.result,
              show: true,
            },
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50/50 dark:bg-slate-950/40 border-l border-slate-200/80 dark:border-slate-800 overflow-hidden select-none">
      {/* Top Action Bar: Generate CTA + Batch Selector + Quota */}
      <div className="p-3 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center justify-between gap-2 flex-shrink-0 flex-wrap">
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
            <span>
              {isGenerating
                ? "جاري التوليد..."
                : batchCount > 1
                ? `توليد ${batchCount} تنويعات بالذكاء الاصطناعي`
                : "توليد المشهد بالذكاء الاصطناعي"}
            </span>
          </Button>

          {/* Batch Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            {([1, 2, 4] as const).map((cnt) => (
              <button
                key={cnt}
                type="button"
                onClick={() => onChangeBatchCount(cnt)}
                className={`px-2 py-1 text-[11px] font-bold rounded-md transition cursor-pointer ${
                  batchCount === cnt
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title={`توليد ${cnt} ${cnt === 1 ? "صورة" : "تنويعات"}`}
              >
                {cnt}x
              </button>
            ))}
          </div>
        </div>

        {/* Model Selector Trigger & Quota */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenModelModal}
            className="h-7 px-2 text-[11px] font-bold rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition flex items-center gap-1 cursor-pointer"
            title="فتح معرض نماذج الذكاء الاصطناعي والمواصفات"
          >
            <Cpu className="w-3 h-3" />
            <span className="font-mono">{selectedModel.split("/").pop()}</span>
          </button>

          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
            <span>الرصيد:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">
              {dailyUsage}/{dailyLimit}
            </span>
          </div>
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
          onClick={() => setActiveTab("COPILOT")}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-t-lg transition cursor-pointer border-b-2 whitespace-nowrap ${
            activeTab === "COPILOT"
              ? "bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400 shadow-2xs"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border-transparent"
          }`}
        >
          <Bot className="w-3.5 h-3.5 text-indigo-500" />
          <span>محادثة الإيجنت</span>
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

        {/* TAB: CREATIVE COPILOT CHAT */}
        {activeTab === "COPILOT" && (
          <CreativeAiChatCoPilot
            product={selectedProduct}
            onApplyPrompt={(prompt) => {
              onChangeCustomPrompt(prompt);
            }}
            onTriggerGenerate={(prompt) => {
              onTriggerGenerateWithPrompt(prompt);
            }}
            isGenerating={isGenerating}
          />
        )}

        {/* TAB 2: THE 4 MODALITIES & PRESETS & REFERENCE IMAGE */}
        {activeTab === "PRESETS" && (
          <div className="space-y-3">
            {/* Reference Image Uploader Card */}
            <div className="p-3 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">
                    صورة مرجعية للأسلوب (Style Reference)
                  </h4>
                </div>
                {referenceImageUrl && (
                  <button
                    type="button"
                    onClick={() => onSetReferenceImageUrl(null)}
                    className="text-[10px] text-red-500 hover:text-red-700 flex items-center gap-0.5 cursor-pointer font-bold"
                  >
                    <X className="w-3 h-3" />
                    <span>إلغاء المرجع</span>
                  </button>
                )}
              </div>

              <input
                ref={refFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleRefImageUpload}
              />

              {referenceImageUrl ? (
                <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800">
                  <img
                    src={referenceImageUrl}
                    alt="Style Reference"
                    className="w-10 h-10 rounded-md object-cover border"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      مرجع الأسلوب نشط
                    </span>
                    <p className="text-[10px] text-slate-400 truncate">
                      سيقتبس الذكاء الاصطناعي الأسلوب والإضاءة
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refFileInputRef.current?.click()}
                    className="h-7 text-[10px] px-2"
                  >
                    تغيير
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => refFileInputRef.current?.click()}
                  className="w-full py-2 px-3 rounded-lg border border-dashed border-indigo-300 dark:border-indigo-800 hover:bg-white dark:hover:bg-slate-900 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>انقر لرفع صورة مرجعية للأسلوب (Pinterest / Competitor Ad)</span>
                </button>
              )}
            </div>
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

            {/* Brand Kit & Color Lock */}
            <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-indigo-500" />
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">
                    تثبيت هوية وألوان البراند (Brand Kit)
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateBrandKit({ isLocked: !brandKit.isLocked })}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                    brandKit.isLocked
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {brandKit.isLocked ? (
                    <Lock className="w-3 h-3" />
                  ) : (
                    <Unlock className="w-3 h-3" />
                  )}
                  <span>{brandKit.isLocked ? "الهوية مثبتة" : "غير مثبت"}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] font-bold text-slate-500 mb-1 block">
                    اللون الأساسي
                  </Label>
                  <div className="flex items-center gap-1">
                    <input
                      type="color"
                      value={brandKit.primaryColor}
                      onChange={(e) => {
                        onUpdateBrandKit({ primaryColor: e.target.value });
                        onUpdateOverlay({ primaryColor: e.target.value });
                      }}
                      className="w-6 h-6 rounded border cursor-pointer flex-shrink-0"
                    />
                    <Input
                      value={brandKit.primaryColor}
                      onChange={(e) => {
                        onUpdateBrandKit({ primaryColor: e.target.value });
                        onUpdateOverlay({ primaryColor: e.target.value });
                      }}
                      className="h-6 text-[10px] font-mono px-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[10px] font-bold text-slate-500 mb-1 block">
                    لون التمييز (Accent)
                  </Label>
                  <div className="flex items-center gap-1">
                    <input
                      type="color"
                      value={brandKit.accentColor}
                      onChange={(e) => {
                        onUpdateBrandKit({ accentColor: e.target.value });
                        onUpdateOverlay({ accentColor: e.target.value });
                      }}
                      className="w-6 h-6 rounded border cursor-pointer flex-shrink-0"
                    />
                    <Input
                      value={brandKit.accentColor}
                      onChange={(e) => {
                        onUpdateBrandKit({ accentColor: e.target.value });
                        onUpdateOverlay({ accentColor: e.target.value });
                      }}
                      className="h-6 text-[10px] font-mono px-1"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-[10px] font-bold text-slate-500 mb-1 block">
                  طابع الهوية البصرية
                </Label>
                <select
                  value={brandKit.aestheticMood}
                  onChange={(e) => onUpdateBrandKit({ aestheticMood: e.target.value as any })}
                  className="w-full h-7 px-2 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="minimalist-luxury">فخامة هادئة (Minimalist Luxury)</option>
                  <option value="bold-vibrant">طاقة وتباين عالي (Bold High-Energy)</option>
                  <option value="organic-earthy">طبيعي وأورجانيك (Warm Organic Earthy)</option>
                  <option value="cyber-dark">سايبر وتقني داكن (Cyber Dark Titanium)</option>
                  <option value="soft-pastel">ناعم وباستيل (Soft Pastel Delicate)</option>
                </select>
              </div>
            </div>

            {/* Brand Logo Overlay */}
            <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-indigo-500" />
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">
                    لوجو العلامة التجارية (Brand Logo)
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateOverlay({
                      logo: {
                        ...(overlay.logo || {
                          url: null,
                          position: "top-right",
                          size: "md",
                          opacity: 1,
                        }),
                        show: !overlay.logo?.show,
                      },
                    })
                  }
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer ${
                    overlay.logo?.show
                      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {overlay.logo?.show ? "مفعل" : "معطل"}
                </button>
              </div>

              <input
                ref={logoFileInputRef}
                type="file"
                accept="image/png, image/webp"
                className="hidden"
                onChange={handleLogoUpload}
              />

              {overlay.logo?.url ? (
                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border">
                  <img
                    src={overlay.logo.url}
                    alt="Logo preview"
                    className="w-8 h-8 object-contain rounded border bg-white/20"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block truncate">
                      تم تعيين الشعار
                    </span>
                    <p className="text-[9px] text-slate-400">يظهر فوق الكانفاس والتصدير بدقة 2K</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => logoFileInputRef.current?.click()}
                    className="h-6 text-[10px] px-2"
                  >
                    تغيير
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => logoFileInputRef.current?.click()}
                  className="w-full py-1.5 px-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-slate-600 dark:text-slate-400 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3 h-3" />
                  <span>رفع شعار المتجر (PNG مفرغ شفاف)</span>
                </button>
              )}

              {/* Logo Position & Size */}
              {overlay.logo?.show && (
                <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <Label className="text-[10px] text-slate-500 mb-1 block">الموضع</Label>
                    <select
                      value={overlay.logo.position || "top-right"}
                      onChange={(e) =>
                        onUpdateOverlay({
                          logo: { ...overlay.logo!, position: e.target.value as any },
                        })
                      }
                      className="w-full h-7 px-1.5 text-xs rounded border bg-white dark:bg-slate-800"
                    >
                      <option value="top-right">أعلى اليمين</option>
                      <option value="top-left">أعلى اليسار</option>
                      <option value="bottom-right">أسفل اليمين</option>
                      <option value="bottom-left">أسفل اليسار</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-[10px] text-slate-500 mb-1 block">الحجم</Label>
                    <select
                      value={overlay.logo.size || "md"}
                      onChange={(e) =>
                        onUpdateOverlay({
                          logo: { ...overlay.logo!, size: e.target.value as any },
                        })
                      }
                      className="w-full h-7 px-1.5 text-xs rounded border bg-white dark:bg-slate-800"
                    >
                      <option value="sm">صغير</option>
                      <option value="md">متوسط</option>
                      <option value="lg">كبير</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: ADVANCED & MODEL */}
        {activeTab === "ADVANCED" && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  محرك الذكاء الاصطناعي الحالي
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenModelModal}
                  className="h-7 text-xs font-bold text-indigo-600 gap-1 cursor-pointer"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>معرض النماذج (2026)</span>
                </Button>
              </div>

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
