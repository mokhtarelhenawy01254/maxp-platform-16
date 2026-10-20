import React from "react";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  Trash2,
  TrendingUp,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Switch } from "../../../../components/ui/switch";
import { Separator } from "../../../../components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../components/ui/tabs";
import {
  PunctualityRules,
  FinancialPenalties,
  CalculationEngine,
  PunctualityNotifications,
} from "../../../../components/hr/AutoDeductionSettings";
import type { HRSettingsData } from "../types/hrSettingsTypes";

interface HRAttendanceTabProps {
  settings: HRSettingsData;
  setSettings: React.Dispatch<React.SetStateAction<HRSettingsData>>;
  gettingLocation: boolean;
  testingLocation: boolean;
  locationTestResult: {
    distance: number;
    isWithinRange: boolean;
  } | null;
  onGetCurrentLocation: () => void;
  onTestCurrentLocation: () => void;
  onOpenInGoogleMaps: () => void;
}

export const HRAttendanceTab: React.FC<HRAttendanceTabProps> = ({
  settings,
  setSettings,
  gettingLocation,
  testingLocation,
  locationTestResult,
  onGetCurrentLocation,
  onTestCurrentLocation,
  onOpenInGoogleMaps,
}) => {
  return (
    <Tabs defaultValue="punctuality" className="space-y-6" dir="rtl">
      <TabsList className="bg-gray-100 dark:bg-gray-800 p-1">
        <TabsTrigger value="punctuality" className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          الالتزام والجزاءات
        </TabsTrigger>
        <TabsTrigger value="geofence" className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          تتبع الموقع (GPS)
        </TabsTrigger>
        <TabsTrigger value="engine" className="flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          محرك الحسابات
        </TabsTrigger>
      </TabsList>

      <TabsContent value="punctuality" className="space-y-6 animate-in fade-in duration-300">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              سياسات الالتزام والجزاءات
            </CardTitle>
            <CardDescription>
              تعريف قواعد الحضور والعقوبات المالية المترتبة على التأخير
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* 1. القواعد العامة (Thresholds) */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 border border-gray-100 dark:border-gray-800 rounded-xl bg-gray-50/30">
                  <Label htmlFor="earlyLeaveThreshold">حد الانصراف المبكر (بالدقائق)</Label>
                  <Input
                    id="earlyLeaveThreshold"
                    name="earlyLeaveThreshold"
                    className="mt-2 tabular-nums font-mono"
                    type="number"
                    min={0}
                    value={settings.earlyLeaveThreshold}
                    onChange={(e) =>
                      setSettings((previous) => ({
                        ...previous,
                        earlyLeaveThreshold: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="p-4 border border-gray-100 dark:border-gray-800 rounded-xl bg-gray-50/30">
                  <Label htmlFor="monthlyLateLimit">حد التأخير الشهري (مرات)</Label>
                  <Input
                    id="monthlyLateLimit"
                    name="monthlyLateLimit"
                    className="mt-2 tabular-nums font-mono"
                    type="number"
                    min={0}
                    value={settings.monthlyLateLimit}
                    onChange={(e) =>
                      setSettings((previous) => ({
                        ...previous,
                        monthlyLateLimit: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <Separator className="opacity-50" />

            {/* 2. رصيد التسامح (Grace Period) */}
            <PunctualityRules settings={settings} setSettings={setSettings} />

            {/* 3. الجزاءات المالية (Financial Penalties) */}
            <FinancialPenalties settings={settings} setSettings={setSettings} />

            <Separator className="opacity-50" />

            {/* 4. مستويات الإنذار (Legacy Levels) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-gray-900 dark:text-white">
                  جدول الخصومات المتصاعد (حسب عدد المرات)
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSettings((previous) => ({
                      ...previous,
                      lateWarningLevels: [
                        ...previous.lateWarningLevels,
                        {
                          count: previous.lateWarningLevels.length + 1,
                          deductionFactor: 0.25,
                        },
                      ],
                    }))
                  }
                >
                  إضافة مستوى
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {settings.lateWarningLevels.map((level, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-gray-50/50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700"
                  >
                    <div className="w-16">
                      <Label htmlFor={`late-count-${index}`} className="text-[10px]">
                        المرة
                      </Label>
                      <Input
                        id={`late-count-${index}`}
                        name={`late-count-${index}`}
                        type="number"
                        className="tabular-nums font-mono"
                        value={level.count}
                        onChange={(e) => {
                          const newLevels = [...settings.lateWarningLevels];
                          newLevels[index].count = parseInt(e.target.value) || 0;
                          setSettings((previous) => ({
                            ...previous,
                            lateWarningLevels: newLevels,
                          }));
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor={`late-deduction-${index}`} className="text-[10px]">
                        الخصم (نصيب يوم)
                      </Label>
                      <Input
                        id={`late-deduction-${index}`}
                        name={`late-deduction-${index}`}
                        type="number"
                        step="0.25"
                        className="tabular-nums font-mono"
                        value={level.deductionFactor}
                        onChange={(e) => {
                          const newLevels = [...settings.lateWarningLevels];
                          newLevels[index].deductionFactor = parseFloat(e.target.value) || 0;
                          setSettings((previous) => ({
                            ...previous,
                            lateWarningLevels: newLevels,
                          }));
                        }}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mt-4 text-red-500"
                      onClick={() => {
                        const newLevels = settings.lateWarningLevels.filter((_, i) => i !== index);
                        setSettings((previous) => ({
                          ...previous,
                          lateWarningLevels: newLevels,
                        }));
                      }}
                      aria-label="حذف المستوى"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="opacity-50" />

            {/* 5. التحكم بالبصمة */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 rounded-xl border bg-gray-50/20">
                <Label className="text-xs mb-2 block">البصمة عن بُعد</Label>
                <Switch
                  checked={settings.allowRemoteCheckIn}
                  onCheckedChange={(c) =>
                    setSettings((previous) => ({
                      ...previous,
                      allowRemoteCheckIn: c,
                    }))
                  }
                />
              </div>
              <div className="p-3 rounded-xl border bg-gray-50/20">
                <Label className="text-xs mb-2 block">طلب الموقع عند البصمة</Label>
                <Switch
                  checked={settings.requireLocation}
                  onCheckedChange={(c) =>
                    setSettings((previous) => ({ ...previous, requireLocation: c }))
                  }
                />
              </div>
              <div className="p-3 rounded-xl border bg-gray-50/20">
                <Label className="text-xs mb-2 block">تسجيل الغياب الآلي</Label>
                <Switch
                  checked={settings.autoAbsentMarking}
                  onCheckedChange={(c) =>
                    setSettings((previous) => ({
                      ...previous,
                      autoAbsentMarking: c,
                    }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="geofence" className="animate-in fade-in duration-300">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-500" />
              إعدادات تتبع الموقع (Geofencing)
            </CardTitle>
            <CardDescription>
              تقييد الحضور والانصراف بنطاق جغرافي محدد حول مقر الشركة لضمان تواجد الموظفين
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 border border-blue-200 dark:border-blue-800 rounded-xl bg-blue-50/50 dark:bg-blue-950/20">
              <div>
                <Label className="text-blue-900 dark:text-blue-100 font-bold">
                  تفعيل البصمة الجغرافية
                </Label>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  لن يسمح للموظف بالبصمة إلا من داخل النطاق
                </p>
              </div>
              <Switch
                checked={settings.geofenceEnabled}
                onCheckedChange={(checked) =>
                  setSettings((previous) => ({
                    ...previous,
                    geofenceEnabled: checked,
                  }))
                }
              />
            </div>

            {settings.geofenceEnabled && (
              <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>خط العرض (Latitude)</Label>
                    <Input
                      type="text"
                      placeholder="30.0444"
                      value={settings.officeLatitude}
                      onChange={(e) =>
                        setSettings((previous) => ({
                          ...previous,
                          officeLatitude: e.target.value,
                        }))
                      }
                      className="tabular-nums font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>خط الطول (Longitude)</Label>
                    <Input
                      type="text"
                      placeholder="31.2357"
                      value={settings.officeLongitude}
                      onChange={(e) =>
                        setSettings((previous) => ({
                          ...previous,
                          officeLongitude: e.target.value,
                        }))
                      }
                      className="tabular-nums font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>نطاق البصمة المسموح</Label>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400 tabular-nums font-mono">
                      {settings.geofenceRadius} متر
                    </span>
                  </div>
                  <Input
                    type="number"
                    min={50}
                    max={5000}
                    step={50}
                    value={settings.geofenceRadius}
                    onChange={(e) =>
                      setSettings((previous) => ({
                        ...previous,
                        geofenceRadius: parseInt(e.target.value) || 200,
                      }))
                    }
                    className="tabular-nums font-mono"
                  />
                  <p className="text-xs text-gray-500">
                    يفضل ألا يقل عن 100 متر لتجنب أخطاء الـ GPS الضعيف
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t mt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={onGetCurrentLocation}
                    disabled={gettingLocation}
                    className="flex items-center gap-2"
                  >
                    {gettingLocation ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Navigation className="h-4 w-4" />
                    )}
                    تحديد موقفي الآن
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onTestCurrentLocation}
                    disabled={
                      testingLocation ||
                      !settings.officeLatitude ||
                      !settings.officeLongitude
                    }
                    className="flex items-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    اختبار الدقة والموقع
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onOpenInGoogleMaps}
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    المعاينة على الخريطة
                  </Button>
                </div>

                {locationTestResult && (
                  <div
                    className={`p-4 rounded-xl border-2 ${
                      locationTestResult.isWithinRange
                        ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                        : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-full ${
                          locationTestResult.isWithinRange
                            ? "bg-green-100 dark:bg-green-900"
                            : "bg-red-100 dark:bg-red-900"
                        }`}
                      >
                        {locationTestResult.isWithinRange ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold">
                          الحالة:{" "}
                          {locationTestResult.isWithinRange
                            ? "داخل النطاق"
                            : "خارج النطاق"}
                        </p>
                        <p className="text-sm opacity-80 tabular-nums font-mono">
                          المسافة: {locationTestResult.distance} متر من المركز
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="engine" className="space-y-6 animate-in fade-in duration-300">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-green-600" />
              محرك الحسابات المتقدم وشروط العمل
            </CardTitle>
            <CardDescription>
              ضبط المعايير التي يعتمد عليها النظام في حساب معدلات الساعة واليوم والخصومات المالية
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <CalculationEngine settings={settings} setSettings={setSettings} />
            <Separator className="opacity-50" />
            <PunctualityNotifications settings={settings} setSettings={setSettings} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
