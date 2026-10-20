import React from "react";
import { Loader2, Trash2, Users } from "lucide-react";
import { Button } from "../../../../../components/ui/button";
import { Input } from "../../../../../components/ui/input";
import { Label } from "../../../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../../components/ui/select";
import type {
  HRSettingsData,
  NotificationRecipientEmployeeOption,
} from "../../types/hrSettingsTypes";

interface NotificationRecipientsSectionProps {
  settings: HRSettingsData;
  setSettings: React.Dispatch<React.SetStateAction<HRSettingsData>>;
  availableRecipientEmployees: NotificationRecipientEmployeeOption[];
  loadingRecipientEmployees: boolean;
  selectedRecipientEmployeeId: string;
  setSelectedRecipientEmployeeId: (id: string) => void;
  onAddSelectedRecipientEmployee: () => void;
}

const NOTIFICATION_TYPES_LIST = [
  { id: "ALL", label: "الكل" },
  { id: "LEAVE", label: "إجازات" },
  { id: "ADVANCE", label: "سلف" },
  { id: "ATTENDANCE", label: "حضور" },
  { id: "PAYROLL", label: "رواتب" },
  { id: "DEDUCTION", label: "خصومات" },
  { id: "WARNING", label: "إنذارات" },
  { id: "PROBATION_END", label: "نهاية التجربة" },
  { id: "CONTRACT_EXPIRY", label: "انتهاء العقد" },
  { id: "PROMOTION", label: "ترقيات" },
  { id: "RESIGNATION", label: "استقالات" },
  { id: "TRAINING", label: "تدريب" },
  { id: "KUDOS", label: "تقدير" },
];

