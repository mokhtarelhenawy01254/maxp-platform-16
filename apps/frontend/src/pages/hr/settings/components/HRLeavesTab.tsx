import React from "react";
import { Baby, Heart, Info, Plane } from "lucide-react";
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
import { Separator } from "../../../../components/ui/separator";
import type { HRSettingsData } from "../types/hrSettingsTypes";

interface HRLeavesTabProps {
  settings: HRSettingsData;
  setSettings: React.Dispatch<React.SetStateAction<HRSettingsData>>;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export const HRLeavesTab: React.FC<HRLeavesTabProps> = ({
  settings,
  setSettings,
  errors,
  setErrors,
}) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>إعدادات الإجازات الأساسية</CardTitle>
          <CardDescription>تكوين سياسات الإجازات العادية</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>رصيد الإجازة السنوية</Label>
                <div className="group relative inline-block">
                  <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg z-50 whitespace-nowrap">
                    عدد أيام الإجازة السنوية الافتراضية التي يحصل عليها كل موظف جديد عند بدء العمل
                  </div>
                </div>
              </div>
              <Input
                type="number"
                min={0}
                value={settings.annualLeaveDefault}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  setSettings((previous) => ({
                    ...previous,
                    annualLeaveDefault: value,
                  }));
                  if (errors.annualLeaveDefault) {
                    setErrors((previous) => {
                      const next = { ...previous };
                      delete next.annualLeaveDefault;
                      return next;
                    });
                  }
                }}
                className={`tabular-nums font-mono ${errors.annualLeaveDefault ? "border-red-500" : ""}`}
              />
              {errors.annualLeaveDefault && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {errors.annualLeaveDefault}
                </p>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400">يوم</p>
            </div>
            <div className="space-y-2">
              <Label>رصيد الإجازة المرضية</Label>
              <Input
                type="number"
                min={0}
                value={settings.sickLeaveDefault}
                onChange={(e) =>
                  setSettings((previous) => ({
                    ...previous,
                    sickLeaveDefault: parseInt(e.target.value) || 0,
                  }))
                }
                className="tabular-nums font-mono"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">يوم</p>
            </div>
            <div className="space-y-2">
              <Label>حد الترحيل السنوي</Label>
              <Input
                type="number"
                min={0}
                value={settings.carryOverLimit}
                onChange={(e) =>
                  setSettings((previous) => ({
                    ...previous,
                    carryOverLimit: parseInt(e.target.value) || 0,
                  }))
                }
                className="tabular-nums font-mono"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">يوم</p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <Label>الحد الأدنى للإشعار المسبق</Label>
              <Input
                type="number"
                min={0}
                value={settings.minAdvanceNotice}
                onChange={(e) =>
                  setSettings((previous) => ({
                    ...previous,
                    minAdvanceNotice: parseInt(e.target.value) || 0,
                  }))
                }
                className="tabular-nums font-mono"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">يوم قبل الإجازة</p>
            </div>
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div>
                <Label>طلب موافقة المدير</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  يتطلب موافقة المدير على طلبات الإجازة
                </p>
              </div>
              <Switch
                checked={settings.requireApproval}
                onCheckedChange={(checked) =>
                  setSettings((previous) => ({
                    ...previous,
                    requireApproval: checked,
                  }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Leave Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            أنواع الإجازات الإضافية
          </CardTitle>
          <CardDescription>إجازات خاصة بالمناسبات والظروف</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Baby className="h-4 w-4 text-pink-500" />
                إجازة الأمومة
              </Label>
              <Input
                type="number"
                min={0}
                value={settings.maternityLeaveDays}
                onChange={(e) =>
                  setSettings((previous) => ({
                    ...previous,
                    maternityLeaveDays: parseInt(e.target.value) || 0,
                  }))
                }
                className="tabular-nums font-mono"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">يوم</p>
            </div>
            <div className="space-y-2">
              <Label>إجازة الأبوة</Label>
              <Input
                type="number"
                min={0}
                value={settings.paternityLeaveDays}
                onChange={(e) =>
                  setSettings((previous) => ({
                    ...previous,
                    paternityLeaveDays: parseInt(e.target.value) || 0,
                  }))
                }
                className="tabular-nums font-mono"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">يوم</p>
            </div>
            <div className="space-y-2">
              <Label>إجازة الزواج</Label>
              <Input
                type="number"
                min={0}
                value={settings.marriageLeaveDays}
                onChange={(e) =>
                  setSettings((previous) => ({
                    ...previous,
                    marriageLeaveDays: parseInt(e.target.value) || 0,
                  }))
                }
                className="tabular-nums font-mono"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">يوم</p>
            </div>
            <div className="space-y-2">
              <Label>إجازة الوفاة</Label>
              <Input
                type="number"
                min={0}
                value={settings.bereavementLeaveDays}
                onChange={(e) =>
                  setSettings((previous) => ({
                    ...previous,
                    bereavementLeaveDays: parseInt(e.target.value) || 0,
                  }))
                }
                className="tabular-nums font-mono"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">يوم</p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Plane className="h-4 w-4 text-green-500" />
                إجازة الحج/العمرة
              </Label>
              <Input
                type="number"
                min={0}
                value={settings.hajjLeaveDays}
                onChange={(e) =>
                  setSettings((previous) => ({
                    ...previous,
                    hajjLeaveDays: parseInt(e.target.value) || 0,
                  }))
                }
                className="tabular-nums font-mono"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">يوم (مرة واحدة)</p>
            </div>
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div>
                <Label>السماح بإجازة بدون راتب</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  يمكن للموظف طلب إجازة غير مدفوعة
                </p>
              </div>
              <Switch
                checked={settings.unpaidLeaveAllowed}
                onCheckedChange={(checked) =>
                  setSettings((previous) => ({
                    ...previous,
                    unpaidLeaveAllowed: checked,
                  }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
