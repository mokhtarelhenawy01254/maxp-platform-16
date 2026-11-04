import React from "react";
import { PhotoIcon, LinkIcon } from "@heroicons/react/24/outline";

export interface StudioHeroPanelGroupProps {
  settings: Record<string, any>;
  isPanelVariant: boolean;
  onUpdateField: (field: string, value: any) => void;
  onOpenImagePicker?: (targetField?: string) => void;
}

export const StudioHeroPanelGroup: React.FC<StudioHeroPanelGroupProps> = ({
  settings,
  isPanelVariant,
  onUpdateField,
  onOpenImagePicker,
}) => {
  const panelEyebrow = settings.panelEyebrow ?? "";
  const panelTitle = settings.panelTitle ?? "";
  const panelSubtitle = settings.panelSubtitle ?? "";
  const panelNote = settings.panelNote ?? "";
  const panelMetricLabel = settings.panelMetricLabel ?? "";
  const panelMetricValue = settings.panelMetricValue ?? "";
  const panelImage = settings.panelImage ?? "";

  return (
    <div className="space-y-3 pt-3 border-t border-[#ececee]" data-testid="hero-panel-group">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-[#17181c]">بطاقة الهيرو (Panel)</span>
        {isPanelVariant ? (
          <span className="text-[9.5px] font-semibold text-[#2b6cf6] bg-[#2b6cf6]/10 px-1.5 py-0.5 rounded">
            قالب نشط
          </span>
        ) : (
          <span className="text-[9.5px] text-[#8a8f96]">تظهر في بعض قوالب الهيرو</span>
        )}
      </div>

      <div className="space-y-1">
        <label className="block text-[10px] font-bold text-[#6f747b]">شارة البطاقة (Panel Eyebrow)</label>
        <input
          type="text"
          data-testid="input-panel-eyebrow"
          value={panelEyebrow}
          onChange={(e) => onUpdateField("panelEyebrow", e.target.value)}
          placeholder="مثال: مختارات الموسم • جديد"
          className="w-full rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2.5 py-1.5 text-[11.5px] text-[#17181c] outline-none focus:border-[#2b6cf6] focus:bg-white"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-[10px] font-bold text-[#6f747b]">عنوان البطاقة (Panel Title)</label>
        <input
          type="text"
          data-testid="input-panel-title"
          value={panelTitle}
          onChange={(e) => onUpdateField("panelTitle", e.target.value)}
          placeholder="أدخل عنوان بطاقة الهيرو…"
          className="w-full rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2.5 py-1.5 text-[11.5px] text-[#17181c] outline-none focus:border-[#2b6cf6] focus:bg-white"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-[10px] font-bold text-[#6f747b]">وصف البطاقة (Panel Subtitle)</label>
        <textarea
          rows={2}
          data-testid="input-panel-subtitle"
          value={panelSubtitle}
          onChange={(e) => onUpdateField("panelSubtitle", e.target.value)}
          placeholder="أدخل تفاصيل ومحتوى البطاقة…"
          className="w-full rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2.5 py-1.5 text-[11.5px] text-[#17181c] outline-none focus:border-[#2b6cf6] focus:bg-white"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-[10px] font-bold text-[#6f747b]">ملاحظة إضافية (Panel Note)</label>
        <input
          type="text"
          data-testid="input-panel-note"
          value={panelNote}
          onChange={(e) => onUpdateField("panelNote", e.target.value)}
          placeholder="مثال: شحن سريع داخل مصر + استبدال مجاني"
          className="w-full rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2.5 py-1.5 text-[11.5px] text-[#17181c] outline-none focus:border-[#2b6cf6] focus:bg-white"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-[#6f747b]">عنوان الإحصائية (Metric Label)</label>
          <input
            type="text"
            data-testid="input-panel-metric-label"
            value={panelMetricLabel}
            onChange={(e) => onUpdateField("panelMetricLabel", e.target.value)}
            placeholder="الأكثر طلباً"
            className="w-full rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2 py-1.5 text-[11.5px] text-[#17181c] outline-none focus:border-[#2b6cf6] focus:bg-white"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-[#6f747b]">قيمة الإحصائية (Metric Value)</label>
          <input
            type="text"
            data-testid="input-panel-metric-value"
            value={panelMetricValue}
            onChange={(e) => onUpdateField("panelMetricValue", e.target.value)}
            placeholder="+24% أو 10+"
            className="w-full rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2 py-1.5 text-[11.5px] text-[#17181c] outline-none focus:border-[#2b6cf6] focus:bg-white font-mono"
          />
        </div>
      </div>

      <div className="space-y-1.5 pt-1">
        <label className="block text-[10px] font-bold text-[#6f747b]">صورة البطاقة (Panel Image)</label>
        <div className="flex items-center gap-2">
          {panelImage ? (
            <img
              src={panelImage}
              alt="معاينة بطاقة الهيرو"
              className="h-10 w-14 shrink-0 rounded-md border border-[#ececee] object-cover"
            />
          ) : (
            <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-md border border-dashed border-[#ececee] bg-[#f6f7f8] text-[#8a8f96]">
              <PhotoIcon className="h-4 w-4" />
            </div>
          )}
          <button
            type="button"
            data-testid="btn-panel-image-picker"
            onClick={() => onOpenImagePicker?.("panelImage")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#ececee] bg-[#f6f7f8] py-1.5 text-[11px] font-semibold text-[#17181c] hover:bg-[#ececee]"
          >
            <PhotoIcon className="h-3.5 w-3.5 text-[#2b6cf6]" />
            <span>اختيار من مكتبة الصور</span>
          </button>
        </div>
        <div className="flex items-center rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2 text-[#8a8f96] focus-within:border-[#2b6cf6] focus-within:bg-white">
          <LinkIcon className="h-3.5 w-3.5 shrink-0 me-1" />
          <input
            type="text"
            dir="ltr"
            data-testid="input-panel-image-url"
            value={panelImage}
            onChange={(e) => onUpdateField("panelImage", e.target.value)}
            placeholder="رابط مباشر للصورة (URL)..."
            className="w-full bg-transparent py-1.5 text-[11px] text-[#17181c] outline-none font-mono"
          />
        </div>
      </div>
    </div>
  );
};
