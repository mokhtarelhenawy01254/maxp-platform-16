import React from "react";
import { Home } from "lucide-react";
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
import type { HRSettingsData } from "../types/hrSettingsTypes";

interface HRRemoteWorkTabProps {
  settings: HRSettingsData;
  setSettings: React.Dispatch<React.SetStateAction<HRSettingsData>>;
}

export const HRRemoteWorkTab: React.FC<HRRemoteWorkTabProps> = ({
  settings,
  setSettings,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="h-5 w-5 text-teal-500" />
          سياسات العمل عن بُعد
        </CardTitle>
        <CardDescription>إعدادات العمل من المنزل</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border border-teal-200 dark:border-teal-800 rounded-lg bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20">
          <div>
            <Label className="text-lg">تفعيل العمل عن بُعد</Label>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              السماح للموظفين بالعمل من المنزل
            </p>
          </div>
          <Switch
            checked={settings.remoteWorkAllowed}
            onCheckedChange={(checked) =>
              setSettings((previous) => ({
                ...previous,
                remoteWorkAllowed: checked,
              }))
            }
          />
        </div>

        {settings.remoteWorkAllowed && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <Label>الحد الأقصى لأيام العمل عن بُعد</Label>
                <Select
                  value={settings.maxRemoteDaysPerWeek.toString()}
                  onValueChange={(value) =>
                    setSettings((previous) => ({
                      ...previous,
                      maxRemoteDaysPerWeek: parseInt(value),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">يوم واحد أسبوعياً</SelectItem>
                    <SelectItem value="2">يومين أسبوعياً</SelectItem>
                    <SelectItem value="3">3 أيام أسبوعياً</SelectItem>
                    <SelectItem value="5">عمل كامل عن بُعد</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div>
                  <Label>يتطلب موافقة المدير</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    موافقة مسبقة على أيام العمل عن بُعد
                  </p>
                </div>
                <Switch
                  checked={settings.remoteWorkApprovalRequired}
                  onCheckedChange={(checked) =>
                    setSettings((previous) => ({
                      ...previous,
                      remoteWorkApprovalRequired: checked,
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div>
                  <Label>توفير معدات العمل</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    الشركة توفر الأجهزة والمعدات اللازمة
                  </p>
                </div>
                <Switch
                  checked={settings.remoteWorkEquipmentProvided}
                  onCheckedChange={(checked) =>
                    setSettings((previous) => ({
                      ...previous,
                      remoteWorkEquipmentProvided: checked,
                    }))
                  }
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
