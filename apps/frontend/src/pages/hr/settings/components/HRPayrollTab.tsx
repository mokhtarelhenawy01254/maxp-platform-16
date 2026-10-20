import React from "react";
import { DollarSign, Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";
import { Separator } from "../../../../components/ui/separator";
import type { HRSettingsData } from "../types/hrSettingsTypes";

interface HRPayrollTabProps {
  settings: HRSettingsData;
  setSettings: React.Dispatch<React.SetStateAction<HRSettingsData>>;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export const HRPayrollTab: React.FC<HRPayrollTabProps> = ({
  settings,
  setSettings,
  errors,
  setErrors,
}) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>إعدادات الرواتب</CardTitle>
          <CardDescription>تكوين حسابات الرواتب</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="space-y-2">
              <Label>يوم صرف الراتب</Label>
              <Select
                value={settings.payrollDay.toString()}
                onValueChange={(value) =>
                  setSettings((previous) => ({
                    ...previous,
                    payrollDay: parseInt(value),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()} className="tabular-nums font-mono">
                      يوم {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>العملة</Label>
              <Select
                value={settings.currency}
                onValueChange={(value) =>
                  setSettings((previous) => ({ ...previous, currency: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EGP">جنيه مصري (EGP)</SelectItem>
                  <SelectItem value="SAR">ريال سعودي (SAR)</SelectItem>
                  <SelectItem value="AED">درهم إماراتي (AED)</SelectItem>
                  <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                  <SelectItem value="KWD">دينار كويتي (KWD)</SelectItem>
                  <SelectItem value="QAR">ريال قطري (QAR)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>معدل العمل الإضافي</Label>
              <Select
                value={settings.overtimeRate.toString()}
                onValueChange={(value) =>
                  setSettings((previous) => ({
                    ...previous,
                    overtimeRate: parseFloat(value),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1.0x (الساعة بساعة - بدون مضاعف)</SelectItem>
                  <SelectItem value="1.25">1.25x</SelectItem>
                  <SelectItem value="1.5">1.5x</SelectItem>
                  <SelectItem value="2">2.0x (ساعة بساعتين)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>نسبة الضريبة (%)</Label>
                <div className="group relative inline-block">
                  <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg z-50 whitespace-nowrap">
                    النسبة المئوية للضريبة المقتطعة من الراتب (عادة بين 0-30%)
                  </div>
                </div>
              </div>
              <Input
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={settings.taxRate}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  setSettings((previous) => ({
                    ...previous,
                    taxRate: isNaN(value) ? 0 : value,
                  }));
                  if (errors.taxRate) {
                    setErrors((previous) => {
                      const next = { ...previous };
                      delete next.taxRate;
                      return next;
                    });
                  }
                }}
                className={`tabular-nums font-mono ${errors.taxRate ? "border-red-500" : ""}`}
              />
              {errors.taxRate && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {errors.taxRate}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>نسبة التأمينات الاجتماعية (%)</Label>
                <div className="group relative inline-block">
                  <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg z-50 whitespace-nowrap">
                    النسبة المئوية للتأمينات الاجتماعية المقتطعة من الراتب (حسب قانون العمل المحلي)
                  </div>
                </div>
              </div>
              <Input
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={settings.socialInsuranceRate}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  setSettings((previous) => ({
                    ...previous,
                    socialInsuranceRate: isNaN(value) ? 0 : value,
                  }));
                  if (errors.socialInsuranceRate) {
                    setErrors((previous) => {
                      const next = { ...previous };
                      delete next.socialInsuranceRate;
                      return next;
                    });
                  }
                }}
                className={`tabular-nums font-mono ${errors.socialInsuranceRate ? "border-red-500" : ""}`}
              />
              {errors.socialInsuranceRate && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {errors.socialInsuranceRate}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advance Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            سياسات السلف المالية
          </CardTitle>
          <CardDescription>تحديد شروط وحدود طلب السلف</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>الحد الأقصى للسلفة (% من الراتب)</Label>
                <div className="group relative inline-block">
                  <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg z-50 whitespace-nowrap">
                    أقصى نسبة من الراتب يمكن للموظف الحصول عليها كسلفة مالية (مثال: 50% يعني نصف الراتب)
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={settings.maxAdvancePercentage || 50}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    setSettings((previous) => ({
                      ...previous,
                      maxAdvancePercentage: value,
                    }));
                    if (errors.maxAdvancePercentage) {
                      setErrors((previous) => {
                        const next = { ...previous };
                        delete next.maxAdvancePercentage;
                        return next;
                      });
                    }
                  }}
                  className={`tabular-nums font-mono ${errors.maxAdvancePercentage ? "border-red-500" : ""}`}
                />
                <span className="text-gray-500 dark:text-gray-400">%</span>
              </div>
              {errors.maxAdvancePercentage && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {errors.maxAdvancePercentage}
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                النسبة المئوية من الراتب الأساسي المسموح بها كسلفة
              </p>
            </div>

            <div className="space-y-2">
              <Label>الحد الأقصى للسلف النشطة</Label>
              <Input
                type="number"
                min={1}
                value={settings.maxActiveAdvances || 1}
                onChange={(e) =>
                  setSettings((previous) => ({
                    ...previous,
                    maxActiveAdvances: parseInt(e.target.value) || 0,
                  }))
                }
                className="tabular-nums font-mono"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                عدد السلف التي يمكن للموظف الحصول عليها في نفس الوقت
              </p>
            </div>

            <div className="space-y-2">
              <Label>الحد الأدنى لمدة العمل (أشهر)</Label>
              <Input
                type="number"
                min={0}
                value={settings.minMonthsForAdvance || 3}
                onChange={(e) =>
                  setSettings((previous) => ({
                    ...previous,
                    minMonthsForAdvance: parseInt(e.target.value) || 0,
                  }))
                }
                className="tabular-nums font-mono"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                أقل مدة عمل مطلوبة قبل السماح بطلب سلفة
              </p>
            </div>

            <div className="space-y-2">
              <Label>فترة السداد القصوى (أشهر)</Label>
              <Input
                type="number"
                min={1}
                value={settings.advanceRepaymentMonths || 6}
                onChange={(e) =>
                  setSettings((previous) => ({
                    ...previous,
                    advanceRepaymentMonths: parseInt(e.target.value) || 0,
                  }))
                }
                className="tabular-nums font-mono"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                الحد الأقصى لعدد الأشهر المسموح بتقسيط السلفة عليها
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
