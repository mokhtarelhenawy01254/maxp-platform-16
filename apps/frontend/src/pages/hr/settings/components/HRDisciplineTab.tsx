import React from "react";
import { AlertTriangle, Info } from "lucide-react";
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

interface HRDisciplineTabProps {
  settings: HRSettingsData;
  setSettings: React.Dispatch<React.SetStateAction<HRSettingsData>>;
}

export const HRDisciplineTab: React.FC<HRDisciplineTabProps> = ({
  settings,
  setSettings,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          سياسات الانضباط والجزاءات
        </CardTitle>
        <CardDescription>
          تحديد درجات الإنذارات والعقوبات
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="verbalWarningThreshold">
                الإنذار الشفهي بعد
              </Label>
              <div className="group relative inline-block">
                <Info className="h-4 w-4 text-gray-400 cursor-help" />
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg z-50 whitespace-nowrap">
                  عدد المخالفات المطلوبة لإصدار إنذار شفهي للموظف
                </div>
              </div>
            </div>
            <Input
              id="verbalWarningThreshold"
              name="verbalWarningThreshold"
              type="number"
              min={0}
              value={settings.verbalWarningThreshold}
              onChange={(e) =>
                setSettings((previous) => ({
                  ...previous,
                  verbalWarningThreshold: parseInt(e.target.value) || 0,
                }))
              }
              className="tabular-nums font-mono"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">مخالفات</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="writtenWarningThreshold">
              الإنذار الكتابي بعد
            </Label>
            <Input
              id="writtenWarningThreshold"
              name="writtenWarningThreshold"
              type="number"
              min={0}
              value={settings.writtenWarningThreshold}
              onChange={(e) =>
                setSettings((previous) => ({
                  ...previous,
                  writtenWarningThreshold: parseInt(e.target.value) || 0,
                }))
              }
              className="tabular-nums font-mono"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">مخالفات</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="deductionWarningThreshold">
              الخصم من الراتب بعد
            </Label>
            <Input
              id="deductionWarningThreshold"
              name="deductionWarningThreshold"
              type="number"
              min={0}
              value={settings.deductionWarningThreshold}
              onChange={(e) =>
                setSettings((previous) => ({
                  ...previous,
                  deductionWarningThreshold: parseInt(e.target.value) || 0,
                }))
              }
              className="tabular-nums font-mono"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">مخالفات</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="suspensionThreshold">
              الإيقاف عن العمل بعد
            </Label>
            <Input
              id="suspensionThreshold"
              name="suspensionThreshold"
              type="number"
              min={0}
              value={settings.suspensionThreshold}
              onChange={(e) =>
                setSettings((previous) => ({
                  ...previous,
                  suspensionThreshold: parseInt(e.target.value) || 0,
                }))
              }
              className="tabular-nums font-mono"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">مخالفات</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="terminationThreshold">
              إنهاء الخدمة بعد
            </Label>
            <Input
              id="terminationThreshold"
              name="terminationThreshold"
              type="number"
              min={0}
              value={settings.terminationThreshold}
              onChange={(e) =>
                setSettings((previous) => ({
                  ...previous,
                  terminationThreshold: parseInt(e.target.value) || 0,
                }))
              }
              className="tabular-nums font-mono"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">مخالفات</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="warningExpiryMonths">
              صلاحية الإنذار
            </Label>
            <Input
              id="warningExpiryMonths"
              name="warningExpiryMonths"
              type="number"
              min={0}
              value={settings.warningExpiryMonths}
              onChange={(e) =>
                setSettings((previous) => ({
                  ...previous,
                  warningExpiryMonths: parseInt(e.target.value) || 0,
                }))
              }
              className="tabular-nums font-mono"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">شهر</p>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div>
              <Label>إنذار تلقائي عند التأخير المتكرر</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                إصدار إنذار تلقائي عند تجاوز حد التأخيرات
              </p>
            </div>
            <Switch
              checked={settings.autoWarningOnLateness}
              onCheckedChange={(checked) =>
                setSettings((previous) => ({
                  ...previous,
                  autoWarningOnLateness: checked,
                }))
              }
            />
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div>
              <Label>إنذار تلقائي عند الغياب</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                إصدار إنذار تلقائي عند الغياب بدون إذن
              </p>
            </div>
            <Switch
              checked={settings.autoWarningOnAbsence}
              onCheckedChange={(checked) =>
                setSettings((previous) => ({
                  ...previous,
                  autoWarningOnAbsence: checked,
                }))
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
