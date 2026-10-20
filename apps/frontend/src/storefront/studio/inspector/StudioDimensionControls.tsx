import React, { useState } from "react";
import { LinkIcon } from "@heroicons/react/24/outline";
import { normalizeArabicDigits, parseFreeNumber } from "../utils/studioStyleUtils";

interface FreeNumberInputProps {
  label: string;
  value: number | string | undefined | null;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  unit?: string;
  type?: "number" | "text";
}

export const FreeNumberInput: React.FC<FreeNumberInputProps> = ({
  label,
  value,
  onChange,
  min = 0,
  max = 1200,
  step = 1,
  placeholder = "0",
  unit = "px",
  type = "number",
}) => {
  const numValue = value !== undefined && value !== null ? parseFreeNumber(value) : "";

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Intercept Arabic numeral keystrokes and convert them to Latin digits
    if (/[٠-٩]/.test(e.key)) {
      e.preventDefault();
      const latinDigit = "٠١٢٣٤٥٦٧٨٩".indexOf(e.key).toString();
      const input = e.currentTarget;
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? input.value.length;
      const nextStr = input.value.substring(0, start) + latinDigit + input.value.substring(end);
      const parsed = parseFloat(nextStr);
      onChange(isNaN(parsed) ? 0 : parsed);
    }
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2.5 py-1.5 focus-within:border-[#2b6cf6] focus-within:bg-white transition-colors">
      <span className="text-[10px] text-[#8a8f96] font-medium shrink-0">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type={type}
          dir="ltr"
          min={min}
          max={max}
          step={step}
          value={numValue}
          placeholder={placeholder}
          onKeyDown={handleKeyDown}
          onChange={(e) => {
            const normalized = normalizeArabicDigits(e.target.value);
            const parsed = normalized === "" ? 0 : parseFloat(normalized);
            onChange(isNaN(parsed) ? 0 : parsed);
          }}
          className="w-14 bg-transparent text-end font-mono text-[11.5px] font-bold text-[#17181c] outline-none tabular-nums"
        />
        <span className="text-[9px] text-[#a0a5ad] font-mono select-none">{unit}</span>
      </div>
    </div>
  );
};

interface StudioPaddingControlProps {
  settings: Record<string, any>;
  onUpdateField: (field: string, value: any) => void;
  onBatchUpdateFields?: (updates: Record<string, any>) => void;
}

