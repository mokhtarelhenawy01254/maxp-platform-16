import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  FileText,
  Palmtree,
  Wallet,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { LeaveRequest, EditLeaveFormData, leaveTypeConfig } from "./types";
import { DateInput } from '../../../components/ui/DateInput';

interface LeaveEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRequest: LeaveRequest | null;
  editFormData: EditLeaveFormData;
  setEditFormData: React.Dispatch<React.SetStateAction<EditLeaveFormData>>;
  onSaveEdit: () => void;
  t: (key: string, options?: any) => string;
}

export const LeaveEditDialog: React.FC<LeaveEditDialogProps> = ({
  open,
  onOpenChange,
  selectedRequest,
  editFormData,
  setEditFormData,
  onSaveEdit,
  t,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <DialogHeader className="text-right">
          <DialogTitle className="text-2xl font-bold flex items-center justify-end gap-2">
            <ArrowRight className="h-6 w-6 text-amber-600" />
            {t("employee.leaves.editTitle")}
          </DialogTitle>
          <DialogDescription className="text-right text-gray-500 dark:text-gray-400">
            {t("employee.leaves.editDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {selectedRequest && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <h3 className="font-medium text-amber-800 dark:text-amber-400">
                  {t("employee.leaves.editRejectedTitle")}
                </h3>
              </div>
              <p className="mt-2 text-amber-700 dark:text-amber-500 text-sm">
                {t("employee.leaves.rejectedEditNote")}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Palmtree className="h-4 w-4" />
              {t("employee.leaves.leaveTypeLabel")}
            </Label>
            <Select
              value={editFormData.type}
              onValueChange={(value) =>
                setEditFormData({
                  ...editFormData,
                  type: value,
                  isPaid: value === "UNPAID" ? false : editFormData.isPaid,
                })
              }
            >
              <SelectTrigger className="w-full bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-right dir-rtl">
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
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Wallet className="h-4 w-4" />
              {t("employee.leaves.payStatusLabel")}
            </Label>
            <Select
              value={editFormData.isPaid ? "PAID" : "UNPAID"}
              onValueChange={(value) => {
                const isPaid = value === "PAID";
                setEditFormData({
                  ...editFormData,
                  isPaid,
                  type:
                    !isPaid && editFormData.type !== "UNPAID"
                      ? "UNPAID"
                      : isPaid && editFormData.type === "UNPAID"
                        ? "ANNUAL"
                        : editFormData.type,
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
                
                value={editFormData.startDate}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    startDate: e.target.value,
                  })
                }
                className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Calendar className="h-4 w-4" />
                {t("employee.leaves.toDateLabel")}
              </Label>
              <DateInput
                
                value={editFormData.endDate}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    endDate: e.target.value,
                  })
                }
                className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <FileText className="h-4 w-4" />
              {t("employee.leaves.reasonLabel")}
            </Label>
            <Textarea
              value={editFormData.reason}
              onChange={(e) =>
                setEditFormData({ ...editFormData, reason: e.target.value })
              }
              placeholder={t("employee.leaves.reasonPlaceholder")}
              rows={3}
              className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-right dir-rtl"
            />
          </div>

          <div
            className={`p-3 rounded-lg border transition-colors ${
              editFormData.isHalfDay
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
                id="editIsHalfDay"
                checked={editFormData.isHalfDay}
                onCheckedChange={(checked: boolean) =>
                  setEditFormData({ ...editFormData, isHalfDay: checked })
                }
              />
            </div>

            {editFormData.isHalfDay && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                <Label className="text-xs text-gray-500 block text-right">
                  {t("employee.leaves.halfDayPeriod")}
                </Label>
                <Select
                  value={editFormData.halfDayPeriod}
                  onValueChange={(value) =>
                    setEditFormData({ ...editFormData, halfDayPeriod: value })
                  }
                >
                  <SelectTrigger className="w-full bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-right dir-rtl">
                    <SelectValue placeholder={t("employee.leaves.periodPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value="MORNING"
                      className="justify-end cursor-pointer"
                    >
                      {t("employee.leaves.morningPeriod")}
                    </SelectItem>
                    <SelectItem
                      value="AFTERNOON"
                      className="justify-end cursor-pointer"
                    >
                      {t("employee.leaves.afternoonPeriod")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("employee.leaves.cancelButton")}
          </Button>
          <Button
            variant="default"
            onClick={onSaveEdit}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {t("employee.leaves.saveEdit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
