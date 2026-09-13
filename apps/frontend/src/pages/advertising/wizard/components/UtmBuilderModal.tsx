import React, { useState } from "react";
import { Link2, Sparkles, Check, Copy, HelpCircle, X } from "lucide-react";

interface UtmBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentValue: string;
  onApply: (val: string) => void;
}

const META_MACROS = [
  { macro: "{{site_source_name}}", label: "مصدر الموقع (fb / ig)" },
  { macro: "{{placement}}", label: "موضع الظهور (Placement)" },
  { macro: "{{campaign.name}}", label: "اسم الحملة" },
  { macro: "{{campaign.id}}", label: "معرف الحملة (ID)" },
  { macro: "{{adset.name}}", label: "اسم المجموعة الإعلانية" },
  { macro: "{{adset.id}}", label: "معرف المجموعة (ID)" },
  { macro: "{{ad.name}}", label: "اسم الإعلان" },
  { macro: "{{ad.id}}", label: "معرف الإعلان (ID)" },
];

const PRESETS = [
  {
    name: "Google Analytics 4 (موصى به)",
    value: "utm_source={{site_source_name}}&utm_medium={{placement}}&utm_campaign={{campaign.name}}&utm_content={{ad.name}}",
    desc: "تتبع كامل للقناة، الموضع، واسم الحملة والإعلان تلقائياً.",
  },
  {
    name: "تتبع سريع وبسيط",
    value: "utm_source=facebook&utm_medium=paid_social&utm_campaign={{campaign.name}}",
    desc: "للحملات المباشرة لمعرفة الزيارات العامة من فيسبوك.",
  },
  {
    name: "تتبع دقيق بالمعرفات (ID-based)",
    value: "utm_source={{site_source_name}}&utm_medium={{placement}}&utm_campaign={{campaign.id}}&utm_content={{ad.id}}",
    desc: "مثالي للأنظمة البرمجية التي تربط الطلبات بمعرفات الإعلانات الرقمية.",
  },
];

export const UtmBuilderModal: React.FC<UtmBuilderModalProps> = ({
  isOpen,
  onClose,
  currentValue,
  onApply,
}) => {
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
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                مُنشئ معلمات التتبع الديناميكية (UTM Builder)
              </h3>
              <p className="text-[11px] text-gray-500">
                استخدم رموز فيسبوك التلقائية (Dynamic Macros) لتحليل مسار الزيارات بدقة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-right">
          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-2">
              قوالب جاهزة سريعة (Presets)
            </label>
            <div className="space-y-2">
              {PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setParams(preset.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50/40 text-right transition-all flex items-start justify-between group"
                >
                  <div>
                    <div className="text-xs font-semibold text-gray-900 group-hover:text-blue-700">
                      {preset.name}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      {preset.desc}
                    </div>
                    <code className="text-[10px] text-slate-600 bg-gray-100 px-1.5 py-0.5 rounded mt-1 inline-block font-mono">
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
            <label className="block text-xs font-bold text-gray-800 mb-2">
              رموز Meta الديناميكية (انقر للإدراج)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {META_MACROS.map((item) => (
                <button
                  key={item.macro}
                  type="button"
                  onClick={() => insertMacro(item.macro)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-500 hover:text-blue-700 text-gray-700 font-mono transition-all"
                  title={item.label}
                >
                  + {item.macro}
                </button>
              ))}
            </div>
          </div>

          {/* Value Input */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1.5">
              قيمة المعلمات الحالية (URL Parameters)
            </label>
            <textarea
              rows={3}
              value={params}
              onChange={(e) => setParams(e.target.value)}
              placeholder="utm_source={{site_source_name}}&utm_campaign={{campaign.name}}"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              dir="ltr"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setParams("")}
            className="text-xs text-gray-500 hover:text-red-600 font-medium"
          >
            مسح
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200/70 rounded-lg transition-colors"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              تطبيق المعلمات
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
