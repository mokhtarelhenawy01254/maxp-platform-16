import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, ChevronDown } from "lucide-react";

export type CustomerLifecycleStrategy = "ALL_AUDIENCES" | "NEW_CUSTOMERS";

interface CustomerLifecycleStrategySelectorProps {
  value?: CustomerLifecycleStrategy;
  onChange: (strategy: CustomerLifecycleStrategy) => void;
  className?: string;
}

export const CustomerLifecycleStrategySelector: React.FC<CustomerLifecycleStrategySelectorProps> = ({
  value = "ALL_AUDIENCES",
  onChange,
  className = "",
}) => {
  const { i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith("en"));
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const options: Array<{
    id: CustomerLifecycleStrategy;
    title: string;
    description: string;
  }> = [
    {
      id: "ALL_AUDIENCES",
      title: isEn
        ? "Get conversions from all audiences"
        : "الحصول على تحويلات من كل الجماهير",
      description: isEn
        ? "Choose this option if you want to get conversions at a lower cost per result. You can include or exclude custom audiences in your audience settings for this ad set or your ad settings."
        : "اختر هذا الخيار إذا كنت تريد الحصول على تحويلات بتكلفة أقل لكل نتيجة. يمكنك تضمين الجماهير المخصصة أو استبعادها في إعدادات الجمهور لهذه المجموعة الإعلانية أو إعدادات الإعلانات لديك.",
    },
    {
      id: "NEW_CUSTOMERS",
      title: isEn ? "Acquire new customers" : "اكتساب عملاء جدد",
      description: isEn
        ? "Choose this option if conversions from people who have never made a purchase provide high value to your business. This may increase the cost per result."
        : "اختر هذا الخيار إذا كانت التحويلات من الأشخاص الذين لم يقوموا مطلقًا بإجراء عملية شراء تحقق قيمة كبرى لنشاطك التجاري. قد يؤدي هذا إلى زيادة التكلفة لكل نتيجة.",
    },
  ];

  const selectedOption = options.find((opt) => opt.id === value) || options[0];

  return (
    <div
      ref={containerRef}
      className={`space-y-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 p-4 transition-colors ${className}`}
    >
      {/* Title & Subtitle Header */}
      <div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">
            {isEn ? "Customer Lifecycle Strategy" : "استراتيجية دورة حياة العميل"}
          </h4>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {isEn
            ? "You can prioritize conversions from people who provide the most value to your business."
            : "يمكنك وضع أولوية للتحويلات من الأشخاص الذين يقدمون أكبر قيمة لنشاطك التجاري."}
        </p>
      </div>

      {/* Dropdown / Select Input Trigger */}
      <div className="relative pt-1">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="w-full flex items-center justify-between rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white hover:border-emerald-500 dark:hover:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-start"
          aria-expanded={isOpen}
        >
          <span className="font-medium truncate">{selectedOption.title}</span>
          <ChevronDown
            className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 shrink-0 ${
              isOpen ? "rotate-180" : ""
            } ${isEn ? "ml-2" : "mr-2"}`}
          />
        </button>

        {/* Dropdown Options Container (matching Meta Ads Manager UI) */}
        {isOpen && (
          <div className="mt-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/60 z-20">
            {options.map((option) => {
              const isSelected = option.id === value;
              return (
                <div
                  key={option.id}
                  onClick={() => {
                    onChange(option.id);
                    setIsOpen(false);
                  }}
                  className={`p-3.5 cursor-pointer transition-colors flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    isSelected
                      ? "bg-emerald-50/40 dark:bg-emerald-950/20"
                      : ""
                  }`}
                >
                  <div className="pt-0.5 shrink-0">
                    <input
                      type="radio"
                      name="customerLifecycleStrategy"
                      checked={isSelected}
                      onChange={() => {
                        onChange(option.id);
                        setIsOpen(false);
                      }}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                      {option.title}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                      {option.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerLifecycleStrategySelector;
