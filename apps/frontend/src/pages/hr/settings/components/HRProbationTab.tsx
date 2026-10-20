import React from "react";
import { Briefcase, Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card";
import { Label } from "../../../../components/ui/label";
import { Switch } from "../../../../components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";
import { Separator } from "../../../../components/ui/separator";
import type { HRSettingsData } from "../types/hrSettingsTypes";

interface HRProbationTabProps {
  settings: HRSettingsData;
  setSettings: React.Dispatch<React.SetStateAction<HRSettingsData>>;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export const HRProbationTab: React.FC<HRProbationTabProps> = ({
  settings,
  setSettings,
  errors,
  setErrors,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-blue-500" />
          فترة الاختبار
        </CardTitle>
        <CardDescription>
          إعدادات فترة التجربة للموظفين الجدد
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>مدة فترة الاختبار</Label>
              <div className="group relative inline-block">
                <Info className="h-4 w-4 text-gray-400 cursor-help" />
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg z-50 whitespace-nowrap">
                  المدة الزمنية لفترة التجربة للموظفين الجدد قبل التثبيت
                </div>
              </div>
            </div>
            <Select
              value={settings.probationPeriodMonths.toString()}
              onValueChange={(value) =>
                setSettings((previous) => ({
                  ...previous,
                  probationPeriodMonths: parseInt(value),
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">شهر واحد</SelectItem>
                <SelectItem value="2">شهرين</SelectItem>
                <SelectItem value="3">3 أشهر</SelectItem>
                <SelectItem value="6">6 أشهر</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>نسبة الإجازات خلال فترة الاختبار</Label>
              <div className="group relative inline-block">
                <Info className="h-4 w-4 text-gray-400 cursor-help" />
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg z-50 whitespace-nowrap">
                  النسبة المئوية من رصيد الإجازات التي يمكن للموظف استخدامها خلال فترة الاختبار
                </div>
              </div>
            </div>
            <Select
              value={settings.probationLeavePercentage.toString()}
              onValueChange={(value) => {
                const numValue = parseInt(value);
                setSettings((previous) => ({
                  ...previous,
                  probationLeavePercentage: numValue,
                }));
                if (errors.probationLeavePercentage) {
                  setErrors((previous) => {
                    const next = { ...previous };
                    delete next.probationLeavePercentage;
                    return next;
                  });
                }
              }}
            >
              <SelectTrigger
                className={errors.probationLeavePercentage ? "border-red-500" : ""}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">لا إجازات</SelectItem>
                <SelectItem value="25" className="tabular-nums font-mono">25%</SelectItem>
                <SelectItem value="50" className="tabular-nums font-mono">50%</SelectItem>
                <SelectItem value="100" className="tabular-nums font-mono">100%</SelectItem>
              </SelectContent>
            </Select>
            {errors.probationLeavePercentage && (
              <p className="text-xs text-red-600 dark:text-red-400">
                {errors.probationLeavePercentage}
              </p>
            )}
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div>
              <Label>تقييم إلزامي في نهاية فترة الاختبار</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                يجب إجراء تقييم أداء قبل التثبيت
              </p>
            </div>
            <Switch
              checked={settings.probationEvaluationRequired}
              onCheckedChange={(checked) =>
                setSettings((previous) => ({
                  ...previous,
                  probationEvaluationRequired: checked,
                }))
              }
            />
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div>
              <Label>تقليل الإجازات خلال فترة الاختبار</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                تطبيق نسبة مخفضة من رصيد الإجازات
              </p>
            </div>
            <Switch
              checked={settings.reducedLeavesDuringProbation}
              onCheckedChange={(checked) =>
                setSettings((previous) => ({
                  ...previous,
                  reducedLeavesDuringProbation: checked,
                }))
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
