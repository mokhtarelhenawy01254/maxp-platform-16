import React from "react";
import {
  Plus,
  Eye,
  Palmtree,
  Wallet,
  Calendar,
  Clock,
  AlertTriangle,
  FileText,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../../components/ui/dialog";
import { Label } from "../../../components/ui/label";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Checkbox } from "../../../components/ui/checkbox";
import { Button } from "../../../components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { LeaveFormData, leaveTypeConfig } from "./types";
import { DateInput } from '../../../components/ui/DateInput';

interface AddLeaveDialogProps {
  t: (key: string, options?: any) => string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isMyLeaves: boolean;
  employees: any[];
  formData: LeaveFormData;
  setFormData: React.Dispatch<React.SetStateAction<LeaveFormData>>;
  fieldErrors: Record<string, string>;
  totalDaysCount: number;
  onSubmit: () => void;
}

export const AddLeaveDialog: React.FC<AddLeaveDialogProps> = ({
  t,
  open,
  onOpenChange,
  isMyLeaves,
  employees,
  formData,
  setFormData,
  fieldErrors,
  totalDaysCount,
  onSubmit,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <DialogHeader className="text-right">
          <DialogTitle className="text-2xl font-bold flex items-center justify-end gap-2">
            <Plus className="h-6 w-6 text-primary" />
            {t("employee.leaves.dialogTitle")}
          </DialogTitle>
          <DialogDescription className="text-right text-gray-500 dark:text-gray-400">
            {t("employee.leaves.dialogDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {!isMyLeaves && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Eye className="h-4 w-4" />
                {t("employee.leaves.employeeLabel")}
              </Label>
              <Select
                value={formData.employeeId}
                onValueChange={(value) =>
                  setFormData({ ...formData, employeeId: value })
                }
              >
                <SelectTrigger className="w-full bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-right dir-rtl">
                  <SelectValue placeholder={t("employee.leaves.employeePlaceholder")} />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                  {employees.map((emp) => (
                    <SelectItem
                      key={emp.id}
                      value={emp.id}
                      className="justify-end cursor-pointer"
                    >
                      <div className="flex items-center gap-2 flex-row-reverse">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={emp.avatar} />
                          <AvatarFallback className="text-[10px]">
                            {emp.firstName?.[0]}
                            {emp.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span>
                          {emp.firstName} {emp.lastName}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors["employeeId"] && (
                <p className="text-xs text-red-500 mt-1 mr-1">
                  {fieldErrors["employeeId"]}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Palmtree className="h-4 w-4" />
              {t("employee.leaves.leaveTypeLabel")}
            </Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  type: value,
                  isPaid: value === "UNPAID" ? false : formData.isPaid,
                })
              }
            >
              <SelectTrigger
                className={`w-full bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-right dir-rtl ${
                  fieldErrors["type"] ? "border-red-500 ring-red-500" : ""
                }`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                {Object.entries(leaveTypeConfig).map(([key, config]) => (
                  <SelectItem
                    key={key}
                    value={key}
                    className="justify-end cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-800"
                  >
                    <div className="flex items-center gap-2 flex-row-reverse">
                      <config.icon
                        className={`h-4 w-4 ${config.color.split(" ")[1]}`}
                      />
                      <span>{t(config.labelKey)}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors["type"] && (
              <p className="text-xs text-red-500 mt-1 mr-1">
                {fieldErrors["type"]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Wallet className="h-4 w-4" />
              {t("employee.leaves.payStatusLabel")}
            </Label>
            <Select
              value={formData.isPaid ? "PAID" : "UNPAID"}
              onValueChange={(value) => {
                const isPaid = value === "PAID";
                setFormData({
                  ...formData,
                  isPaid,
                  type:
                    !isPaid && formData.type !== "UNPAID"
                      ? "UNPAID"
                      : isPaid && formData.type === "UNPAID"
                      ? "ANNUAL"
                      : formData.type,
                });
              }}
            >
              <SelectTrigger className="w-full bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-right dir-rtl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <SelectItem value="PAID">{t("employee.leaves.paidOption")}</SelectItem>
                <SelectItem value="UNPAID">{t("employee.leaves.unpaidOption")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Calendar className="h-4 w-4" />
                {t("employee.leaves.fromDateLabel")}
              </Label>
              <DateInput
                
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                className={`bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 ${
                  fieldErrors["startDate"] ? "border-red-500" : ""
                }`}
              />
              {fieldErrors["startDate"] && (
                <p className="text-xs text-red-500 mt-1 mr-1">
                  {fieldErrors["startDate"]}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Calendar className="h-4 w-4" />
                {t("employee.leaves.toDateLabel")}
              </Label>
              <DateInput
                
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
                className={`bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 ${
                  fieldErrors["endDate"] ? "border-red-500" : ""
                }`}
              />
              {fieldErrors["endDate"] && (
                <p className="text-xs text-red-500 mt-1 mr-1">
                  {fieldErrors["endDate"]}
                </p>
              )}
            </div>
          </div>

          {/* Duration Display */}
          {formData.startDate && formData.endDate && (
            <div
              className={`p-4 rounded-lg flex items-center justify-between ${
                totalDaysCount === -1
                  ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30"
                  : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30"
              }`}
            >
              <div className="flex items-center gap-2">
                {totalDaysCount === -1 ? (
                  <AlertTriangle className="h-5 w-5" />
                ) : (
                  <Clock className="h-5 w-5" />
                )}
                <span className="font-medium font-mono tabular-nums">
                  {totalDaysCount === -1
                    ? t("employee.leaves.endDateAfterStart")
                    : totalDaysCount === 0
                    ? t("employee.leaves.weekendWarning")
                    : t("employee.leaves.durationLabel", { days: totalDaysCount })}
                </span>
              </div>
            </div>
          )}

          <div
            className={`p-3 rounded-lg border transition-colors ${
              formData.isHalfDay
                ? "bg-primary/5 border-primary/20"
                : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            }`}
          >
            <div className="flex items-center justify-between flex-row-reverse">
              <div className="flex items-center gap-3 flex-row-reverse">
                <div className="p-2 bg-white dark:bg-gray-900 rounded-md border border-gray-100 dark:border-gray-700">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div className="text-right">
                  <Label className="text-sm font-medium">{t("employee.leaves.halfDay")}</Label>
                  <p className="text-xs text-gray-500">
                    {t("employee.leaves.halfDayDesc")}
                  </p>
                </div>
              </div>
              <Checkbox
                id="isHalfDay"
                checked={formData.isHalfDay}
                onCheckedChange={(checked: boolean) =>
                  setFormData({ ...formData, isHalfDay: checked })
                }
              />
            </div>

            {formData.isHalfDay && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                <Label className="text-xs text-gray-500 block text-right">
                  {t("employee.leaves.halfDayPeriod")}
                </Label>
                <Select
                  value={formData.halfDayPeriod}
                  onValueChange={(value) =>
                    setFormData({ ...formData, halfDayPeriod: value })
                  }
                >
                  <SelectTrigger
                    className={`w-full bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-right ${
                      fieldErrors["halfDayPeriod"] ? "border-red-500" : ""
                    }`}
                  >
                    <SelectValue placeholder={t("employee.leaves.periodPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                    <SelectItem value="MORNING" className="justify-end">
                      {t("employee.leaves.morningPeriod")}
                    </SelectItem>
                    <SelectItem value="AFTERNOON" className="justify-end">
                      {t("employee.leaves.afternoonPeriod")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {fieldErrors["halfDayPeriod"] && (
                  <p className="text-xs text-red-500 mt-1 mr-1">
                    {fieldErrors["halfDayPeriod"]}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <FileText className="h-4 w-4" />
              {t("employee.leaves.reasonLabel")}
            </Label>
            <Textarea
              value={formData.reason}
              onChange={(e) =>
                setFormData({ ...formData, reason: e.target.value })
              }
              placeholder={t("employee.leaves.reasonPlaceholder")}
              rows={3}
              className={`bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-right ${
                fieldErrors["reason"] ? "border-red-500" : ""
              }`}
            />
            {fieldErrors["reason"] && (
              <p className="text-xs text-red-500 mt-1 mr-1">
                {fieldErrors["reason"]}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex-row-reverse sm:justify-start gap-2">
          <Button
            onClick={onSubmit}
            disabled={
              totalDaysCount <= 0 ||
              !formData.startDate ||
              !formData.endDate ||
              (!isMyLeaves && !formData.employeeId)
            }
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white w-full sm:w-auto"
          >
            {t("employee.leaves.submitButton")}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            {t("employee.leaves.cancelButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
