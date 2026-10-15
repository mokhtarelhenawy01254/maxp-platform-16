import React, { useState } from "react";
import { ChevronDownIcon, CodeBracketIcon } from "@heroicons/react/24/outline";
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
    css: Boolean(settings.customCss),
  });

  const toggleAcc = (key: string) => {
    setOpenAcc((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const currentColor = settings.backgroundColor || settings.bgColor || "#ffffff";
  const shadowMode = settings.shadow || "none";
  const cornerRadius = settings.borderRadius || "none";
  const containerWidth = settings.containerWidth || "fluid";
  const customCss = settings.customCss || "";

  const colorSwatches = [
    { label: "أبيض ناصع", val: "#ffffff" },
    { label: "كريمي دافئ", val: "#fdfbf7" },
    { label: "رمادي فاخر", val: "#f8fafc" },
    { label: "كحلي هادئ", val: "#0f172a" },
    { label: "طوبي أنيق", val: "#b4552d" },
  ];

  const cornerOptions = [
    { id: "none", label: "حادة (0px)" },
    { id: "small", label: "خفيفة (8px)" },
    { id: "medium", label: "متوسطة (16px)" },
    { id: "large", label: "دائرية (24px)" },
  ];

  return (
    <div className="space-y-3.5 select-none text-[11.5px] text-[#17181c]">
      {/* 1. Layout Mode & Responsive Width */}
      <div className="space-y-1.5">
        <span className="block text-[10px] font-bold text-[#8a8f96]">عرض وتخطيط السيكشن</span>
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
            <span className="text-[9.5px] text-[#8a8f96] font-normal">100% بعرض الشاشة</span>
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
            <span className="text-[9.5px] text-[#8a8f96] font-normal">بحد أقصى 1240px</span>
          </button>
        </div>
      </div>

      {/* 2. Accordion: Fill & Background Color */}
      <div className="overflow-hidden rounded-lg border border-[#ececee]">
        <button
          type="button"
          onClick={() => toggleAcc("fill")}
          className="flex w-full items-center justify-between bg-[#fafbfc] px-3 py-2 text-start font-medium text-[#3f434a]"
        >
          <span>لون خلفية السيكشن</span>
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
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10.5px] text-[#8a8f96]">لون مخصص (HEX):</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  dir="ltr"
                  value={currentColor}
                  onChange={(e) => onUpdateField("backgroundColor", e.target.value)}
                  className="w-16 rounded border border-[#ececee] px-1.5 py-0.5 text-[10.5px] font-mono text-[#17181c] text-center"
                />
                <input
                  type="color"
                  value={currentColor.startsWith("#") && currentColor.length === 7 ? currentColor : "#ffffff"}
                  onChange={(e) => onUpdateField("backgroundColor", e.target.value)}
                  className="h-6 w-7 cursor-pointer rounded border border-[#ececee] bg-transparent"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Accordion: Corners & Border Radius */}
      <div className="overflow-hidden rounded-lg border border-[#ececee]">
        <button
          type="button"
          onClick={() => toggleAcc("corners")}
          className="flex w-full items-center justify-between bg-[#fafbfc] px-3 py-2 text-start font-medium text-[#3f434a]"
        >
          <span>استدارة الزوايا (Radius)</span>
          <ChevronDownIcon
            className={`h-3.5 w-3.5 text-[#9aa0a8] transition-transform ${
              openAcc.corners ? "rotate-180" : ""
            }`}
          />
        </button>

        {openAcc.corners && (
          <div className="p-3 bg-white">
            <div className="grid grid-cols-2 gap-1.5">
              {cornerOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onUpdateField("borderRadius", opt.id)}
                  className={`rounded-md border py-1.5 px-2 text-center text-[10.5px] transition-all ${
                    cornerRadius === opt.id
                      ? "border-[#2b6cf6] bg-[#2b6cf6]/10 text-[#2b6cf6] font-bold"
                      : "border-[#ececee] bg-[#f6f7f8] text-[#6f747b] hover:text-[#17181c]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Accordion: Shadows */}
      <div className="overflow-hidden rounded-lg border border-[#ececee]">
        <button
          type="button"
          onClick={() => toggleAcc("shadow")}
          className="flex w-full items-center justify-between bg-[#fafbfc] px-3 py-2 text-start font-medium text-[#3f434a]"
        >
          <span>الظل والتأثيرات (Shadows)</span>
          <ChevronDownIcon
            className={`h-3.5 w-3.5 text-[#9aa0a8] transition-transform ${
              openAcc.shadow ? "rotate-180" : ""
            }`}
          />
        </button>

        {openAcc.shadow && (
          <div className="p-3 bg-white space-y-1.5">
            {[
              { id: "none", label: "بلا ظل (Flat)" },
              { id: "soft", label: "ظل ناعم خفيف (Soft Subtle)" },
              { id: "card", label: "ظل بارز (Elevated Card)" },
            ].map((option) => (
              <label
                key={option.id}
                onClick={() => onUpdateField("shadow", option.id)}
                className="flex items-center gap-2 cursor-pointer text-[11px] text-[#3f434a] p-1 rounded hover:bg-[#f6f7f8]"
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

      {/* 5. Custom CSS Accordion (Real Pro Feature) */}
      <div className="overflow-hidden rounded-lg border border-[#ececee]">
        <button
          type="button"
          onClick={() => toggleAcc("css")}
          className="flex w-full items-center justify-between bg-[#fafbfc] px-3 py-2 text-start font-medium text-[#3f434a]"
        >
          <div className="flex items-center gap-1.5">
            <CodeBracketIcon className="h-3.5 w-3.5 text-[#2b6cf6]" />
            <span>تخصيص CSS مباشر (Custom CSS)</span>
          </div>
          <ChevronDownIcon
            className={`h-3.5 w-3.5 text-[#9aa0a8] transition-transform ${
              openAcc.css ? "rotate-180" : ""
            }`}
          />
        </button>

        {openAcc.css && (
          <div className="p-3 bg-white space-y-2">
            <p className="text-[10px] text-[#8a8f96] leading-relaxed">
              أضف قواعد CSS مخصصة تُطبق مباشرة على حاوية هذا السيكشن:
            </p>
            <textarea
              rows={3}
              value={customCss}
              onChange={(e) => onUpdateField("customCss", e.target.value)}
              placeholder="/* مثال: border-top: 1px solid #e2e8f0; */"
              className="w-full rounded-md border border-[#ececee] bg-[#1a1b20] p-2 font-mono text-[10.5px] text-[#e8eaee] placeholder-[#666c77] outline-none focus:border-[#2b6cf6] dir-ltr text-left"
              dir="ltr"
            />
          </div>
        )}
      </div>
    </div>
  );
};
