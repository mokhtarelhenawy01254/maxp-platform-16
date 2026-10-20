import React from "react";
import { Lock } from "lucide-react";
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

interface HRSecurityTabProps {
  settings: HRSettingsData;
  setSettings: React.Dispatch<React.SetStateAction<HRSettingsData>>;
}

export const HRSecurityTab: React.FC<HRSecurityTabProps> = ({
  settings,
  setSettings,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-red-500" />
          الأمان والخصوصية
        </CardTitle>
        <CardDescription>
          إعدادات حماية البيانات والوصول
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-2">
            <Label>مدة الاحتفاظ بالبيانات</Label>
            <Input
              type="number"
              min={1}
              value={settings.dataRetentionYears}
              onChange={(e) =>
                setSettings((previous) => ({
                  ...previous,
                  dataRetentionYears: parseInt(e.target.value) || 0,
                }))
              }
              className="tabular-nums font-mono"
            />
            <p className="text-sm text-gray-500">سنة</p>
          </div>
          <div className="space-y-2">
            <Label>انتهاء الجلسة بعد</Label>
            <Input
              type="number"
              min={1}
              value={settings.sessionTimeoutMinutes}
              onChange={(e) =>
                setSettings((previous) => ({
                  ...previous,
                  sessionTimeoutMinutes: parseInt(e.target.value) || 0,
                }))
              }
              className="tabular-nums font-mono"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              دقيقة من عدم النشاط
            </p>
          </div>
          <div className="space-y-2">
            <Label>مستوى وصول الموظف للبيانات</Label>
            <Select
              value={settings.employeeDataAccessLevel}
              onValueChange={(value) =>
                setSettings((previous) => ({
                  ...previous,
                  employeeDataAccessLevel: value,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="own_data_only">بياناته الشخصية فقط</SelectItem>
                <SelectItem value="team_data">بيانات الفريق</SelectItem>
                <SelectItem value="department_data">بيانات القسم</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
          <div>
            <Label>المصادقة الثنائية (2FA)</Label>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              إلزام جميع المستخدمين بتفعيل 2FA
            </p>
          </div>
          <Switch
            checked={settings.requireTwoFactorAuth}
            onCheckedChange={(checked) =>
              setSettings((previous) => ({
                ...previous,
                requireTwoFactorAuth: checked,
              }))
            }
          />
        </div>
      </CardContent>
    </Card>
  );
};
