import React from "react";
import { FileText, Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
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

interface HREmploymentTabProps {
  settings: HRSettingsData;
  setSettings: React.Dispatch<React.SetStateAction<HRSettingsData>>;
}

export const HREmploymentTab: React.FC<HREmploymentTabProps> = ({
  settings,
  setSettings,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-indigo-500" />
          سياسات التوظيف
        </CardTitle>
        <CardDescription>
          إعدادات العقود ونهاية الخدمة
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-2">
            <Label htmlFor="noticePeriodDays">
              فترة الإشعار عند الاستقالة
            </Label>
            <Input
              id="noticePeriodDays"
              name="noticePeriodDays"
              type="number"
              min={0}
              value={settings.noticePeriodDays}
              onChange={(e) =>
                setSettings((previous) => ({
                  ...previous,
                  noticePeriodDays: parseInt(e.target.value) || 0,
                }))
              }
              className="tabular-nums font-mono"
            />
            <p className="text-sm text-gray-500">يوم</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contractRenewalNoticeDays">
              فترة الإشعار لتجديد العقد
            </Label>
            <Input
              id="contractRenewalNoticeDays"
              name="contractRenewalNoticeDays"
              type="number"
              min={0}
              value={settings.contractRenewalNoticeDays}
              onChange={(e) =>
                setSettings((previous) => ({
                  ...previous,
                  contractRenewalNoticeDays: parseInt(e.target.value) || 0,
                }))
              }
              className="tabular-nums font-mono"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              يوم قبل انتهاء العقد
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="retirementAge">سن التقاعد</Label>
            <Input
              id="retirementAge"
              name="retirementAge"
              type="number"
              min={0}
              value={settings.retirementAge}
              onChange={(e) =>
                setSettings((previous) => ({
                  ...previous,
                  retirementAge: parseInt(e.target.value) || 0,
                }))
              }
              className="tabular-nums font-mono"
            />
            <p className="text-sm text-gray-500">سنة</p>
          </div>
          <div className="space-y-2">
            <Label>حساب مكافأة نهاية الخدمة</Label>
            <Select
              value={settings.endOfServiceCalculation}
              onValueChange={(value) =>
                setSettings((previous) => ({
                  ...previous,
                  endOfServiceCalculation: value,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="half_month_per_year">نصف شهر عن كل سنة</SelectItem>
                <SelectItem value="one_month_per_year">شهر عن كل سنة</SelectItem>
                <SelectItem value="custom">حسب السياسة الداخلية</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Separator />
        <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-start gap-2">
            <div>
              <Label>إخلاء طرف إلزامي</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                يتطلب إنهاء الخدمة إتمام إخلاء الطرف والاستلام
              </p>
            </div>
            <div className="group relative inline-block">
              <Info className="h-4 w-4 text-gray-400 cursor-help mt-0.5 shrink-0" />
              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg z-50 whitespace-nowrap">
                عند التفعيل، يجب على الموظف المُنهية خدمته إتمام نموذج إخلاء الطرف وتسليم المعدات/المستندات قبل صرف المستحقات
              </div>
            </div>
          </div>
          <Switch
            checked={settings.requireClearance}
            onCheckedChange={(checked) =>
              setSettings((previous) => ({
                ...previous,
                requireClearance: checked,
              }))
            }
          />
        </div>
      </CardContent>
    </Card>
  );
};
