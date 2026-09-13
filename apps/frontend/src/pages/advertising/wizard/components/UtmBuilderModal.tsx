import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link2, Sparkles, Check, X } from "lucide-react";

interface UtmBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentValue: string;
  onApply: (val: string) => void;
}

const getMetaMacros = (isEn: boolean) => [
  { macro: "{{site_source_name}}", label: isEn ? "Site source (fb / ig)" : "مصدر الموقع (fb / ig)" },
  { macro: "{{placement}}", label: isEn ? "Placement" : "موضع الظهور (Placement)" },
  { macro: "{{campaign.name}}", label: isEn ? "Campaign Name" : "اسم الحملة" },
  { macro: "{{campaign.id}}", label: isEn ? "Campaign ID" : "معرف الحملة (ID)" },
  { macro: "{{adset.name}}", label: isEn ? "Ad Set Name" : "اسم المجموعة الإعلانية" },
  { macro: "{{adset.id}}", label: isEn ? "Ad Set ID" : "معرف المجموعة (ID)" },
  { macro: "{{ad.name}}", label: isEn ? "Ad Name" : "اسم الإعلان" },
  { macro: "{{ad.id}}", label: isEn ? "Ad ID" : "معرف الإعلان (ID)" },
];

const getPresets = (isEn: boolean) => [
  {
    name: isEn ? "Google Analytics 4 (Recommended)" : "Google Analytics 4 (موصى به)",
    value: "utm_source={{site_source_name}}&utm_medium={{placement}}&utm_campaign={{campaign.name}}&utm_content={{ad.name}}",
    desc: isEn
      ? "Full tracking for channel, placement, campaign, and ad name automatically."
      : "تتبع كامل للقناة، الموضع، واسم الحملة والإعلان تلقائياً.",
  },
  {
    name: isEn ? "Simple & Quick Tracking" : "تتبع سريع وبسيط",
    value: "utm_source=facebook&utm_medium=paid_social&utm_campaign={{campaign.name}}",
    desc: isEn
      ? "For direct campaigns to monitor overall traffic from Facebook."
      : "للحملات المباشرة لمعرفة الزيارات العامة من فيسبوك.",
  },
  {
    name: isEn ? "Precise ID-based Tracking" : "تتبع دقيق بالمعرفات (ID-based)",
    value: "utm_source={{site_source_name}}&utm_medium={{placement}}&utm_campaign={{campaign.id}}&utm_content={{ad.id}}",
    desc: isEn
      ? "Ideal for backend systems matching orders to numeric ad IDs."
      : "مثالي للأنظمة البرمجية التي تربط الطلبات بمعرفات الإعلانات الرقمية.",
  },
];

export const UtmBuilderModal: React.FC<UtmBuilderModalProps> = ({
  isOpen,
  onClose,
  currentValue,
  onApply,
}) => {
  const { i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith("en"));

  const metaMacros = React.useMemo(() => getMetaMacros(isEn), [isEn]);
  const presets = React.useMemo(() => getPresets(isEn), [isEn]);

  const [params, setParams] = useState(currentValue || "");

  if (!isOpen) return null;

  const insertMacro = (macro: string) => {
    setParams((prev) => (prev ? `${prev}&param=${macro}` : macro));
  };

  const handleApply = () => {
    onApply(params);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        dir={isEn ? "ltr" : "rtl"}
        className="bg-white dark:bg-gray-800 w-full max-w-xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-lg">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                {isEn
                  ? "Dynamic URL Parameter Builder (UTM Builder)"
                  : "مُنشئ معلمات التتبع الديناميكية (UTM Builder)"}
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {isEn
                  ? "Use Meta dynamic macros to accurately analyze traffic acquisition paths"
                  : "استخدم رموز فيسبوك التلقائية (Dynamic Macros) لتحليل مسار الزيارات بدقة"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className={`p-5 space-y-4 max-h-[75vh] overflow-y-auto ${isEn ? "text-left" : "text-right"}`}>
          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-2">
              {isEn ? "Quick Presets" : "قوالب جاهزة سريعة (Presets)"}
            </label>
            <div className="space-y-2">
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setParams(preset.value)}
                  className={`w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-950/30 ${isEn ? "text-left" : "text-right"} transition-all flex items-start justify-between group`}
                >
                  <div>
                    <div className="text-xs font-semibold text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400">
                      {preset.name}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {preset.desc}
                    </div>
                    <code className="text-[10px] text-slate-600 dark:text-slate-300 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded mt-1 inline-block font-mono">
                      {preset.value}
                    </code>
                  </div>
                  <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Macro Chips */}
          <div>
            <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-2">
              {isEn
                ? "Meta Dynamic Macros (Click to insert)"
                : "رموز Meta الديناميكية (انقر للإدراج)"}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {metaMacros.map((item) => (
                <button
                  key={item.macro}
                  type="button"
                  onClick={() => insertMacro(item.macro)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/60 hover:bg-white dark:hover:bg-slate-700 hover:border-blue-500 hover:text-blue-700 dark:hover:text-blue-400 text-gray-700 dark:text-gray-300 font-mono transition-all"
                  title={item.label}
                >
                  + {item.macro}
                </button>
              ))}
            </div>
          </div>

          {/* Value Input */}
          <div>
            <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1.5">
              {isEn
                ? "Current URL Parameters"
                : "قيمة المعلمات الحالية (URL Parameters)"}
            </label>
            <textarea
              rows={3}
              value={params}
              onChange={(e) => setParams(e.target.value)}
              placeholder="utm_source={{site_source_name}}&utm_campaign={{campaign.name}}"
              className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              dir="ltr"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 dark:bg-slate-900/40 border-t border-gray-100 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setParams("")}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 font-medium"
          >
            {isEn ? "Clear" : "مسح"}
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200/70 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {isEn ? "Cancel" : "إلغاء"}
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              {isEn ? "Apply Parameters" : "تطبيق المعلمات"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
