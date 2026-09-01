import React, { useState } from "react";
import {
  AdjustmentsHorizontalIcon,
  EyeIcon,
  PaintBrushIcon,
  PhotoIcon,
  SparklesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { getStorefrontSectionLabel, getStorefrontSectionManifest } from "../sections/manifest";
import type { StudioInspectorTab } from "./StudioTypes";

interface StudioPropertyInspectorProps {
  selectedSectionKey: string;
  sectionConfig: any;
  onClose: () => void;
  onUpdateField: (field: string, value: any) => void;
  onOpenImagePicker?: () => void;
}

export const StudioPropertyInspector: React.FC<StudioPropertyInspectorProps> = ({
  selectedSectionKey,
  sectionConfig,
  onClose,
  onUpdateField,
  onOpenImagePicker,
}) => {
  const [activeTab, setActiveTab] = useState<StudioInspectorTab>("content");

  if (!selectedSectionKey || !sectionConfig) {
    return (
      <aside className="flex h-full w-full flex-col items-center justify-center p-6 text-center border-s border-border/80 bg-card/95 backdrop-blur-md">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-3">
          <AdjustmentsHorizontalIcon className="h-6 w-6" />
        </div>
        <h3 className="text-xs font-black text-foreground">مفتش الخصائص</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground max-w-[200px]">
          انقر على أي قسم داخل المعاينة أو من شجرة الطبقات لتعديل محتواه وألوانه هنا.
        </p>
      </aside>
    );
  }

  const sectionType = typeof sectionConfig === "string" ? sectionConfig : sectionConfig.type;
  const label = getStorefrontSectionLabel(sectionType);
  const manifest = getStorefrontSectionManifest(sectionType);

  return (
    <aside className="flex h-full w-full flex-col border-s border-border/80 bg-card/95 backdrop-blur-md">
      {/* Inspector Header */}
      <div className="flex items-center justify-between border-b border-border/80 p-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-xs font-black text-foreground">{label}</h3>
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              نشط
            </span>
          </div>
          <p className="truncate text-[10px] text-muted-foreground">{sectionType}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs Switcher (Content / Style / Visibility) */}
      <div className="flex border-b border-border/80 p-2">
        <button
          type="button"
          onClick={() => setActiveTab("content")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-bold transition-all ${
            activeTab === "content"
              ? "bg-secondary text-foreground shadow-sm ring-1 ring-border/50"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <SparklesIcon className="h-3.5 w-3.5" />
          <span>المحتوى</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("style")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-bold transition-all ${
            activeTab === "style"
              ? "bg-secondary text-foreground shadow-sm ring-1 ring-border/50"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <PaintBrushIcon className="h-3.5 w-3.5" />
          <span>المظهر</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("visibility")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-bold transition-all ${
            activeTab === "visibility"
              ? "bg-secondary text-foreground shadow-sm ring-1 ring-border/50"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <EyeIcon className="h-3.5 w-3.5" />
          <span>الظهور</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs [scrollbar-width:none]">
        {activeTab === "content" ? (
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-[11px] font-bold text-foreground mb-1.5">
                العنوان الرئيسي
              </label>
              <input
                type="text"
                value={sectionConfig.title || ""}
                onChange={(e) => onUpdateField("title", e.target.value)}
                placeholder="أدخل عنوان القسم..."
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Subtitle */}
            <div>
              <label className="block text-[11px] font-bold text-foreground mb-1.5">
                العنوان الفرعي / الوصف
              </label>
              <textarea
                rows={3}
                value={sectionConfig.subtitle || ""}
                onChange={(e) => onUpdateField("subtitle", e.target.value)}
                placeholder="وصف مختصر للقسم..."
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Image Selector */}
            <div>
              <label className="block text-[11px] font-bold text-foreground mb-1.5">
                صورة القسم / الخلفية
              </label>
              <button
                type="button"
                onClick={onOpenImagePicker}
                className="flex w-full items-center justify-between rounded-2xl border border-border bg-background/60 p-3 hover:border-primary transition-all text-start"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <PhotoIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-foreground">اختيار أو رفع صورة</p>
                    <p className="truncate text-[10px] text-muted-foreground">مكتبة وسائط المتجر</p>
                  </div>
                </div>
              </button>
            </div>

            {/* CTA Button Text */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-foreground mb-1.5">
                  نص الزر
                </label>
                <input
                  type="text"
                  value={sectionConfig.ctaText || ""}
                  onChange={(e) => onUpdateField("ctaText", e.target.value)}
                  placeholder="تسوق الآن"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-foreground mb-1.5">
                  رابط الزر
                </label>
                <input
                  type="text"
                  value={sectionConfig.primaryHref || ""}
                  onChange={(e) => onUpdateField("primaryHref", e.target.value)}
                  placeholder="/collections"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        ) : activeTab === "style" ? (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-foreground mb-1.5">
                لون خلفية القسم
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={sectionConfig.backgroundColor || "#ffffff"}
                  onChange={(e) => onUpdateField("backgroundColor", e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-transparent p-1"
                />
                <input
                  type="text"
                  value={sectionConfig.backgroundColor || ""}
                  onChange={(e) => onUpdateField("backgroundColor", e.target.value)}
                  placeholder="#ffffff"
                  className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-background/50 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">إظهار على الهواتف المحمولة</span>
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
              </div>
              <div className="flex items-center justify-between border-t border-border/50 pt-3">
                <span className="font-bold text-foreground">إظهار على شاشات الكمبيوتر</span>
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
