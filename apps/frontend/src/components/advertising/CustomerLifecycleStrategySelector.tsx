import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, ChevronDown, Target } from "lucide-react";
import { cn } from "@/lib/utils";

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
      className={cn(
        "space-y-2.5 rounded-xl border border-border/70 bg-card p-4 shadow-2xs text-foreground transition-all select-none",
        className,
      )}
    >
      {/* Title & Subtitle Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20">
            <Target className="size-3.5" />
          </span>
          <h4 className="text-xs sm:text-sm font-semibold text-foreground">
            {isEn ? "Customer Lifecycle Strategy" : "استراتيجية دورة حياة العميل"}
          </h4>
        </div>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          {isEn
            ? "You can prioritize conversions from people who provide the most value to your business."
            : "يمكنك وضع أولوية للتحويلات من الأشخاص الذين يقدمون أكبر قيمة لنشاطك التجاري."}
        </p>
      </div>

      {/* Dropdown / Select Input Trigger */}
      <div className="relative pt-0.5">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="w-full flex items-center justify-between rounded-lg border border-border/70 bg-background px-3.5 py-2.5 text-xs sm:text-sm text-foreground hover:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all text-start shadow-2xs cursor-pointer active:scale-[0.99]"
          aria-expanded={isOpen}
        >
          <span className="font-medium truncate">{selectedOption.title}</span>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-200 shrink-0",
              isOpen && "rotate-180",
              isEn ? "ml-2" : "mr-2",
            )}
          />
        </button>

        {/* Dropdown Options Container */}
        {isOpen && (
          <div className="mt-1.5 rounded-xl border border-border/70 bg-card shadow-lg overflow-hidden divide-y divide-border/40 z-20 animate-in fade-in-0 zoom-in-95 duration-100">
            {options.map((option) => {
              const isSelected = option.id === value;
              return (
                <div
                  key={option.id}
                  onClick={() => {
                    onChange(option.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "p-3.5 cursor-pointer transition-colors flex items-start gap-3",
                    isSelected
                      ? "bg-primary/5 text-foreground"
                      : "hover:bg-muted/40 text-foreground",
                  )}
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
                      className="size-4 text-primary focus:ring-primary border-border cursor-pointer accent-primary"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm font-semibold text-foreground leading-tight">
                      {option.title}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
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
