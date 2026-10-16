import React from "react";
import { Repeat, Calendar, Check, Clock } from "lucide-react";

export interface RecurringConfig {
  enabled: boolean;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  daysOfWeek: number[];
  dayOfMonth: number;
  endType: "never" | "date" | "count";
  endDate: string;
  endCount: number;
}

interface RecurringTaskFormProps {
  value: RecurringConfig;
  onChange: (config: RecurringConfig) => void;
}

const RecurringTaskForm: React.FC<RecurringTaskFormProps> = ({
  value,
  onChange,
}) => {
  const dayNames = [
    "الأحد",
    "الإثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
    "السبت",
  ];

  const handleChange = (field: keyof RecurringConfig, newValue: any) => {
    onChange({ ...value, [field]: newValue });
  };

  const toggleDayOfWeek = (day: number) => {
    const newDays = value.daysOfWeek.includes(day)
      ? value.daysOfWeek.filter((d) => d !== day)
      : [...value.daysOfWeek, day];
    handleChange("daysOfWeek", newDays);
  };

  const getFrequencyText = () => {
    switch (value.frequency) {
      case "daily":
        return value.interval === 1 ? "كل يوم" : `كل ${value.interval} أيام`;
      case "weekly":
        return value.interval === 1
          ? "كل أسبوع"
          : `كل ${value.interval} أسابيع`;
      case "monthly":
        return value.interval === 1 ? "كل شهر" : `كل ${value.interval} أشهر`;
      case "yearly":
        return value.interval === 1 ? "كل سنة" : `كل ${value.interval} سنوات`;
      default:
        return "";
    }
  };

  const getEndText = () => {
    switch (value.endType) {
      case "never":
        return "بدون نهاية زمنية";
      case "date":
        return `حتى تاريخ ${value.endDate}`;
      case "count":
        return `بعد ${value.endCount} مرات`;
      default:
        return "";
    }
  };

  return (
    <div className="bg-card border border-border/70 rounded-xl p-4 text-foreground space-y-4">
      {/* Header with Switch */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Repeat className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-foreground">
              تكرار المهمة تلقائياً
            </h4>
            <p className="text-[11px] text-muted-foreground">
              جدولة إعادة توليد هذه المهمة بجدول زمني منتظم
            </p>
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(e) => handleChange("enabled", e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-background after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
        </label>
      </div>

      {value.enabled && (
        <div className="space-y-4 pt-3 border-t border-border/60">
          {/* Frequency Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-foreground">
              دورة التكرار
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: "daily", label: "يومي" },
                { value: "weekly", label: "أسبوعي" },
                { value: "monthly", label: "شهري" },
                { value: "yearly", label: "سنوي" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleChange("frequency", option.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all active:scale-[0.98] ${
                    value.frequency === option.value
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/60"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interval */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-foreground">
              معدل التكرار
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">كل</span>
              <input
                type="number"
                min="1"
                max="365"
                value={value.interval}
                onChange={(e) =>
                  handleChange("interval", parseInt(e.target.value) || 1)
                }
                className="w-20 px-2.5 py-1 text-xs bg-background border border-border/70 rounded-lg text-foreground font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-center"
              />
              <span className="text-xs text-muted-foreground">
                {value.frequency === "daily" && "يوم"}
                {value.frequency === "weekly" && "أسبوع"}
                {value.frequency === "monthly" && "شهر"}
                {value.frequency === "yearly" && "سنة"}
              </span>
            </div>
          </div>

          {/* Days of Week (for weekly) */}
          {value.frequency === "weekly" && (
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-foreground">
                أيام التكرار الأسبوعية
              </label>
              <div className="flex flex-wrap gap-1.5">
                {dayNames.map((day, index) => {
                  const isSelected = value.daysOfWeek.includes(index);
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => toggleDayOfWeek(index)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-all active:scale-95 ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/60"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Day of Month (for monthly) */}
          {value.frequency === "monthly" && (
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-foreground">
                يوم تنفيذ المهمة
              </label>
              <select
                value={value.dayOfMonth}
                onChange={(e) =>
                  handleChange("dayOfMonth", parseInt(e.target.value))
                }
                className="w-full px-2.5 py-1.5 text-xs bg-background border border-border/70 rounded-lg text-foreground font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>
                    اليوم {day} من الشهر
                  </option>
                ))}
                <option value={-1}>اليوم الأخير في الشهر</option>
              </select>
            </div>
          )}

          {/* End Options */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-foreground">
              نهاية التكرار
            </label>
            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="endType"
                  value="never"
                  checked={value.endType === "never"}
                  onChange={() => handleChange("endType", "never")}
                  className="text-primary focus:ring-primary/20"
                />
                <span>بدون حد نهائي (مستمر دائماً)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer flex-wrap">
                <input
                  type="radio"
                  name="endType"
                  value="date"
                  checked={value.endType === "date"}
                  onChange={() => handleChange("endType", "date")}
                  className="text-primary focus:ring-primary/20"
                />
                <span>حتى تاريخ محدد:</span>
                {value.endType === "date" && (
                  <input
                    type="date"
                    value={value.endDate}
                    onChange={(e) => handleChange("endDate", e.target.value)}
                    className="px-2 py-0.5 text-xs bg-background border border-border/70 rounded-md font-mono tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                )}
              </label>

              <label className="flex items-center gap-2 cursor-pointer flex-wrap">
                <input
                  type="radio"
                  name="endType"
                  value="count"
                  checked={value.endType === "count"}
                  onChange={() => handleChange("endType", "count")}
                  className="text-primary focus:ring-primary/20"
                />
                <span>تكرار لعدد محدد:</span>
                {value.endType === "count" && (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={value.endCount}
                      onChange={(e) =>
                        handleChange("endCount", parseInt(e.target.value) || 1)
                      }
                      className="w-16 px-2 py-0.5 text-xs bg-background border border-border/70 rounded-md text-center font-mono tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <span>مرات</span>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Summary */}
          <div className="p-3 bg-muted/20 border border-border/60 rounded-lg flex items-center gap-2 text-xs text-foreground font-mono tabular-nums">
            <Calendar className="w-4 h-4 text-primary shrink-0" />
            <span>
              الجدول: {getFrequencyText()}
              {value.frequency === "weekly" && value.daysOfWeek.length > 0 && (
                <> ({value.daysOfWeek.map((d) => dayNames[d]).join("، ")})</>
              )}
              {value.frequency === "monthly" && (
                <> (يوم {value.dayOfMonth === -1 ? "الأخير" : value.dayOfMonth})</>
              )}
              {" — "}
              {getEndText()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecurringTaskForm;

export const defaultRecurringConfig: RecurringConfig = {
  enabled: false,
  frequency: "weekly",
  interval: 1,
  daysOfWeek: [0],
  dayOfMonth: 1,
  endType: "never",
  endDate: "",
  endCount: 10,
};
