import React, { useState } from "react";
import { hslTripletToHex, hexToHslTriplet, computeContrastingForeground } from "../utils/hslColorBridge";
import { ARABIC_FONT_DEFINITIONS } from "../../utils/arabicTypography";
import { SwatchIcon, SparklesIcon } from "@heroicons/react/24/outline";

export interface StudioThemeTokensEditorProps {
  tokens?: Record<string, any>;
  onChangeTokens: (updatedTokens: Record<string, any>) => void;
}

const COLOR_METADATA = [
  { key: "primary", label: "الرئيسي (Primary)", fgKey: "primaryForeground", description: "أزرار الشراء والعناصر الأساسية" },
  { key: "secondary", label: "الثانوي (Secondary)", fgKey: "secondaryForeground", description: "الأزرار الثانوية والأشرطة" },
  { key: "accent", label: "التمييز (Accent)", fgKey: "accentForeground", description: "شارات الخصم والتنبيهات" },
  { key: "background", label: "الخلفية (Background)", fgKey: "foreground", description: "لون خلفية الصفحة العامة" },
  { key: "card", label: "البطاقات (Card)", fgKey: "cardForeground", description: "خلفية بطاقات المنتجات والقوائم" },
  { key: "muted", label: "الخافت (Muted)", fgKey: "mutedForeground", description: "النصوص الثانوية والخلفيات الهادئة" },
  { key: "border", label: "الحدود (Border)", description: "خطوط الفصل وإطارات المدخلات" },
  { key: "ring", label: "التركيز (Ring)", description: "إطار التركيز عند النقر والتنقل" },
];

