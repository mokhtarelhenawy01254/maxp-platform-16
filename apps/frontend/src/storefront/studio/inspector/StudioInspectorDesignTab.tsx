import React, { useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

import type { StudioDeviceMode } from "../StudioTypes";

interface StudioInspectorDesignTabProps {
  sectionType: string;
  settings: Record<string, any>;
  deviceMode?: StudioDeviceMode;
  onUpdateField: (field: string, value: any) => void;
}

export const StudioInspectorDesignTab: React.FC<StudioInspectorDesignTabProps> = ({
  sectionType,
  settings,
  deviceMode = "desktop",
  onUpdateField,
}) => {
  const [openAcc, setOpenAcc] = useState<{ [key: string]: boolean }>({
    fill: true,
    shadow: true,
    corners: true,
  });

  const toggleAcc = (key: string) => {
    setOpenAcc((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const currentColor = settings.backgroundColor || settings.bgColor || "#ffffff";
  const shadowMode = settings.shadow || "soft";
  const cornerRadius = settings.borderRadius || "medium";

  const colorSwatches = [
    { label: "أبيض", val: "#ffffff" },
    { label: "كريمي دافئ", val: "#f3ecdf" },
    { label: "كحلي هادئ", val: "#0f172a" },
    { label: "طوبي أنيق", val: "#b4552d" },
    { label: "رمادي خفيف", val: "#f8fafc" },
  ];

  return (
    <div className="space-y-3.5 select-none text-[11.5px] text-[#17181c]">
      {/* 1. Dimensions Grid (X, Y, W, H) */}
      <div>
        <span className="block text-[10px] font-bold text-[#8a8f96] mb-1.5">الأبعاد والموضع</span>
        <div className="grid grid-cols-4 gap-1.5 font-mono">
          <div className="rounded-lg border border-[#ececee] bg-[#f6f7f8] p-2">
            <span className="block text-[9.5px] text-[#8a8f96]">X</span>
            <b className="text-[11.5px] text-[#17181c] font-semibold">0</b>
          </div>
          <div className="rounded-lg border border-[#ececee] bg-[#f6f7f8] p-2">
            <span className="block text-[9.5px] text-[#8a8f96]">Y</span>
            <b className="text-[11.5px] text-[#17181c] font-semibold">84</b>
          </div>
          <div className="rounded-lg border border-[#ececee] bg-[#f6f7f8] p-2">
            <span className="block text-[9.5px] text-[#8a8f96]">W</span>
            <b className="text-[11.5px] text-[#17181c] font-semibold">
              {deviceMode === "mobile" ? "375" : deviceMode === "tablet" ? "768" : "1200"}
              <i className="text-[9px] text-[#7c5cff] not-italic ms-0.5">px*</i>
            </b>
          </div>
          <div className="rounded-lg border border-[#ececee] bg-[#f6f7f8] p-2">
            <span className="block text-[9.5px] text-[#8a8f96]">H</span>
            <b className="text-[11.5px] text-[#17181c] font-semibold">320<i className="text-[9px] text-[#7c5cff] not-italic ms-0.5">px*</i></b>
          </div>
        </div>
      </div>

      {/* 2. Responsive Behavior */}
      <div className="flex items-center justify-between rounded-lg border border-[#ececee] bg-[#f6f7f8] p-2.5">
        <span className="text-[11px] text-[#6f747b]">السلوك المتجاوب</span>
        <b className="text-[11.5px] text-[#17181c] font-bold">خلفية ممتدة (Fluid) ▾</b>
      </div>

      {/* 3. Accordion: Fill & Stroke */}
      <div className="overflow-hidden rounded-lg border border-[#ececee]">
        <button
          type="button"
          onClick={() => toggleAcc("fill")}
          className="flex w-full items-center justify-between bg-[#fafbfc] px-3 py-2 text-start font-medium text-[#3f434a]"
        >
          <span>التعبئة والحدود</span>
          <ChevronDownIcon
            className={`h-3.5 w-3.5 text-[#9aa0a8] transition-transform ${
              openAcc.fill ? "rotate-180" : ""
            }`}
          />
        </button>

        {openAcc.fill && (
          <div className="p-3 bg-white space-y-2.5">
            <div className="flex items-center gap-2">
              {colorSwatches.map((swatch) => (
                <button
                  key={swatch.val}
                  type="button"
                  onClick={() => onUpdateField("backgroundColor", swatch.val)}
                  style={{ backgroundColor: swatch.val }}
                  title={swatch.label}
                  className={`h-6 w-6 rounded-md border border-[#e3e3e6] transition-transform ${
                    currentColor === swatch.val
                      ? "ring-2 ring-[#2b6cf6] ring-offset-1 scale-105"
                      : "hover:scale-105"
                  }`}
                />
              ))}
              <span className="ms-auto text-[10px] text-[#8a8f96]">شفافية 0%</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10.5px] text-[#8a8f96]">لون مخصص:</span>
              <input
                type="color"
                value={currentColor.startsWith("#") ? currentColor : "#ffffff"}
                onChange={(e) => onUpdateField("backgroundColor", e.target.value)}
                className="h-6 w-12 cursor-pointer rounded border border-[#ececee] bg-transparent"
              />
            </div>
          </div>
        )}
      </div>

      {/* 4. Accordion: Shadow & Corners */}
      <div className="overflow-hidden rounded-lg border border-[#ececee]">
        <button
          type="button"
          onClick={() => toggleAcc("shadow")}
          className="flex w-full items-center justify-between bg-[#fafbfc] px-3 py-2 text-start font-medium text-[#3f434a]"
        >
          <span>الزوايا والظل</span>
          <ChevronDownIcon
            className={`h-3.5 w-3.5 text-[#9aa0a8] transition-transform ${
              openAcc.shadow ? "rotate-180" : ""
            }`}
          />
        </button>

        {openAcc.shadow && (
          <div className="p-3 bg-white space-y-2">
            {[
              { id: "soft", label: "ظل ناعم (Soft Studio)" },
              { id: "card", label: "ظل بطاقة بارز (Elevated)" },
              { id: "none", label: "بلا ظل (Flat)" },
            ].map((option) => (
              <label
                key={option.id}
                onClick={() => onUpdateField("shadow", option.id)}
                className="flex items-center gap-2 cursor-pointer text-[11px] text-[#3f434a]"
              >
                <input
                  type="radio"
                  name="shadowMode"
                  checked={shadowMode === option.id}
                  onChange={() => onUpdateField("shadow", option.id)}
                  className="accent-[#2b6cf6]"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Custom CSS link */}
      <button
        type="button"
        onClick={() => onUpdateField("customCssEnabled", true)}
        className="text-[11px] font-semibold text-[#2b6cf6] hover:underline block pt-1"
      >
        + إضافة CSS مخصص للسيكشن
      </button>
    </div>
  );
};