export const StudioPaddingControl: React.FC<StudioPaddingControlProps> = ({
  settings,
  onUpdateField,
  onBatchUpdateFields,
}) => {
  const [isLinked, setIsLinked] = useState<boolean>(settings.paddingLinked ?? true);

  const paddingTop = parseFreeNumber(settings.paddingTop ?? settings.padding, 24);
  const paddingBottom = parseFreeNumber(settings.paddingBottom ?? settings.padding, 24);
  const paddingRight = parseFreeNumber(settings.paddingRight ?? settings.padding, 32);
  const paddingLeft = parseFreeNumber(settings.paddingLeft ?? settings.padding, 32);

  const handleUpdate = (direction: "top" | "bottom" | "right" | "left", val: number) => {
    if (isLinked) {
      const updates = {
        paddingTop: val,
        paddingBottom: val,
        paddingRight: val,
        paddingLeft: val,
        padding: val,
        paddingLinked: true,
      };
      if (onBatchUpdateFields) {
        onBatchUpdateFields(updates);
      } else {
        Object.entries(updates).forEach(([k, v]) => onUpdateField(k, v));
      }
    } else {
      const fieldName =
        direction === "top"
          ? "paddingTop"
          : direction === "bottom"
          ? "paddingBottom"
          : direction === "right"
          ? "paddingRight"
          : "paddingLeft";
      onUpdateField(fieldName, val);
    }
  };

  const handleToggleLinked = () => {
    const nextLinked = !isLinked;
    setIsLinked(nextLinked);
    onUpdateField("paddingLinked", nextLinked);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-[#3f434a]">الحشوة الداخلية (Padding)</span>
        <button
          type="button"
          onClick={handleToggleLinked}
          className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9.5px] font-medium transition-colors ${
            isLinked
              ? "bg-[#2b6cf6]/10 text-[#2b6cf6] font-bold"
              : "bg-[#ececee] text-[#7a7f87] hover:text-[#17181c]"
          }`}
          title={isLinked ? "القيم مرتبطة: التعديل يسري على جميع الاتجاهات" : "القيم منفصلة: كل اتجاه مستقل"}
        >
          <LinkIcon className="h-3 w-3" />
          <span>{isLinked ? "قيم موحدة" : "قيم منفصلة"}</span>
        </button>
      </div>

      {isLinked ? (
        <FreeNumberInput
          label="موحد (كل الاتجاهات)"
          value={paddingTop}
          onChange={(val) => handleUpdate("top", val)}
        />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <FreeNumberInput
            label="أعلى"
            value={paddingTop}
            onChange={(val) => handleUpdate("top", val)}
          />
          <FreeNumberInput
            label="أسفل"
            value={paddingBottom}
            onChange={(val) => handleUpdate("bottom", val)}
          />
          <FreeNumberInput
            label="يمين"
            value={paddingRight}
            onChange={(val) => handleUpdate("right", val)}
          />
          <FreeNumberInput
            label="يسار"
            value={paddingLeft}
            onChange={(val) => handleUpdate("left", val)}
          />
        </div>
      )}

      {/* Quick presets for rapid adjustments */}
      <div className="flex items-center gap-1 pt-0.5">
        {[
          { label: "مضغوط (16)", val: 16 },
          { label: "قياسي (32)", val: 32 },
          { label: "واسع (64)", val: 64 },
        ].map((preset) => (
          <button
            key={preset.val}
            type="button"
            onClick={() => handleUpdate("top", preset.val)}
            className="flex-1 rounded border border-[#ececee] bg-[#fafbfc] py-1 text-center text-[9.5px] text-[#6f747b] hover:bg-[#f0f2f5] hover:text-[#17181c] transition-colors"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
};

interface StudioMarginControlProps {
  settings: Record<string, any>;
  onUpdateField: (field: string, value: any) => void;
}

export const StudioMarginControl: React.FC<StudioMarginControlProps> = ({
  settings,
  onUpdateField,
}) => {
  const marginTop = parseFreeNumber(settings.marginTop, 0);
  const marginBottom = parseFreeNumber(settings.marginBottom, 0);

  return (
    <div className="space-y-2">
      <span className="block text-[10px] font-bold text-[#3f434a]">الهامش الخارجي (Margin)</span>
      <div className="grid grid-cols-2 gap-2">
        <FreeNumberInput
          label="أعلى"
          value={marginTop}
          onChange={(val) => onUpdateField("marginTop", val)}
        />
        <FreeNumberInput
          label="أسفل"
          value={marginBottom}
          onChange={(val) => onUpdateField("marginBottom", val)}
        />
      </div>
    </div>
  );
};

interface StudioDimensionsLayoutControlProps {
  settings: Record<string, any>;
  onUpdateField: (field: string, value: any) => void;
}

export const StudioDimensionsLayoutControl: React.FC<StudioDimensionsLayoutControlProps> = ({
  settings,
  onUpdateField,
}) => {
  const minHeight = parseFreeNumber(settings.minHeight, 0);
  const gap = parseFreeNumber(settings.gap, 0);

  return (
    <div className="space-y-2.5">
      <div className="space-y-1.5">
        <span className="block text-[10px] font-bold text-[#3f434a]">الارتفاع الأدنى (Min-Height)</span>
        <FreeNumberInput
          label="الارتفاع الأدنى"
          value={minHeight}
          placeholder="تلقائي (auto)"
          onChange={(val) => onUpdateField("minHeight", val)}
        />
        <div className="flex items-center gap-1 pt-0.5">
          {[
            { label: "تلقائي", val: 0 },
            { label: "320px", val: 320 },
            { label: "480px", val: 480 },
            { label: "640px", val: 640 },
          ].map((preset) => (
            <button
              key={preset.val}
              type="button"
              onClick={() => onUpdateField("minHeight", preset.val)}
              className={`flex-1 rounded border py-1 text-center text-[9.5px] transition-colors ${
                minHeight === preset.val
                  ? "border-[#2b6cf6] bg-[#2b6cf6]/10 text-[#2b6cf6] font-bold"
                  : "border-[#ececee] bg-[#fafbfc] text-[#6f747b] hover:text-[#17181c]"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="block text-[10px] font-bold text-[#3f434a]">فجوة الشبكة (Grid Gap)</span>
        <FreeNumberInput
          label="فجوة العناصر"
          value={gap}
          placeholder="0"
          onChange={(val) => onUpdateField("gap", val)}
        />
      </div>
    </div>
  );
};