export const NotificationRecipientsSection: React.FC<NotificationRecipientsSectionProps> = ({
  settings,
  setSettings,
  availableRecipientEmployees,
  loadingRecipientEmployees,
  selectedRecipientEmployeeId,
  setSelectedRecipientEmployeeId,
  onAddSelectedRecipientEmployee,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold">مستلمين إضافيين</Label>
          <p className="text-sm text-gray-500 mt-1">
            اختاري الموظفين الذين سيستقبلون إشعارات واتساب المحددة
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
        <div className="space-y-2">
          <Label>اختيار الموظف</Label>
          <Select
            value={selectedRecipientEmployeeId}
            onValueChange={setSelectedRecipientEmployeeId}
            disabled={loadingRecipientEmployees}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  loadingRecipientEmployees
                    ? "جاري تحميل الموظفين..."
                    : "اختاري موظفًا لإضافته"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {availableRecipientEmployees.map((employee) => {
                const isAlreadyAdded = settings.notificationRecipients.some(
                  (recipient) =>
                    recipient.employeeId === employee.id ||
                    recipient.phone === employee.phone,
                );

                return (
                  <SelectItem
                    key={employee.id}
                    value={employee.id}
                    disabled={isAlreadyAdded || !employee.phone}
                  >
                    {employee.name}
                    {employee.employeeNumber ? ` - ${employee.employeeNumber}` : ""}
                    {employee.department ? ` - ${employee.department}` : ""}
                    {!employee.phone ? " - بدون رقم واتساب" : ""}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            لن يظهر الموظف للإضافة إذا كان مضافًا بالفعل، والموظف بدون رقم واتساب لا يمكن اختياره.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={onAddSelectedRecipientEmployee}
          disabled={!selectedRecipientEmployeeId || loadingRecipientEmployees}
          className="gap-1 md:self-end"
        >
          {loadingRecipientEmployees ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Users className="h-4 w-4" />
          )}
          إضافة الموظف
        </Button>
      </div>

      {settings.notificationRecipients.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          <Users className="h-10 w-10 mx-auto text-gray-400 mb-2" />
          <p className="text-gray-500">لا يوجد مستلمين إضافيين</p>
          <p className="text-xs text-gray-400 mt-1">الإشعارات تُرسل فقط لرقم المالك الأساسي</p>
        </div>
      )}

      {settings.notificationRecipients.map((recipient, index) => {
        const linkedEmployee = recipient.employeeId
          ? availableRecipientEmployees.find((employee) => employee.id === recipient.employeeId)
          : null;

        return (
          <div
            key={`${recipient.employeeId || recipient.phone || "recipient"}-${index}`}
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3 bg-gray-50 dark:bg-gray-800/50"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-sm font-medium text-gray-500 tabular-nums font-mono">
                  مستلم #{index + 1}
                </span>
                {linkedEmployee ? (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    من قائمة الموظفين
                  </p>
                ) : (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    مستلم محفوظ يدويًا
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const updated = settings.notificationRecipients.filter((_, i) => i !== index);
                  setSettings((previous) => ({ ...previous, notificationRecipients: updated }));
                }}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                aria-label="حذف المستلم"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">الموظف</Label>
                <Select
                  value={recipient.employeeId || "__manual__"}
                  onValueChange={(value) => {
                    const updated = [...settings.notificationRecipients];
                    if (value === "__manual__") {
                      updated[index] = {
                        ...updated[index],
                        employeeId: undefined,
                      };
                    } else {
                      const selectedEmployee = availableRecipientEmployees.find(
                        (employee) => employee.id === value,
                      );
                      if (!selectedEmployee) return;
                      updated[index] = {
                        ...updated[index],
                        employeeId: selectedEmployee.id,
                        name: selectedEmployee.name,
                        phone: selectedEmployee.phone,
                      };
                    }
                    setSettings((previous) => ({
                      ...previous,
                      notificationRecipients: updated,
                    }));
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="اختاري موظفًا" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__manual__">إدخال يدوي</SelectItem>
                    {availableRecipientEmployees.map((employee) => (
                      <SelectItem
                        key={employee.id}
                        value={employee.id}
                        disabled={
                          !employee.phone ||
                          settings.notificationRecipients.some(
                            (otherRecipient, otherIndex) =>
                              otherIndex !== index &&
                              (otherRecipient.employeeId === employee.id ||
                                otherRecipient.phone === employee.phone),
                          )
                        }
                      >
                        {employee.name}
                        {employee.employeeNumber ? ` - ${employee.employeeNumber}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">رقم واتساب</Label>
                <Input
                  value={recipient.phone}
                  onChange={(e) => {
                    const updated = [...settings.notificationRecipients];
                    updated[index] = {
                      ...updated[index],
                      phone: e.target.value,
                    };
                    setSettings((previous) => ({
                      ...previous,
                      notificationRecipients: updated,
                    }));
                  }}
                  placeholder="01009876543"
                  dir="ltr"
                  readOnly={Boolean(recipient.employeeId)}
                  className="mt-1 font-mono tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">الاسم</Label>
                <Input
                  value={recipient.name}
                  onChange={(e) => {
                    const updated = [...settings.notificationRecipients];
                    updated[index] = {
                      ...updated[index],
                      name: e.target.value,
                    };
                    setSettings((previous) => ({
                      ...previous,
                      notificationRecipients: updated,
                    }));
                  }}
                  placeholder="مثال: أحمد - مدير HR"
                  readOnly={Boolean(recipient.employeeId)}
                  className="mt-1"
                />
              </div>
              <div className="text-xs text-gray-500 self-end">
                {linkedEmployee ? (
                  <>
                    {linkedEmployee.department
                      ? `القسم: ${linkedEmployee.department}`
                      : "الموظف مرتبط مباشرة بقائمة الشركة"}
                  </>
                ) : (
                  "يمكنك تحويل هذا المستلم إلى موظف من القائمة أو إبقاؤه محفوظًا يدويًا."
                )}
              </div>
            </div>

            <div>
              <Label className="text-xs">أنواع الإشعارات</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {NOTIFICATION_TYPES_LIST.map((type) => {
                  const isSelected = recipient.types.includes(type.id);
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => {
                        const updated = [...settings.notificationRecipients];
                        let newTypes: string[];
                        if (type.id === "ALL") {
                          newTypes = isSelected ? [] : ["ALL"];
                        } else {
                          newTypes = isSelected
                            ? recipient.types.filter((t) => t !== type.id)
                            : [...recipient.types.filter((t) => t !== "ALL"), type.id];
                        }
                        updated[index] = { ...updated[index], types: newTypes };
                        setSettings((previous) => ({
                          ...previous,
                          notificationRecipients: updated,
                        }));
                      }}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                        isSelected
                          ? "bg-green-100 dark:bg-green-900/40 border-green-400 text-green-700 dark:text-green-300 font-medium"
                          : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-green-300"
                      }`}
                    >
                      {isSelected ? "محدد " : ""}{type.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
