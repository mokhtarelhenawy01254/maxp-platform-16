import React from "react";
import { AlertCircle, CheckCircle2, ExternalLink, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";
import { Separator } from "../../../../components/ui/separator";
import { NotificationRecipientsSection } from "./notifications/NotificationRecipientsSection";
import type {
  HRSettingsData,
  NotificationHealth,
  NotificationRecipientEmployeeOption,
} from "../types/hrSettingsTypes";

interface HRNotificationsTabProps {
  settings: HRSettingsData;
  setSettings: React.Dispatch<React.SetStateAction<HRSettingsData>>;
  errors: Record<string, string>;
  notificationHealth: NotificationHealth | null;
  availableRecipientEmployees: NotificationRecipientEmployeeOption[];
  loadingRecipientEmployees: boolean;
  selectedRecipientEmployeeId: string;
  setSelectedRecipientEmployeeId: (id: string) => void;
  onAddSelectedRecipientEmployee: () => void;
  connectedSessionCount: number;
  hasConnectedSession: boolean;
  activeNotificationIssues: string[];
  readyRecipientsCount: number;
  configuredAdditionalRecipientsCount: number;
  isWhatsAppDeliveryReady: boolean;
}

export const HRNotificationsTab: React.FC<HRNotificationsTabProps> = ({
  settings,
  setSettings,
  errors,
  notificationHealth,
  availableRecipientEmployees,
  loadingRecipientEmployees,
  selectedRecipientEmployeeId,
  setSelectedRecipientEmployeeId,
  onAddSelectedRecipientEmployee,
  connectedSessionCount,
  hasConnectedSession,
  activeNotificationIssues,
  readyRecipientsCount,
  configuredAdditionalRecipientsCount,
  isWhatsAppDeliveryReady,
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>إعدادات الإشعارات</CardTitle>
          <CardDescription>
            تكوين إشعارات نظام HR داخل النظام، وعلى واتساب أيضًا عند تفعيل قسم واتساب بالأسفل
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100">
            هذه السويتشات تتحكم في تشغيل نوع الإشعار نفسه. إذا كان قسم واتساب مفعّلًا وتم ضبط الأرقام والمستلمين، فسيصل نفس النوع على واتساب أيضًا.
          </div>
          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div>
              <Label>إشعار عند طلب إجازة جديد</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                إشعار داخل النظام وعلى واتساب عند تقديم طلب إجازة جديد
              </p>
            </div>
            <Switch
              checked={settings.notifyOnLeaveRequest}
              onCheckedChange={(checked) =>
                setSettings((previous) => ({
                  ...previous,
                  notifyOnLeaveRequest: checked,
                }))
              }
            />
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div>
              <Label>إشعار عند مشاكل الحضور</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                إشعار عند التأخير أو الانصراف المبكر، وليس الحضور العادي
              </p>
            </div>
            <Switch
              checked={settings.notifyOnAttendanceIssue}
              onCheckedChange={(checked) =>
                setSettings((previous) => ({
                  ...previous,
                  notifyOnAttendanceIssue: checked,
                }))
              }
            />
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div>
              <Label>إشعار عند توليد الرواتب</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                إشعار عند إنشاء كشف راتب فردي أو توليد كشوف الرواتب الشهرية
              </p>
            </div>
            <Switch
              checked={settings.notifyOnPayrollGeneration}
              onCheckedChange={(checked) =>
                setSettings((previous) => ({
                  ...previous,
                  notifyOnPayrollGeneration: checked,
                }))
              }
            />
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div>
              <Label>إشعار عند إصدار إنذار</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                إشعار الموظف والمدير عند إصدار إنذار
              </p>
            </div>
            <Switch
              checked={settings.notifyOnWarning}
              onCheckedChange={(checked) =>
                setSettings((previous) => ({ ...previous, notifyOnWarning: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div>
              <Label>إشعار قبل انتهاء فترة الاختبار</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                تنبيه داخل النظام وعلى واتساب قبل انتهاء فترة التجربة
              </p>
            </div>
            <Switch
              checked={settings.notifyOnProbationEnd}
              onCheckedChange={(checked) =>
                setSettings((previous) => ({
                  ...previous,
                  notifyOnProbationEnd: checked,
                }))
              }
            />
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div>
              <Label>إشعار قبل انتهاء العقد</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                تنبيه داخل النظام وعلى واتساب قبل انتهاء عقد الموظف
              </p>
            </div>
            <Switch
              checked={settings.notifyOnContractExpiry}
              onCheckedChange={(checked) =>
                setSettings((previous) => ({
                  ...previous,
                  notifyOnContractExpiry: checked,
                }))
              }
            />
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div>
              <Label>إشعار المدراء</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                إرسال نسخة من الإشعارات لمدراء الأقسام
              </p>
            </div>
            <Switch
              checked={settings.notifyManagers}
              onCheckedChange={(checked) =>
                setSettings((previous) => ({ ...previous, notifyManagers: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Notification Recipients */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-500" />
            إشعارات واتساب للمسؤولين
          </CardTitle>
          <CardDescription>
            إدارة الأشخاص الذين يستقبلون إشعارات واتساب. أنواع الإشعارات نفسها تُفتح وتُغلق من السويتشات الموجودة بالأعلى.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div>
              <Label className="text-base font-semibold">تفعيل إشعارات واتساب للمسؤولين</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                رسائل واتساب جاهزة لكل إجراءات الموظفين حسب النبرة وأنواع الإشعارات المختارة
              </p>
            </div>
            <Switch
              checked={settings.aiOwnerNotificationsEnabled}
              onCheckedChange={(checked) =>
                setSettings((previous) => ({
                  ...previous,
                  aiOwnerNotificationsEnabled: checked,
                }))
              }
            />
          </div>

          {settings.aiOwnerNotificationsEnabled && (
            <>
              <div
                className={`rounded-lg border p-4 ${
                  isWhatsAppDeliveryReady
                    ? "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950/30 dark:text-green-100"
                    : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 font-semibold">
                      {isWhatsAppDeliveryReady ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      {isWhatsAppDeliveryReady
                        ? "واتساب جاهز لإرسال إشعارات HR"
                        : "واتساب غير جاهز للإرسال حتى الآن"}
                    </div>
                    <p className="tabular-nums font-mono">
                      الجلسات المتصلة: {connectedSessionCount}
                      {" • "}
                      المستلمين المجهزين: {readyRecipientsCount}
                    </p>
                    {activeNotificationIssues.includes("no_recipient_configured") && (
                      <p>
                        لن تصل أي رسالة لأن رقم المالك الأساسي فارغ ولا يوجد مستلمون إضافيون محفوظون.
                      </p>
                    )}
                    {activeNotificationIssues.includes("no_whatsapp_session") && (
                      <p>
                        لن تصل أي رسالة لأن الشركة لا تملك جلسة واتساب متصلة الآن.
                      </p>
                    )}
                    {notificationHealth?.hasCompanyPhoneFallback &&
                      !settings.ownerWhatsAppNumber.trim() &&
                      configuredAdditionalRecipientsCount === 0 && (
                        <p>
                          يوجد fallback على رقم الشركة، لكن الأفضل تحديد رقم المالك أو مستلمين واضحين من هنا.
                        </p>
                      )}
                  </div>

                  {!hasConnectedSession && (
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2 whitespace-nowrap"
                      onClick={() => navigate("/whatsapp/settings")}
                    >
                      <ExternalLink className="h-4 w-4" />
                      فتح إعدادات واتساب
                    </Button>
                  )}
                </div>
              </div>

              {/* Owner Primary Phone */}
              <div className="space-y-2">
                <Label>رقم واتساب المالك (الأساسي)</Label>
                <Input
                  value={settings.ownerWhatsAppNumber}
                  onChange={(e) =>
                    setSettings((previous) => ({
                      ...previous,
                      ownerWhatsAppNumber: e.target.value,
                    }))
                  }
                  placeholder="مثال: 01001234567"
                  dir="ltr"
                  className="font-mono tabular-nums"
                />
                <p className="text-xs text-gray-500">هذا الرقم يستقبل كل أنواع الإشعارات</p>
                {errors.aiOwnerNotificationsEnabled && (
                  <p className="text-xs text-red-500">
                    {errors.aiOwnerNotificationsEnabled}
                  </p>
                )}
              </div>

              <Separator />

              {/* Additional Recipients Section */}
              <NotificationRecipientsSection
                settings={settings}
                setSettings={setSettings}
                availableRecipientEmployees={availableRecipientEmployees}
                loadingRecipientEmployees={loadingRecipientEmployees}
                selectedRecipientEmployeeId={selectedRecipientEmployeeId}
                setSelectedRecipientEmployeeId={setSelectedRecipientEmployeeId}
                onAddSelectedRecipientEmployee={onAddSelectedRecipientEmployee}
              />

              <Separator />

              {/* Notification Tone */}
              <div className="space-y-2">
                <Label>نبرة الرسالة</Label>
                <Select
                  value={settings.aiNotificationTone}
                  onValueChange={(value) =>
                    setSettings((previous) => ({
                      ...previous,
                      aiNotificationTone: value as any,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PROFESSIONAL">مهني ورسمي</SelectItem>
                    <SelectItem value="FRIENDLY">ودي ولطيف</SelectItem>
                    <SelectItem value="URGENT">عاجل ومباشر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
