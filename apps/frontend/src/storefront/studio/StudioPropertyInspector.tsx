import React, { useState } from "react";
import {
  PaintBrushIcon,
  Squares2X2Icon,
  DocumentTextIcon,
  SparklesIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  LinkIcon,
  PhotoIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import { getStorefrontSectionLabel } from "../sections/manifest";
import type { StudioInspectorTab, StudioDeviceMode, StudioSelectedElement } from "./StudioTypes";
import { StudioInspectorDesignTab } from "./inspector/StudioInspectorDesignTab";
import { StudioInspectorLayoutTab } from "./inspector/StudioInspectorLayoutTab";
import { StudioInspectorContentTab } from "./inspector/StudioInspectorContentTab";
import { StudioInspectorAiTab } from "./inspector/StudioInspectorAiTab";

interface StudioPropertyInspectorProps {
  selectedSectionKey: string;
  sectionConfig: any;
  deviceMode?: StudioDeviceMode;
  initialTab?: StudioInspectorTab;
  selectedElement?: StudioSelectedElement | null;
  onClearSelectedElement?: () => void;
  onClose: () => void;
  onUpdateField: (field: string, value: any) => void;
  onBatchUpdateFields?: (updates: Record<string, any>) => void;
  onOpenImagePicker?: () => void;
  onSwitchDevice?: (device: StudioDeviceMode) => void;
  onSave?: () => void;
}

export const StudioPropertyInspector: React.FC<StudioPropertyInspectorProps> = ({
  selectedSectionKey,
  sectionConfig,
  deviceMode = "desktop",
  initialTab = "design",
  selectedElement,
  onClearSelectedElement,
  onClose,
  onUpdateField,
  onBatchUpdateFields,
  onOpenImagePicker,
  onSwitchDevice = () => {},
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<StudioInspectorTab>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  if (!selectedSectionKey || !sectionConfig) {
    return (
      <aside className="relative flex h-full w-full flex-col items-center justify-center p-6 text-center bg-white border-s border-[#0c0d0f] select-none">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 end-3 rounded-lg p-1.5 text-[#8a8f96] hover:bg-[#f6f7f8] hover:text-[#17181c]"
          title="إغلاق اللوحة"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2b6cf6]/10 text-[#2b6cf6] mb-3">
          <AdjustmentsHorizontalIcon className="h-6 w-6" />
        </div>
        <h3 className="text-xs font-bold text-[#17181c]">الفاحص (Inspector)</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-[#8a8f96] max-w-[220px]">
          اختر أي قسم من الكانفس أو شجرة الطبقات لتعديل التصميم، التخطيط، والمحتوى فوراً.
        </p>
      </aside>
    );
  }

  const sectionType = typeof sectionConfig === "string" ? sectionConfig : sectionConfig.type;
  const label = getStorefrontSectionLabel(sectionType);
  const settings =
    typeof sectionConfig === "object" && sectionConfig !== null
      ? { ...(sectionConfig.settings || {}), ...sectionConfig }
      : {};

  const tabs: Array<{
    id: StudioInspectorTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: "design", label: "تصميم", icon: PaintBrushIcon },
    { id: "layout", label: "تخطيط", icon: Squares2X2Icon },
    { id: "content", label: "محتوى", icon: DocumentTextIcon },
    { id: "interactions", label: "تجاوب", icon: SparklesIcon },
  ];

  return (
    <aside className="flex h-full w-full flex-col bg-white border-s border-[#0c0d0f] select-none text-[#17181c]">
      {/* 1. Header with Breadcrumb and Close Button */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#eeeef0]">
        <div className="flex items-center gap-1.5 overflow-hidden truncate">
          <button
            type="button"
            onClick={onClearSelectedElement}
            className={`text-[12px] font-bold truncate transition-colors ${
              selectedElement
                ? "text-[#7a7f87] hover:text-[#17181c] hover:underline cursor-pointer"
                : "text-[#17181c]"
            }`}
            title="إعدادات القسم بالكامل"
          >
            {label}
          </button>
          {selectedElement && (
            <>
              <span className="text-[#c2c5cb] text-[10px] shrink-0">›</span>
              <b className="text-[12px] font-extrabold text-[#2b6cf6] truncate">
                {selectedElement.label}
              </b>
            </>
          )}
          {!selectedElement && (
            <span className="rounded bg-[#f4f5f7] px-2 py-0.5 text-[9.5px] font-semibold text-[#8a8f96] shrink-0 font-mono">
              {sectionType}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-[#8a8f96] hover:bg-[#f6f7f8] hover:text-[#17181c]"
          title="إغلاق الفاحص"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      {/* 2. Top Tabs (Wix Studio 4 tabs) */}
      <div className="flex border-b border-[#eeeef0] bg-[#fafbfc]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            !selectedElement &&
            (activeTab === tab.id ||
              (tab.id === "design" && activeTab === "style") ||
              (tab.id === "interactions" && activeTab === "visibility"));

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                onClearSelectedElement?.();
              }}
              className={`relative flex-1 py-2 text-center text-[11px] font-medium transition-colors ${
                isActive ? "text-[#17181c] font-bold" : "text-[#7a7f87] hover:text-[#17181c]"
              }`}
            >
              <Icon className="h-3.5 w-3.5 mx-auto mb-1" />
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[#2b6cf6]" />
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Tab Body Container */}
      <div className="flex-1 overflow-y-auto p-3.5 [scrollbar-width:thin]">
        {selectedElement ? (
          <div className="space-y-4">
            {/* Element Type Banner */}
            <div className="flex items-center justify-between rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#2b6cf6]/10 text-[#2b6cf6]">
                  {selectedElement.type === "button" && <LinkIcon className="h-4 w-4" />}
                  {selectedElement.type === "heading" && <DocumentTextIcon className="h-4 w-4" />}
                  {selectedElement.type === "subtitle" && <DocumentTextIcon className="h-4 w-4" />}
                  {selectedElement.type === "image" && <PhotoIcon className="h-4 w-4" />}
                  {selectedElement.type === "badge" && <TagIcon className="h-4 w-4" />}
                  {selectedElement.type === "custom" && <AdjustmentsHorizontalIcon className="h-4 w-4" />}
                </span>
                <div>
                  <h4 className="text-[11.5px] font-bold text-[#1e293b]">
                    {selectedElement.label}
                  </h4>
                  <p className="text-[9.5px] text-[#64748b]">عنصر داخلي محدد في الكانفس</p>
                </div>
              </div>
              <span className="rounded bg-[#2b6cf6]/10 px-2 py-0.5 text-[9.5px] font-semibold text-[#2b6cf6]">
                {selectedElement.type}
              </span>
            </div>

            {/* If Button (CTA) */}
            {selectedElement.type === "button" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-[#6f747b]">نص الزر</label>
                  <input
                    type="text"
                    value={settings.ctaText ?? settings.buttonText ?? selectedElement.currentText ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (onBatchUpdateFields) {
                        onBatchUpdateFields({
                          ctaText: val,
                          buttonText: val,
                          primaryButtonText: val,
                        });
                      }
                      onUpdateField("ctaText", val);
                      if (!onBatchUpdateFields) {
                        onUpdateField("buttonText", val);
                        onUpdateField("primaryButtonText", val);
                      }
                    }}
                    onBlur={() => onSave?.()}
                    placeholder="تسوق الآن"
                    className="w-full rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2.5 py-1.5 text-[11.5px] text-[#17181c] outline-none focus:border-[#2b6cf6] focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-[#6f747b]">رابط الزر (URL)</label>
                  <div className="flex items-center rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2 text-[#8a8f96] focus-within:border-[#2b6cf6] focus-within:bg-white">
                    <LinkIcon className="h-3.5 w-3.5 shrink-0 me-1" />
                    <input
                      type="text"
                      dir="ltr"
                      value={
                        settings.ctaLink ??
                        settings.buttonUrl ??
                        settings.primaryHref ??
                        selectedElement.currentLink ??
                        ""
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (onBatchUpdateFields) {
                          onBatchUpdateFields({
                            ctaLink: val,
                            primaryHref: val,
                            buttonUrl: val,
                          });
                        }
                        onUpdateField("ctaLink", val);
                        if (!onBatchUpdateFields) {
                          onUpdateField("primaryHref", val);
                          onUpdateField("buttonUrl", val);
                        }
                      }}
                      onBlur={() => onSave?.()}
                      placeholder="/shop أو https://..."
                      className="w-full bg-transparent py-1.5 text-[11.5px] text-[#17181c] outline-none font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* If Heading */}
            {selectedElement.type === "heading" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-[#6f747b]">العنوان الرئيسي</label>
                  <input
                    type="text"
                    value={settings.title ?? settings.heading ?? selectedElement.currentText ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (onBatchUpdateFields) {
                        onBatchUpdateFields({
                          title: val,
                          heading: val,
                        });
                      }
                      onUpdateField("title", val);
                      if (!onBatchUpdateFields) {
                        onUpdateField("heading", val);
                      }
                    }}
                    onBlur={() => onSave?.()}
                    placeholder="أدخل عنوان القسم…"
                    className="w-full rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2.5 py-1.5 text-[11.5px] text-[#17181c] outline-none focus:border-[#2b6cf6] focus:bg-white"
                  />
                </div>
              </div>
            )}

            {/* If Subtitle / Paragraph */}
            {selectedElement.type === "subtitle" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-[#6f747b]">الوصف / المحتوى</label>
                  <textarea
                    rows={3}
                    value={
                      settings[selectedElement.field] ??
                      settings.subtitle ??
                      settings.description ??
                      selectedElement.currentText ??
                      ""
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (onBatchUpdateFields) {
                        onBatchUpdateFields({
                          [selectedElement.field]: val,
                          ...(selectedElement.field === "subtitle" ? { description: val } : {}),
                        });
                      }
                      onUpdateField(selectedElement.field, val);
                      if (!onBatchUpdateFields && selectedElement.field === "subtitle") {
                        onUpdateField("description", val);
                      }
                    }}
                    onBlur={() => onSave?.()}
                    placeholder="أدخل النص أو الوصف التوضيحي…"
                    className="w-full rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2.5 py-1.5 text-[11.5px] text-[#17181c] outline-none focus:border-[#2b6cf6] focus:bg-white"
                  />
                </div>
              </div>
            )}

            {/* If Badge */}
            {selectedElement.type === "badge" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-[#6f747b]">نص الشارة</label>
                  <input
                    type="text"
                    value={settings.eyebrow ?? settings.badge ?? selectedElement.currentText ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (onBatchUpdateFields) {
                        onBatchUpdateFields({
                          eyebrow: val,
                          badge: val,
                        });
                      }
                      onUpdateField("eyebrow", val);
                      if (!onBatchUpdateFields) {
                        onUpdateField("badge", val);
                      }
                    }}
                    onBlur={() => onSave?.()}
                    placeholder="مثال: عرض خاص"
                    className="w-full rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2.5 py-1.5 text-[11.5px] text-[#17181c] outline-none focus:border-[#2b6cf6] focus:bg-white"
                  />
                </div>
              </div>
            )}

            {/* If Image */}
            {selectedElement.type === "image" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-[#6f747b]">الصورة</label>
                  <div className="flex items-center gap-2">
                    {settings[selectedElement.field] || selectedElement.currentImage ? (
                      <img
                        src={settings[selectedElement.field] || selectedElement.currentImage}
                        alt="معاينة"
                        className="h-12 w-16 shrink-0 rounded-md border border-[#ececee] object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-md border border-dashed border-[#ececee] bg-[#f6f7f8] text-[#8a8f96]">
                        <PhotoIcon className="h-5 w-5" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={onOpenImagePicker}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#ececee] bg-[#f6f7f8] py-2 text-[11px] font-semibold text-[#17181c] hover:bg-[#ececee] transition-colors"
                    >
                      <PhotoIcon className="h-3.5 w-3.5 text-[#2b6cf6]" />
                      <span>اختيار من مكتبة الصور</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-[#6f747b]">النص البديل (Alt)</label>
                  <input
                    type="text"
                    value={settings.imageAlt ?? selectedElement.currentText ?? ""}
                    onChange={(e) => onUpdateField("imageAlt", e.target.value)}
                    onBlur={() => onSave?.()}
                    placeholder="وصف محتوى الصورة لمحركات البحث"
                    className="w-full rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2.5 py-1.5 text-[11.5px] text-[#17181c] outline-none focus:border-[#2b6cf6] focus:bg-white"
                  />
                </div>
              </div>
            )}

            {/* If Custom */}
            {selectedElement.type === "custom" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-[#6f747b]">{selectedElement.label}</label>
                  <input
                    type="text"
                    value={settings[selectedElement.field] ?? selectedElement.currentText ?? ""}
                    onChange={(e) => onUpdateField(selectedElement.field, e.target.value)}
                    onBlur={() => onSave?.()}
                    className="w-full rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2.5 py-1.5 text-[11.5px] text-[#17181c] outline-none focus:border-[#2b6cf6] focus:bg-white"
                  />
                </div>
              </div>
            )}

            {/* Return to Full Section button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={onClearSelectedElement}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-[#e2e8f0] bg-white hover:bg-[#f8fafc] text-[11px] font-semibold text-[#1e293b] shadow-xs transition-colors"
              >
                <span>الرجوع إلى إعدادات القسم بالكامل</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {(activeTab === "design" || activeTab === "style") && (
              <StudioInspectorDesignTab
                sectionType={sectionType}
                settings={settings}
                deviceMode={deviceMode}
                onUpdateField={onUpdateField}
              />
            )}

            {activeTab === "layout" && (
              <StudioInspectorLayoutTab
                settings={settings}
                onUpdateField={onUpdateField}
              />
            )}

            {activeTab === "content" && (
              <StudioInspectorContentTab
                sectionType={sectionType}
                settings={settings}
                onUpdateField={onUpdateField}
                onOpenImagePicker={onOpenImagePicker}
              />
            )}

            {(activeTab === "interactions" || activeTab === "visibility") && (
              <StudioInspectorAiTab
                sectionType={sectionType}
                settings={settings}
                onUpdateField={onUpdateField}
                onBatchUpdateFields={onBatchUpdateFields}
                onSwitchDevice={onSwitchDevice}
              />
            )}
          </>
        )}
      </div>
    </aside>
  );
};
