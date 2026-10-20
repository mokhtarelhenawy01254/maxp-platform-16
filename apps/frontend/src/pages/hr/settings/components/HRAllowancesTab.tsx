import React from "react";
import { Gift } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import type { HRSettingsData } from "../types/hrSettingsTypes";

interface HRAllowancesTabProps {
  settings: HRSettingsData;
  setSettings: React.Dispatch<React.SetStateAction<HRSettingsData>>;
}

export const HRAllowancesTab: React.FC<HRAllowancesTabProps> = ({
  settings,
  setSettings,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-purple-500" />
          البدلات والمزايا الافتراضية
        </CardTitle>
        <CardDescription>
          تحديد البدلات الافتراضية للموظفين الجدد
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-2">
            <Label>بدل المواصلات</Label>
            <Input
              type="number"
              min={0}
              value={settings.transportationAllowance}
              onChange={(e) =>
                setSettings((previous) => ({
                  ...previous,
                  transportationAllowance: parseFloat(e.target.value) || 0,
                }))
              }
              className="tabular-nums font-mono"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {settings.currency} شهرياً
            </p>
          </div>
          <div className="space-y-2">
            <Label>بدل السكن</Label>
            <Input
              type="number"
              min={0}
              value={settings.housingAllowance}
              onChange={(e) =>
                setSettings((previous) => ({
                  ...previous,
                  housingAllowance: parseFloat(e.target.value) || 0,
                }))
              }
              className="tabular-nums font-mono"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {settings.currency} شهرياً
            </p>
          </div>
          <div className="space-y-2">
            <Label>بدل الهاتف</Label>
            <Input
              type="number"
              min={0}
              value={settings.phoneAllowance}
              onChange={(e) =>
                setSettings((previous) => ({
                  ...previous,
                  phoneAllowance: parseFloat(e.target.value) || 0,
                }))
              }
              className="tabular-nums font-mono"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {settings.currency} شهرياً
            </p>
          </div>
          <div className="space-y-2">
            <Label>بدل الوجبات</Label>
            <Input
              type="number"
              min={0}
              value={settings.mealAllowance}
              onChange={(e) =>
                setSettings((previous) => ({
                  ...previous,
                  mealAllowance: parseFloat(e.target.value) || 0,
                }))
              }
              className="tabular-nums font-mono"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {settings.currency} شهرياً
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
