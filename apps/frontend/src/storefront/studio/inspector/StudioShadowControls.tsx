import React from "react";
import {
  parseFreeNumber,
  buildBoxShadowString,
  normalizeArabicDigits,
  DEFAULT_CUSTOM_SHADOW,
} from "../utils/studioStyleUtils";
import { FreeNumberInput } from "./StudioDimensionControls";

interface StudioShadowControlsProps {
  settings: Record<string, any>;
  onUpdateField: (field: string, value: any) => void;
  onBatchUpdateFields?: (updates: Record<string, any>) => void;
}

export const StudioShadowControls: React.FC<StudioShadowControlsProps> = ({
  settings,
  onUpdateField,
  onBatchUpdateFields,
}) => {
  const shadowMode = settings.shadow || "none";

  const x = parseFreeNumber(settings.shadowX, DEFAULT_CUSTOM_SHADOW.x);
  const y = parseFreeNumber(settings.shadowY, DEFAULT_CUSTOM_SHADOW.y);
  const blur = parseFreeNumber(settings.shadowBlur, DEFAULT_CUSTOM_SHADOW.blur);
  const spread = parseFreeNumber(settings.shadowSpread, DEFAULT_CUSTOM_SHADOW.spread);
  const opacity =
    settings.shadowOpacity !== undefined
      ? parseFreeNumber(settings.shadowOpacity, DEFAULT_CUSTOM_SHADOW.opacity)
      : DEFAULT_CUSTOM_SHADOW.opacity;
  const color = settings.shadowColor || DEFAULT_CUSTOM_SHADOW.color;

  const currentComputedShadow = buildBoxShadowString(settings);

  const handleModeChange = (mode: string) => {
    if (mode === "custom") {
      const updates = {
        shadow: "custom",
        shadowX: x,
        shadowY: y,
        shadowBlur: blur,
        shadowSpread: spread,
        shadowOpacity: opacity,
        shadowColor: color,
      };
      if (onBatchUpdateFields) {
        onBatchUpdateFields(updates);
      } else {
        Object.entries(updates).forEach(([k, v]) => onUpdateField(k, v));
      }
    } else {
      onUpdateField("shadow", mode);
    }
  };

  const handleCustomParamChange = (param: string, value: any) => {
    if (onBatchUpdateFields) {
      onBatchUpdateFields({
        shadow: "custom",
        [param]: value,
      });
    } else {
      onUpdateField("shadow", "custom");
      onUpdateField(param, value);
    }
  };

  return (
    <div className="space-y-3">
      {/* 1. Mode Selector */}
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { id: "none", label: "بلا ظل (Flat)" },
          { id: "soft", label: "ناعم (Soft)" },
          { id: "card", label: "بارز (Card)" },
          { id: "custom", label: "مخصص (Custom)" },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleModeChange(item.id)}
            className={`rounded-md border py-1.5 px-2 text-center text-[10.5px] transition-all ${
              shadowMode === item.id
                ? "border-[#2b6cf6] bg-[#2b6cf6]/10 text-[#2b6cf6] font-bold"
                : "border-[#ececee] bg-[#f6f7f8] text-[#6f747b] hover:text-[#17181c]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 2. Custom Shadow Parameters Form */}
      {(shadowMode === "custom" || settings.customShadow) && (
        <div className="rounded-lg border border-[#e2e8f0] bg-[#fafbfc] p-2.5 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <FreeNumberInput
              label="إزاحة X"
              min={-100}
              max={100}
              value={x}
              onChange={(val) => handleCustomParamChange("shadowX", val)}
            />
            <FreeNumberInput
              label="إزاحة Y"
              min={-100}
              max={100}
              value={y}
              onChange={(val) => handleCustomParamChange("shadowY", val)}
            />
            <FreeNumberInput
              label="الضبابية (Blur)"
              min={0}
              max={150}
              value={blur}
              onChange={(val) => handleCustomParamChange("shadowBlur", val)}
            />
            <FreeNumberInput
              label="التمدد (Spread)"
              min={-50}
              max={50}
              value={spread}
              onChange={(val) => handleCustomParamChange("shadowSpread", val)}
            />
          </div>

          {/* Color & Opacity Row */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            {/* Opacity slider & number */}
            <div className="rounded-lg border border-[#ececee] bg-white p-2 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-[#8a8f96]">
                <span>الشفافية</span>
                <span className="font-mono font-bold text-[#17181c]">
                  {Math.round(opacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={opacity}
                onChange={(e) =>
                  handleCustomParamChange("shadowOpacity", parseFloat(e.target.value))
                }
                className="w-full accent-[#2b6cf6] cursor-pointer"
              />
            </div>

            {/* Shadow Color */}
            <div className="rounded-lg border border-[#ececee] bg-white p-2 space-y-1">
              <span className="block text-[10px] text-[#8a8f96]">لون الظل</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={color.startsWith("#") ? color : "#000000"}
                  onChange={(e) => handleCustomParamChange("shadowColor", e.target.value)}
                  className="h-6 w-6 cursor-pointer rounded border border-[#ececee] bg-transparent"
                />
                <input
                  type="text"
                  dir="ltr"
                  value={color}
                  onChange={(e) => {
                    const normalized = normalizeArabicDigits(e.target.value).trim();
                    handleCustomParamChange("shadowColor", normalized);
                  }}
                  className="w-full rounded border border-[#ececee] px-1.5 py-0.5 text-[10px] font-mono text-[#17181c] text-center"
                />
              </div>
            </div>
          </div>

          {/* Visual Preview Swatch */}
          <div className="pt-1 flex items-center justify-between border-t border-[#eeeef0] mt-1">
            <span className="text-[9.5px] text-[#8a8f96]">معاينة الظل:</span>
            <div
              style={{ boxShadow: currentComputedShadow }}
              className="h-6 w-20 rounded bg-white border border-[#e2e8f0] transition-shadow"
            />
          </div>
        </div>
      )}
    </div>
  );
};
