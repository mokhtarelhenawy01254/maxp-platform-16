import React from "react";

interface StudioInspectorLayoutTabProps {
  settings: Record<string, any>;
  onUpdateField: (field: string, value: any) => void;
}

export const StudioInspectorLayoutTab: React.FC<StudioInspectorLayoutTabProps> = ({
  settings,
  onUpdateField,
}) => {
  const paddingTop = settings.paddingTop ?? 24;
  const paddingBottom = settings.paddingBottom ?? 24;
  const paddingRight = settings.paddingRight ?? 32;
  const paddingLeft = settings.paddingLeft ?? 32;

  const align = settings.align || "right";
  const spacingPreset = settings.spacing || "normal";

  return (
    <div className="space-y-3.5 select-none text-[11.5px] text-[#17181c]">
      {/* 1. Visual Padding Grid */}
      <div className="overflow-hidden rounded-lg border border-[#ececee] p-3 bg-white">
        <span className="block text-[10.5px] font-bold text-[#3f434a] mb-2.5">
          الحشوة الداخلية (Padding - px)
        </span>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center justify-between rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2.5 py-1.5">
            <span className="text-[10px] text-[#8a8f96]">أعلى</span>
            <input
              type="number"
              value={paddingTop}
              onChange={(e) => onUpdateField("paddingTop", Number(e.target.value))}
              className="w-12 bg-transparent text-end font-mono text-[11.5px] font-bold text-[#17181c] outline-none"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2.5 py-1.5">
            <span className="text-[10px] text-[#8a8f96]">أسفل</span>
            <input
              type="number"
              value={paddingBottom}
              onChange={(e) => onUpdateField("paddingBottom", Number(e.target.value))}
              className="w-12 bg-transparent text-end font-mono text-[11.5px] font-bold text-[#17181c] outline-none"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2.5 py-1.5">
            <span className="text-[10px] text-[#8a8f96]">يمين</span>
            <input
              type="number"
              value={paddingRight}
              onChange={(e) => onUpdateField("paddingRight", Number(e.target.value))}
              className="w-12 bg-transparent text-end font-mono text-[11.5px] font-bold text-[#17181c] outline-none"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2.5 py-1.5">
            <span className="text-[10px] text-[#8a8f96]">يسار</span>
            <input
              type="number"
              value={paddingLeft}
              onChange={(e) => onUpdateField("paddingLeft", Number(e.target.value))}
              className="w-12 bg-transparent text-end font-mono text-[11.5px] font-bold text-[#17181c] outline-none"
            />
          </div>
        </div>
      </div>

      {/* 2. Container Alignment */}
      <div className="overflow-hidden rounded-lg border border-[#ececee] p-3 bg-white space-y-2">
        <span className="block text-[10.5px] font-bold text-[#3f434a]">
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
              className={`flex-1 rounded-md py-1 text-center text-[11px] font-medium transition-all ${
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

      {/* 3. Spacing Presets */}
      <div className="overflow-hidden rounded-lg border border-[#ececee] p-3 bg-white space-y-2">
        <span className="block text-[10.5px] font-bold text-[#3f434a]">
          المسافات الرأسية العامة (Vertical Spacing)
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { id: "compact", label: "مضغوط" },
            { id: "normal", label: "قياسي" },
            { id: "spacious", label: "واسع" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onUpdateField("spacing", item.id)}
              className={`rounded-lg border py-1.5 text-center text-[11px] transition-all ${
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
  );
};
