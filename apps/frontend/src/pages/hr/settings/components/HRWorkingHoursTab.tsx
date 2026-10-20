import React from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Badge } from "../../../../components/ui/badge";
import { Label } from "../../../../components/ui/label";
import { weekDaysList, type HRSettingsData } from "../types/hrSettingsTypes";

interface HRWorkingHoursTabProps {
  settings: HRSettingsData;
  errors: Record<string, string>;
  onToggleWorkingDay: (day: string) => void;
}

export const HRWorkingHoursTab: React.FC<HRWorkingHoursTabProps> = ({
  settings,
  errors,
  onToggleWorkingDay,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>أيام وأوقات العمل</CardTitle>
        <CardDescription>إدارة جدول العمل الأسبوعي</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Label>أيام العمل</Label>
            <div className="group relative inline-block">
              <Info className="h-4 w-4 text-gray-400 cursor-help" />
              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg z-50 whitespace-nowrap">
                اختر أيام الأسبوع التي تعتبر أيام عمل. يجب اختيار يوم واحد على الأقل
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {weekDaysList.map((day) => (
              <Button
                key={day.value}
                type="button"
                variant={
                  settings.workingDays.includes(day.value) ? "default" : "outline"
                }
                onClick={() => onToggleWorkingDay(day.value)}
                className="min-w-[80px]"
              >
                {day.label}
              </Button>
            ))}
          </div>
          {errors.workingDays && (
            <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {errors.workingDays}
            </p>
          )}
          {settings.workingDays.length > 0 && (
            <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              تم اختيار{" "}
              <span className="tabular-nums font-mono font-medium">
                {settings.workingDays.length}
              </span>{" "}
              يوم عمل
            </p>
          )}

          {/* Weekly Rest Days Section */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                أيام الراحة الأسبوعية المحددة:
              </span>
              <span className="text-xs text-slate-500">
                (الأيام غير المحددة كأيام عمل تُعتبر راحة أسبوعية)
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {weekDaysList
                .filter((day) => !settings.workingDays.includes(day.value))
                .map((day) => (
                  <Badge
                    key={day.value}
                    className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300 px-3 py-1 font-medium"
                  >
                    {day.label} (راحة أسبوعية)
                  </Badge>
                ))}
              {weekDaysList.filter((day) => !settings.workingDays.includes(day.value)).length === 0 && (
                <span className="text-xs text-amber-600 font-medium">
                  لا توجد أيام راحة أسبوعية (كل الأيام عمل)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-200 dark:border-slate-800 pt-2">
              قاعدة النظام: أي بصمة حضور لموظف في يوم الراحة تُسجّل تلقائياً كـ <strong>ساعات إضافية (OVERTIME)</strong> بكامل ساعات الحضور الفعلي، مع استبعادها تماماً من أي خصومات تأخير أو غياب (صفر دقائق خصم).
            </p>
          </div>
        </div>

        <div className="col-span-2">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-blue-600 dark:text-blue-400 mt-0.5">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  أوقات العمل تُدار من خلال المناوبات
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  يتم تحديد أوقات بداية ونهاية العمل لكل موظف بناءً على المناوبة المعيّنة له. يمكنك إدارة المناوبات من صفحة &ldquo;المناوبات&rdquo;.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