export const StudioThemeTokensEditor: React.FC<StudioThemeTokensEditorProps> = ({ tokens = {}, onChangeTokens }) => {
  const [activeTab, setActiveTab] = useState<"colors" | "typography" | "shapes">("colors");
  const { colors = {}, typography = {}, shape = {}, productCard = {} } = tokens;

  const updateColor = (key: string, nextValue: string, autoFgKey?: string) => {
    const nextColors = { ...colors, [key]: nextValue };
    if (autoFgKey && !colors[autoFgKey]) {
      nextColors[autoFgKey] = computeContrastingForeground(nextValue);
    }
    onChangeTokens({ ...tokens, colors: nextColors });
  };

  const updateTypo = (patch: Record<string, any>) => onChangeTokens({ ...tokens, typography: { ...typography, ...patch } });
  const updateShape = (patch: Record<string, any>) => onChangeTokens({ ...tokens, shape: { ...shape, ...patch } });
  const updateCard = (patch: Record<string, any>) => onChangeTokens({ ...tokens, productCard: { ...productCard, ...patch } });

  return (
    <div className="space-y-3.5 text-xs select-none" data-testid="studio-theme-tokens-editor">
      <div className="flex rounded-xl bg-muted/40 p-1 border border-border/60">
        {[
          { id: "colors", label: "الألوان (14)" },
          { id: "typography", label: "التايبوغرافي" },
          { id: "shapes", label: "الأشكال والبطاقات" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as any)}
            className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all text-center ${
              activeTab === t.id ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "colors" && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>رموز HSL Triplet الرسمية مع تحويل Hex تلقائي</span>
            <SwatchIcon className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-2 max-h-[340px] overflow-y-auto pe-1 [scrollbar-width:thin]">
            {COLOR_METADATA.map((item) => {
              const bgVal = colors[item.key] || "0 0% 50%";
              const hexVal = hslTripletToHex(bgVal);
              const fgVal = item.fgKey ? colors[item.fgKey] || "0 0% 100%" : null;
              const fgHexVal = fgVal ? hslTripletToHex(fgVal) : null;
              return (
                <div key={item.key} className="rounded-xl border border-border/80 bg-background/60 p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-foreground text-[11.5px] block">{item.label}</span>
                      <span className="text-[9.5px] text-muted-foreground">{item.description}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={hexVal}
                        aria-label={item.label}
                        onChange={(e) => updateColor(item.key, hexToHslTriplet(e.target.value), item.fgKey)}
                        className="h-7 w-7 cursor-pointer rounded-lg border border-border bg-transparent p-0"
                      />
                      <input
                        type="text"
                        value={bgVal}
                        onChange={(e) => updateColor(item.key, e.target.value)}
                        placeholder="H S% L%"
                        className="w-24 rounded-md border border-border bg-background px-1.5 py-1 text-[10.5px] font-mono text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                  {item.fgKey && (
                    <div className="flex items-center justify-between pt-1.5 border-t border-border/40 text-[10.5px]">
                      <span className="text-muted-foreground">نص السطح ({item.fgKey})</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          title="حساب التباين تلقائياً"
                          onClick={() => updateColor(item.fgKey!, computeContrastingForeground(bgVal))}
                          className="p-1 rounded text-muted-foreground hover:text-primary transition-colors"
                        >
                          <SparklesIcon className="h-3.5 w-3.5" />
                        </button>
                        <input
                          type="color"
                          value={fgHexVal || "#ffffff"}
                          aria-label={`نص ${item.label}`}
                          onChange={(e) => updateColor(item.fgKey!, hexToHslTriplet(e.target.value))}
                          className="h-5 w-5 cursor-pointer rounded border border-border bg-transparent p-0"
                        />
                        <input
                          type="text"
                          value={fgVal || ""}
                          onChange={(e) => updateColor(item.fgKey!, e.target.value)}
                          placeholder="H S% L%"
                          className="w-20 rounded border border-border bg-background px-1 py-0.5 text-[10px] font-mono text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "typography" && (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-muted-foreground">خط العناوين الرئيسية (Heading Font)</label>
            <select
              value={typography.headingFont || "Cairo"}
              onChange={(e) => updateTypo({ headingFont: e.target.value })}
              className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
            >
              {ARABIC_FONT_DEFINITIONS.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-muted-foreground">خط نصوص المحتوى (Body Font)</label>
            <select
              value={typography.bodyFont || "Tajawal"}
              onChange={(e) => updateTypo({ bodyFont: e.target.value })}
              className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
            >
              {ARABIC_FONT_DEFINITIONS.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-muted-foreground">حجم الخط الأساسي (baseSize)</label>
              <span className="font-mono text-[11px] font-bold text-foreground">{typography.baseSize || "16px"}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {["14px", "15px", "16px", "18px"].map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => updateTypo({ baseSize: sz })}
                  className={`py-1 rounded-lg border text-center font-bold text-[11px] ${
                    (typography.baseSize || "16px") === sz
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-muted-foreground">اتجاه واجهة القالب (Direction)</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: "rtl", label: "يمين إلى يسار (RTL)" },
                { val: "ltr", label: "يسار إلى يمين (LTR)" },
              ].map((d) => (
                <button
                  key={d.val}
                  type="button"
                  onClick={() => updateTypo({ direction: d.val })}
                  className={`py-1.5 rounded-lg border text-center font-bold text-[11px] ${
                    (typography.direction || "rtl") === d.val
                      ? "border-primary bg-primary text-primary-foreground shadow-xs"
                      : "border-border bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "shapes" && (
        <div className="space-y-3.5">
          <div className="space-y-2">
            <h4 className="font-bold text-foreground text-[11.5px]">استدارة الحاويات والأزرار العامة</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">انحناء الحاويات (borderRadius)</label>
                <select
                  value={shape.borderRadius || "1rem"}
                  onChange={(e) => updateShape({ borderRadius: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                >
                  <option value="0rem">حواف حادة (0rem)</option>
                  <option value="0.5rem">انحناء خفيف (0.5rem)</option>
                  <option value="0.75rem">متوسط (0.75rem)</option>
                  <option value="1rem">دائري قياسي (1rem)</option>
                  <option value="1.5rem">فائق الانحناء (1.5rem)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">انحناء الأزرار (buttonRadius)</label>
                <select
                  value={shape.buttonRadius || "999px"}
                  onChange={(e) => updateShape({ buttonRadius: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                >
                  <option value="0.25rem">صغير (0.25rem)</option>
                  <option value="0.5rem">متوسط (0.5rem)</option>
                  <option value="0.75rem">كبير (0.75rem)</option>
                  <option value="999px">كبسولة كاملة (Pill 999px)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-border/50">
            <h4 className="font-bold text-foreground text-[11.5px]">بطاقات المنتجات (Product Card)</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">انحناء البطاقة</label>
                <select
                  value={productCard.borderRadius || "1rem"}
                  onChange={(e) => updateCard({ borderRadius: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                >
                  <option value="0.5rem">0.5rem</option>
                  <option value="0.75rem">0.75rem</option>
                  <option value="1rem">1rem</option>
                  <option value="1.5rem">1.5rem</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">شفافية السطح</label>
                <select
                  value={productCard.surfaceOpacity || "1"}
                  onChange={(e) => updateCard({ surfaceOpacity: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                >
                  <option value="1">100% مصمت</option>
                  <option value="0.95">95% ناعم</option>
                  <option value="0.90">90% خفيف</option>
                  <option value="0.80">80% بلوري</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudioThemeTokensEditor;
