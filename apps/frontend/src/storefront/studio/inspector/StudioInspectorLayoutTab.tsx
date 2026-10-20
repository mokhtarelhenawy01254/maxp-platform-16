import React, { useState } from "react";
import { ChevronDownIcon, Squares2X2Icon, ArrowsPointingOutIcon } from "@heroicons/react/24/outline";
import {
  StudioPaddingControl,
  StudioMarginControl,
  StudioDimensionsLayoutControl,
} from "./StudioDimensionControls";

interface StudioInspectorLayoutTabProps {
  settings: Record<string, any>;
  onUpdateField: (field: string, value: any) => void;
  onBatchUpdateFields?: (updates: Record<string, any>) => void;
}

export const StudioInspectorLayoutTab: React.FC<StudioInspectorLayoutTabProps> = ({
  settings,
  onUpdateField,
  onBatchUpdateFields,
}) => {
  const [openAcc, setOpenAcc] = useState<{ [key: string]: boolean }>({
    spacing: true,
    layout: true,
  });

  const toggleAcc = (key: string) => {
    setOpenAcc((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const align = settings.align || "right";
  const containerWidth = settings.containerWidth || "fluid";
  const spacingPreset = settings.spacing || "normal";

  return (
    <div className="space-y-3.5 select-none text-[11.5px] text-[#17181c]">
      {/* 1. Accordion: Spacing (المسافات والحشوات) */}
      <div className="overflow-hidden rounded-lg border border-[#ececee]">
        <button
          type="button"
          onClick={() => toggleAcc("spacing")}
          className="flex w-full items-center justify-between bg-[#fafbfc] px-3 py-2 text-start font-medium text-[#3f434a]"
        >
          <div className="flex items-center gap-1.5 font-bold">
            <ArrowsPointingOutIcon className="h-3.5 w-3.5 text-[#2b6cf6]" />
            <span>المسافات والحشوات (Spacing & Padding)</span>
          </div>
          <ChevronDownIcon
            className={`h-3.5 w-3.5 text-[#9aa0a8] transition-transform ${
              openAcc.spacing ? "rotate-180" : ""
            }`}
          />
        </button>

        {openAcc.spacing && (
          <div className="p-3 bg-white space-y-3">
            {/* Free Padding with Link Toggle */}
            <StudioPaddingControl
              settings={settings}
              onUpdateField={onUpdateField}
              onBatchUpdateFields={onBatchUpdateFields}
            />

            {/* Free Margin */}
            <div className="border-t border-[#f0f1f3] pt-2.5">
              <StudioMarginControl
                settings={settings}
                onUpdateField={onUpdateField}
              />
            </div>

            {/* General Spacing Presets */}
            <div className="border-t border-[#f0f1f3] pt-2.5 space-y-1.5">
              <span className="block text-[10px] font-bold text-[#8a8f96]">
                نمط التباعد العام
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: "compact", label: "مضغوط (16px)", pt: 16 },
                  { id: "normal", label: "قياسي (32px)", pt: 32 },
                  { id: "spacious", label: "واسع (64px)", pt: 64 },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (onBatchUpdateFields) {
                        onBatchUpdateFields({
                          spacing: item.id,
                          paddingTop: item.pt,
                          paddingBottom: item.pt,
                          padding: item.pt,
                        });
                      } else {
                        onUpdateField("spacing", item.id);
                        onUpdateField("paddingTop", item.pt);
                        onUpdateField("paddingBottom", item.pt);
                      }
                    }}
                    className={`rounded-lg border py-1.5 text-center text-[10.5px] transition-all ${
                      spacingPreset === item.id
                        ? "border-[#2b6cf6] bg-[#2b6cf6]/10 text-[#2b6cf6] font-bold"
                        : "border-[#ececee] bg-[#f6f7f8] text-[#6f747b] hover:text-[#17181c]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Accordion: Layout (التخطيط والارتفاع) */}
      <div className="overflow-hidden rounded-lg border border-[#ececee]">
        <button
          type="button"
          onClick={() => toggleAcc("layout")}
          className="flex w-full items-center justify-between bg-[#fafbfc] px-3 py-2 text-start font-medium text-[#3f434a]"
        >
          <div className="flex items-center gap-1.5 font-bold">
            <Squares2X2Icon className="h-3.5 w-3.5 text-[#2b6cf6]" />
            <span>التخطيط والمقاسات (Layout & Dimensions)</span>
          </div>
          <ChevronDownIcon
            className={`h-3.5 w-3.5 text-[#9aa0a8] transition-transform ${
              openAcc.layout ? "rotate-180" : ""
            }`}
          />
        </button>

        {openAcc.layout && (
          <div className="p-3 bg-white space-y-3">
            {/* Container Width (Fluid vs Contained) */}
            <div className="space-y-1.5">
              <span className="block text-[10px] font-bold text-[#8a8f96]">
                عرض الحاوية
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateField("containerWidth", "fluid")}
                  className={`rounded-lg border p-2 text-start transition-all ${
                    containerWidth === "fluid"
                      ? "border-[#2b6cf6] bg-[#2b6cf6]/10 text-[#2b6cf6] font-bold"
                      : "border-[#ececee] bg-[#f6f7f8] text-[#6f747b] hover:text-[#17181c]"
                  }`}
                >
                  <span className="block text-[10.5px]">عرض كامل (Fluid)</span>
                  <span className="text-[9px] text-[#8a8f96] font-normal">100% بعرض الشاشة</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateField("containerWidth", "contained")}
                  className={`rounded-lg border p-2 text-start transition-all ${
                    containerWidth === "contained"
                      ? "border-[#2b6cf6] bg-[#2b6cf6]/10 text-[#2b6cf6] font-bold"
                      : "border-[#ececee] bg-[#f6f7f8] text-[#6f747b] hover:text-[#17181c]"
                  }`}
                >
                  <span className="block text-[10.5px]">حاوية مقيدة (Box)</span>
                  <span className="text-[9px] text-[#8a8f96] font-normal">بحد أقصى 1240px</span>
                </button>
              </div>
            </div>

            {/* Container Alignment */}
            <div className="border-t border-[#f0f1f3] pt-2.5 space-y-1.5">
              <span className="block text-[10px] font-bold text-[#8a8f96]">
                المحاذاة والاتجاه (Alignment)
              </span>
              <div className="flex rounded-lg border border-[#ececee] bg-[#f6f7f8] p-1">
                {[
                  { id: "right", label: "يمين" },
                  { id: "center", label: "وسط" },
                  { id: "left", label: "يسار" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onUpdateField("align", item.id)}
                    className={`flex-1 rounded-md py-1 text-center text-[10.5px] font-medium transition-all ${
                      align === item.id
                        ? "bg-white text-[#2b6cf6] shadow-xs font-bold"
                        : "text-[#6f747b] hover:text-[#17181c]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Free Min-Height & Free Gap */}
            <div className="border-t border-[#f0f1f3] pt-2.5">
              <StudioDimensionsLayoutControl
                settings={settings}
                onUpdateField={onUpdateField}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
