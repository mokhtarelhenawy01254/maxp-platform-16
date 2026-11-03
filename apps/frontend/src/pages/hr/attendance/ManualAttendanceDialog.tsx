import React from "react";
import { Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ManualAttendanceForm, ManualOverrides, EmployeeSimple } from "./types";
import { getLocalTimeString } from "./helpers";
import { DateInput } from '../../../components/ui/DateInput';

interface ManualAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditMode: boolean;
  editingRecordId?: string | null;
  manualForm: ManualAttendanceForm;
  setManualForm: React.Dispatch<React.SetStateAction<ManualAttendanceForm>>;
  manualOverrides: ManualOverrides;
  setManualOverrides: React.Dispatch<React.SetStateAction<ManualOverrides>>;
  employees: EmployeeSimple[];
  attendanceTimezone: string;
  onSubmit: () => void;
  onReset: () => void;
  onCheckOutNow?: (employeeId: string) => void;
}

export const ManualAttendanceDialog: React.FC<ManualAttendanceDialogProps> = ({
  open,
  onOpenChange,
  isEditMode,
  editingRecordId,
  manualForm,
  setManualForm,
  manualOverrides,
  setManualOverrides,
  employees,
  attendanceTimezone,
  onSubmit,
  onReset,
  onCheckOutNow,
}) => {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onReset();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "تعديل سجل حضور" : "تسجيل حضور يدوي"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4" dir="rtl">
          <div className="space-y-2">
            <Label>
              الموظف <span className="text-red-500">*</span>
            </Label>
            <select
              value={manualForm.employeeId}
              onChange={(e) =>
                setManualForm({ ...manualForm, employeeId: e.target.value })
              }
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            >
              <option value="" disabled>
                اختر موظف
              </option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} - {emp.employeeNumber}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>التاريخ</Label>
              <DateInput
                
                value={manualForm.date}
                onChange={(e) =>
                  setManualForm({ ...manualForm, date: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <Label>الحالة</Label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 shadow-sm w-3 h-3 focus:ring-blue-500"
                    checked={manualOverrides.status}
                    onChange={(e) =>
                      setManualOverrides((prev) => ({
                        ...prev,
                        status: e.target.checked,
                      }))
                    }
                  />
                  <span className="text-[10px] text-gray-500">تثبيت يدوي</span>
                </label>
              </div>
              <Select
                value={manualForm.status}
                disabled={!manualOverrides.status}
                onValueChange={(v) => {
                  setManualForm({ ...manualForm, status: v ?? "PRESENT" });
                }}
              >
                <SelectTrigger
                  className={!manualOverrides.status ? "opacity-50" : ""}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRESENT">حاضر</SelectItem>
                  <SelectItem value="LATE">متأخر</SelectItem>
                  <SelectItem value="ABSENT">غائب</SelectItem>
                  <SelectItem value="HALF_DAY">نصف يوم</SelectItem>
                  <SelectItem value="ON_LEAVE">إجازة</SelectItem>
                  <SelectItem value="HOLIDAY">عطلة</SelectItem>
                  <SelectItem value="REMOTE">عن بُعد</SelectItem>
                  <SelectItem value="OVERTIME">إضافي (يوم راحة)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>وقت الحضور</Label>
              <div className="flex gap-1">
                <Input
                  type="time"
                  value={manualForm.checkIn}
                  onChange={(e) =>
                    setManualForm({ ...manualForm, checkIn: e.target.value })
                  }
                />
                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  onClick={() => {
                    setManualForm({
                      ...manualForm,
                      checkIn: getLocalTimeString(
                        new Date(),
                        attendanceTimezone,
                      ),
                    });
                  }}
                  title="الآن"
                >
                  <Clock className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>وقت الانصراف</Label>
              <div className="flex gap-1">
                <Input
                  type="time"
                  value={manualForm.checkOut}
                  onChange={(e) =>
                    setManualForm({ ...manualForm, checkOut: e.target.value })
                  }
                />
                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  onClick={() => {
                    setManualForm({
                      ...manualForm,
                      checkOut: getLocalTimeString(
                        new Date(),
                        attendanceTimezone,
                      ),
                    });
                  }}
                  title="الآن"
                >
                  <Clock className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <Label className="text-red-600 font-bold">التأخير المعتمد</Label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-red-600 shadow-sm w-3 h-3 focus:ring-red-500"
                    checked={manualOverrides.late}
                    onChange={(e) =>
                      setManualOverrides((prev) => ({
                        ...prev,
                        late: e.target.checked,
                      }))
                    }
                  />
                  <span className="text-[10px] text-gray-500">تخطي الحساب</span>
                </label>
              </div>
              <div
                className={`flex items-center gap-2 ${
                  !manualOverrides.late ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                <div className="flex flex-col gap-1 items-center">
                  <span className="text-[10px] text-gray-500">ساعة</span>
                  <Input
                    type="number"
                    min="0"
                    value={manualForm.lateHours}
                    onChange={(e) =>
                      setManualForm({
                        ...manualForm,
                        lateHours: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-16 h-8 text-center"
                  />
                </div>
                <div className="flex flex-col gap-1 items-center">
                  <span className="text-[10px] text-gray-500">دقيقة</span>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={manualForm.lateMins}
                    onChange={(e) =>
                      setManualForm({
                        ...manualForm,
                        lateMins: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-16 h-8 text-center"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <Label className="text-orange-600 font-bold">انصراف مبكر</Label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-orange-600 shadow-sm w-3 h-3 focus:ring-orange-500"
                    checked={manualOverrides.early}
                    onChange={(e) =>
                      setManualOverrides((prev) => ({
                        ...prev,
                        early: e.target.checked,
                      }))
                    }
                  />
                  <span className="text-[10px] text-gray-500">تخطي الحساب</span>
                </label>
              </div>
              <div
                className={`flex items-center gap-2 ${
                  !manualOverrides.early
                    ? "opacity-50 pointer-events-none"
                    : ""
                }`}
              >
                <div className="flex flex-col gap-1 items-center">
                  <span className="text-[10px] text-gray-500">ساعة</span>
                  <Input
                    type="number"
                    min="0"
                    value={manualForm.earlyHours}
                    onChange={(e) =>
                      setManualForm({
                        ...manualForm,
                        earlyHours: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-16 h-8 text-center"
                  />
                </div>
                <div className="flex flex-col gap-1 items-center">
                  <span className="text-[10px] text-gray-500">دقيقة</span>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={manualForm.earlyMins}
                    onChange={(e) =>
                      setManualForm({
                        ...manualForm,
                        earlyMins: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-16 h-8 text-center"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>ملاحظات</Label>
            <Input
              value={manualForm.notes}
              onChange={(e) =>
                setManualForm({ ...manualForm, notes: e.target.value })
              }
              placeholder="ملاحظات إضافية..."
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {isEditMode &&
            editingRecordId &&
            !editingRecordId.startsWith("temp-") &&
            manualForm.checkIn &&
            !manualForm.checkOut &&
            onCheckOutNow && (
              <Button
                type="button"
                variant="outline"
                className="bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-600 hover:text-white"
                onClick={() => onCheckOutNow(manualForm.employeeId)}
              >
                تسجيل انصراف الآن
              </Button>
            )}
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={onSubmit} className="bg-blue-600 hover:bg-blue-700">
            {isEditMode ? "حفظ التعديلات" : "تسجيل الحضور"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
