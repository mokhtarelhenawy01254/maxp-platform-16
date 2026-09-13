import React from "react";
import { useTranslation } from "react-i18next";
import { Clock, Calendar, AlertCircle, Sparkles, CheckCircle2 } from "lucide-react";

interface AdDaypartingSchedulerProps {
  isLifetimeBudget: boolean;
  enabled: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  startHour: number; // 0 - 23
  endHour: number; // 1 - 24
  onChangeHours: (start: number, end: number) => void;
  selectedDays: number[]; // 1 = Sunday, 7 = Saturday
  onToggleDay: (day: number) => void;
}

export const AdDaypartingScheduler: React.FC<AdDaypartingSchedulerProps> = ({
  isLifetimeBudget,
  enabled,
  onToggleEnabled,
  startHour,
  endHour,
  onChangeHours,
  selectedDays,
  onToggleDay,
}) => {
  const { i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith("en"));

  const daysOfWeek = React.useMemo(() => [
    { id: 7, label: isEn ? "Sat" : "السبت" },
    { id: 1, label: isEn ? "Sun" : "الأحد" },
    { id: 2, label: isEn ? "Mon" : "الإثنين" },
    { id: 3, label: isEn ? "Tue" : "الثلاثاء" },
    { id: 4, label: isEn ? "Wed" : "الأربعاء" },
    { id: 5, label: isEn ? "Thu" : "الخميس" },
    { id: 6, label: isEn ? "Fri" : "الجمعة" },
  ], [isEn]);

  const presets = React.useMemo(() => [
    { label: isEn ? "All Day (24 hrs)" : "طوال اليوم (24 ساعة)", start: 0, end: 24 },
    { label: isEn ? "Peak Hours (10 AM - 12 AM)" : "ساعات التجارة والذروة (10 ص - 12 ص)", start: 10, end: 24 },
    { label: isEn ? "Evening Only (4 PM - 12 AM)" : "الفترة المسائية فقط (4 م - 12 ص)", start: 16, end: 24 },
  ], [isEn]);

  if (!isLifetimeBudget) {
    return (
      <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-xl flex items-center justify-between text-xs text-amber-800 dark:text-amber-200" dir={isEn ? "ltr" : "rtl"}>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            <strong>{isEn ? "Ad Scheduling / Dayparting:" : "جدولة ساعات العرض (Dayparting):"}</strong>{" "}
            {isEn
              ? 'Requires a "Lifetime Budget" to schedule specific hours.'
              : 'تتطلب اختيار "ميزانية إجمالية (Lifetime Budget)" لتفعيل ساعات محددة.'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/40 rounded-xl space-y-4" dir={isEn ? "ltr" : "rtl"}>
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">
            {isEn ? "Ad Scheduling (Dayparting)" : "جدولة ساعات وأيام العرض (Ad Scheduling / Dayparting)"}
          </h4>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggleEnabled(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
        </label>
      </div>

      <p className="text-xs text-gray-600 dark:text-gray-400">
        {isEn
          ? "Specify the days and hours your ad runs to avoid burning budget during off-peak hours or when sales staff is offline."
          : "حدد الساعات والأيام التي يعمل فيها الإعلان لإيقاف حرق الميزانية أوقات الفجر أو خارج ساعات عمل فريق المبيعات."}
      </p>

      {enabled && (
        <div className="space-y-4 pt-1">
          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-500 dark:text-purple-400" />
              {isEn ? "Presets:" : "قوالب شائعة:"}
            </span>
            {presets.map((p, idx) => {
              const isActive = startHour === p.start && endHour === p.end;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onChangeHours(p.start, p.end)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                    isActive
                      ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                      : "bg-white dark:bg-gray-800 border-purple-200 dark:border-purple-900/50 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Time Range Pickers */}
          <div className="grid grid-cols-2 gap-3 bg-white dark:bg-gray-800/80 p-3 rounded-lg border border-purple-200 dark:border-purple-900/40">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {isEn ? "Daily Start Time" : "بداية العرض يومياً"}
              </label>
              <select
                value={startHour}
                onChange={(e) => onChangeHours(parseInt(e.target.value), endHour)}
                className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {isEn
                      ? i === 0
                        ? "12:00 AM (Midnight)"
                        : i < 12
                          ? `${i}:00 AM`
                          : i === 12
                            ? "12:00 PM (Noon)"
                            : `${i - 12}:00 PM`
                      : i === 0
                        ? "12 منتصف الليل"
                        : i < 12
                          ? `${i}:00 صباحاً`
                          : i === 12
                            ? "12:00 ظهراً"
                            : `${i - 12}:00 مساءً`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {isEn ? "Daily End Time" : "نهاية العرض يومياً"}
              </label>
              <select
                value={endHour}
                onChange={(e) => onChangeHours(startHour, parseInt(e.target.value))}
                className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
              >
                {Array.from({ length: 24 }, (_, i) => i + 1).map((i) => (
                  <option key={i} value={i}>
                    {isEn
                      ? i === 24
                        ? "12:00 AM (Midnight, End of day)"
                        : i < 12
                          ? `${i}:00 AM`
                          : i === 12
                            ? "12:00 PM (Noon)"
                            : `${i - 12}:00 PM`
                      : i === 24
                        ? "12 منتصف الليل (نهاية اليوم)"
                        : i < 12
                          ? `${i}:00 صباحاً`
                          : i === 12
                            ? "12:00 ظهراً"
                            : `${i - 12}:00 مساءً`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Days of Week */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {isEn ? "Active Days of Week" : "أيام التشغيل الأسبوعية"}
            </label>
            <div className="grid grid-cols-7 gap-1.5">
              {daysOfWeek.map((day) => {
                const isSelected = selectedDays.includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => onToggleDay(day.id)}
                    className={`py-1.5 px-1 rounded-lg text-xs font-semibold text-center transition-all ${
                      isSelected
                        ? "bg-purple-600 text-white shadow-xs"
                        : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-[11px] text-purple-800 dark:text-purple-200 bg-purple-100/60 dark:bg-purple-950/40 p-2.5 rounded-lg">
            {isEn ? (
              <>
                ✓ The ad will run only on selected days from <strong>{startHour}:00</strong> to <strong>{endHour}:00</strong> based on the viewer&apos;s local timezone.
              </>
            ) : (
              <>
                ✓ سيعمل الإعلان في الأيام المحددة فقط من الساعة{" "}
                <strong>{startHour}:00</strong> حتى <strong>{endHour}:00</strong> حسب التوقيت المحلي للمشاهد.
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
