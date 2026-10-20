import React, { useState } from "react";
import {
  ChevronDownIcon,
  CodeBracketIcon,
  PaintBrushIcon,
  Square3Stack3DIcon,
  SparklesIcon,
  LanguageIcon,
} from "@heroicons/react/24/outline";
import type { StudioDeviceMode } from "../StudioTypes";
import {
  StudioPaddingControl,
  StudioMarginControl,
  StudioDimensionsLayoutControl,
  FreeNumberInput,
} from "./StudioDimensionControls";
import { StudioShadowControls } from "./StudioShadowControls";
import { normalizeArabicDigits, parseFreeNumber } from "../utils/studioStyleUtils";

interface StudioInspectorDesignTabProps {
  sectionType: string;
  settings: Record<string, any>;
  deviceMode?: StudioDeviceMode;
  onUpdateField: (field: string, value: any) => void;
  onBatchUpdateFields?: (updates: Record<string, any>) => void;
}

export const StudioInspectorDesignTab: React.FC<StudioInspectorDesignTabProps> = ({
  sectionType,
  settings,
  deviceMode = "desktop",
  onUpdateField,
  onBatchUpdateFields,
}) => {
  const [openAcc, setOpenAcc] = useState<{ [key: string]: boolean }>({
    fill: true,
    corners: true,
    shadow: true,
    spacing: false,
    layout: false,
    typography: false,
    css: Boolean(settings.customCss),
  });

  const toggleAcc = (key: string) => {
    setOpenAcc((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const currentColor = settings.backgroundColor || settings.bgColor || "#ffffff";
  const customCss = settings.customCss || "";

  // Border radius numeric resolution
  const currentRadiusNum = parseFreeNumber(
    settings.borderRadius === "none"
      ? 0
      : settings.borderRadius === "small"
      ? 8
      : settings.borderRadius === "medium"
      ? 16
      : settings.borderRadius === "large"
      ? 24
      : settings.borderRadius,
    0
  );

  const colorSwatches = [
    { label: "أبيض ناصع", val: "#ffffff" },
    { label: "كريمي دافئ", val: "#fdfbf7" },
    { label: "رمادي فاخر", val: "#f8fafc" },
    { label: "كحلي هادئ", val: "#0f172a" },
    { label: "طوبي أنيق", val: "#b4552d" },
  ];

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = normalizeArabicDigits(e.target.value).trim();
    if (val && !val.startsWith("#") && /^[0-9a-fA-F]+$/.test(val)) {
      val = "#" + val;
    }
    onUpdateField("backgroundColor", val);
  };

  return (
    <div className="space-y-3 select-none text-[11.5px] text-[#17181c]">
      {/* 1. Accordion: خلفية (Fill & Background) */}
      <div className="overflow-hidden rounded-lg border border-[#ececee]">
        <button
          type="button"
          onClick={() => toggleAcc("fill")}
          className="flex w-full items-center justify-between bg-[#fafbfc] px-3 py-2 text-start font-medium text-[#3f434a]"
        >
          <div className="flex items-center gap-1.5 font-bold">
            <PaintBrushIcon className="h-3.5 w-3.5 text-[#2b6cf6]" />
            <span>خلفية القسم (Background)</span>
          </div>
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
              <span className="text-[10px] text-[#8a8f96]">لون مخصص (HEX):</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  dir="ltr"
                  value={currentColor}
                  placeholder="#ffffff"
                  onChange={handleHexChange}
                  className="w-20 rounded border border-[#ececee] px-1.5 py-0.5 text-[10.5px] font-mono text-[#17181c] text-center tabular-nums"
                />
                <input
                  type="color"
                  value={
                    currentColor.startsWith("#") && currentColor.length === 7
                      ? currentColor
                      : "#ffffff"
                  }
                  onChange={(e) => onUpdateField("backgroundColor", e.target.value)}
                  className="h-6 w-7 cursor-pointer rounded border border-[#ececee] bg-transparent"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Accordion: حدود واستدارة (Borders & Radius) */}
      <div className="overflow-hidden rounded-lg border border-[#ececee]">
        <button
          type="button"
          onClick={() => toggleAcc("corners")}
          className="flex w-full items-center justify-between bg-[#fafbfc] px-3 py-2 text-start font-medium text-[#3f434a]"
        >
          <div className="flex items-center gap-1.5 font-bold">
            <Square3Stack3DIcon className="h-3.5 w-3.5 text-[#2b6cf6]" />
            <span>حدود واستدارة الزوايا (Radius)</span>
          </div>
          <ChevronDownIcon
            className={`h-3.5 w-3.5 text-[#9aa0a8] transition-transform ${
              openAcc.corners ? "rotate-180" : ""
            }`}
          />
        </button>

        {openAcc.corners && (
          <div className="p-3 bg-white space-y-2.5">
            <FreeNumberInput
              label="استدارة الزوايا (px)"
              value={currentRadiusNum}
              min={0}
              max={100}
              placeholder="0"
              onChange={(val) => onUpdateField("borderRadius", val)}
            />

            <div className="grid grid-cols-4 gap-1 pt-0.5">
              {[
                { label: "0px", val: 0 },
                { label: "8px", val: 8 },
                { label: "16px", val: 16 },
                { label: "24px", val: 24 },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => onUpdateField("borderRadius", opt.val)}
                  className={`rounded border py-1 text-center text-[9.5px] transition-all ${
                    currentRadiusNum === opt.val
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

      {/* 3. Accordion: تأثيرات وظلال (Effects & Shadows) */}
      <div className="overflow-hidden rounded-lg border border-[#ececee]">
        <button
          type="button"
          onClick={() => toggleAcc("shadow")}
          className="flex w-full items-center justify-between bg-[#fafbfc] px-3 py-2 text-start font-medium text-[#3f434a]"
        >
          <div className="flex items-center gap-1.5 font-bold">
            <SparklesIcon className="h-3.5 w-3.5 text-[#2b6cf6]" />
            <span>تأثيرات وظلال مخصصة (Shadows)</span>
          </div>
          <ChevronDownIcon
            className={`h-3.5 w-3.5 text-[#9aa0a8] transition-transform ${
              openAcc.shadow ? "rotate-180" : ""
            }`}
          />
        </button>

        {openAcc.shadow && (
          <div className="p-3 bg-white">
            <StudioShadowControls
              settings={settings}
              onUpdateField={onUpdateField}
              onBatchUpdateFields={onBatchUpdateFields}
            />
          </div>
        )}
      </div>

      {/* 4. Accordion: مسافات (Spacing & Padding) */}
      <div className="overflow-hidden rounded-lg border border-[#ececee]">
        <button
          type="button"
          onClick={() => toggleAcc("spacing")}
          className="flex w-full items-center justify-between bg-[#fafbfc] px-3 py-2 text-start font-medium text-[#3f434a]"
        >
          <span>المسافات والحشوة (Spacing)</span>
          <ChevronDownIcon
            className={`h-3.5 w-3.5 text-[#9aa0a8] transition-transform ${
              openAcc.spacing ? "rotate-180" : ""
            }`}
          />
        </button>

        {openAcc.spacing && (
          <div className="p-3 bg-white space-y-3">
            <StudioPaddingControl
              settings={settings}
              onUpdateField={onUpdateField}
              onBatchUpdateFields={onBatchUpdateFields}
            />
            <div className="border-t border-[#f0f1f3] pt-2">
              <StudioMarginControl
                settings={settings}
                onUpdateField={onUpdateField}
              />
            </div>
          </div>
        )}
      </div>

      {/* 5. Accordion: تخطيط ومقاسات (Layout & Dimensions) */}
      <div className="overflow-hidden rounded-lg border border-[#ececee]">
        <button
          type="button"
          onClick={() => toggleAcc("layout")}
          className="flex w-full items-center justify-between bg-[#fafbfc] px-3 py-2 text-start font-medium text-[#3f434a]"
        >
          <span>التخطيط والمقاسات (Dimensions)</span>
          <ChevronDownIcon
            className={`h-3.5 w-3.5 text-[#9aa0a8] transition-transform ${
              openAcc.layout ? "rotate-180" : ""
            }`}
          />
        </button>

        {openAcc.layout && (
          <div className="p-3 bg-white">
            <StudioDimensionsLayoutControl
              settings={settings}
              onUpdateField={onUpdateField}
            />
          </div>
        )}
      </div>

      {/* 6. Accordion: طباعة ونصوص (Typography) */}
      <div className="overflow-hidden rounded-lg border border-[#ececee]">
        <button
          type="button"
          onClick={() => toggleAcc("typography")}
          className="flex w-full items-center justify-between bg-[#fafbfc] px-3 py-2 text-start font-medium text-[#3f434a]"
        >
          <div className="flex items-center gap-1.5 font-bold">
            <LanguageIcon className="h-3.5 w-3.5 text-[#2b6cf6]" />
            <span>طباعة ونصوص (Typography)</span>
          </div>
          <ChevronDownIcon
            className={`h-3.5 w-3.5 text-[#9aa0a8] transition-transform ${
              openAcc.typography ? "rotate-180" : ""
            }`}
          />
        </button>

        {openAcc.typography && (
          <div className="p-3 bg-white space-y-2">
            <span className="block text-[10px] font-bold text-[#8a8f96]">
              محاذاة النصوص
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
                    (settings.align || "right") === item.id
                      ? "bg-white text-[#2b6cf6] shadow-xs font-bold"
                      : "text-[#6f747b] hover:text-[#17181c]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 7. Accordion: Custom CSS */}
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
            <p className="text-[9.5px] text-[#8a8f96] leading-relaxed">
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
