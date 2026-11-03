import React from "react";
import { Plus, Clock, Check, Timer, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PermissionFormData, PermissionType } from "./types";
import { permissionTypeConfig, calculateHours } from "./helpers";
import { DateInput } from '../../../components/ui/DateInput';

interface AddPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: PermissionFormData;
  setFormData: React.Dispatch<React.SetStateAction<PermissionFormData>>;
  employees: any[];
  isMyPermissions: boolean;
  submitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export const AddPermissionDialog: React.FC<AddPermissionDialogProps> = ({
  open,
  onOpenChange,
  formData,
  setFormData,
  employees,
  isMyPermissions,
  submitting,
  onSubmit,
  onCancel,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[90vh] flex flex-col bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 p-0 overflow-hidden rounded-2xl shadow-2xl">
        <div className="bg-blue-600 p-4 sm:p-6 text-white text-right relative overflow-hidden shrink-0">
          <div className="relative z-10">
            <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center justify-end gap-2">
              <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
              {t("employee.permissions.dialogTitle")}
            </DialogTitle>
            <DialogDescription className="text-blue-100 mt-1 text-xs sm:text-sm">
              {t("employee.permissions.dialogDesc")}
            </DialogDescription>
          </div>
          <Clock className="absolute -left-10 -bottom-10 h-32 w-32 sm:h-40 sm:w-40 text-blue-500 opacity-20 rotate-12" />
        </div>

        <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
          {!isMyPermissions && (
            <div className="space-y-2">
              <Label className="text-right block font-bold text-gray-700 dark:text-gray-300 text-xs sm:text-sm">
                {t("employee.permissions.employeeLabel")}
              </Label>
              <Select
                value={formData.employeeId}
                onValueChange={(v) =>
                  setFormData({ ...formData, employeeId: v })
                }
              >
                <SelectTrigger className="bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 h-11 sm:h-12 text-right text-xs sm:text-sm">
                  <SelectValue placeholder={t("employee.permissions.employeePlaceholder")} />
                </SelectTrigger>
                <SelectContent className="max-h-[250px] p-2">
                  {employees.map((e) => (
                    <SelectItem
                      key={e.id}
                      value={e.id}
                      className="rounded-lg mb-1 focus:bg-blue-50 dark:focus:bg-blue-900/20"
                    >
                      <div className="flex items-center gap-3 flex-row-reverse px-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={e.avatar} />
                          <AvatarFallback>{e.firstName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="text-right">
                          <p className="font-bold text-sm">
                            {e.firstName} {e.lastName}
                          </p>
                          <p className="text-[10px] text-gray-500 font-mono">
                            {e.department?.name}
                          </p>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="col-span-1 sm:col-span-2 space-y-2">
              <Label className="text-right block font-bold text-gray-700 dark:text-gray-300 text-xs sm:text-sm">
                {t("employee.permissions.typeLabel")}
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {Object.entries(permissionTypeConfig).map(([key, config]) => (
                  <div
                    key={key}
                    onClick={() =>
                      setFormData({ ...formData, type: key as PermissionType })
                    }
                    className={`p-2.5 sm:p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col gap-1 text-right ${
                      formData.type === key
                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 ring-4 ring-blue-500/5"
                        : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      {formData.type === key ? (
                        <Check className="h-4 w-4 text-blue-600" />
                      ) : (
                        <div className="h-4 w-4" />
                      )}
                      <config.icon
                        className={`h-5 w-5 sm:h-6 sm:w-6 ${
                          formData.type === key ? "text-blue-600" : "text-gray-400"
                        }`}
                      />
                    </div>
                    <p
                      className={`font-bold text-xs sm:text-sm mt-0.5 sm:mt-1 ${
                        formData.type === key
                          ? "text-blue-700 dark:text-blue-400"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {t(`employee.permissions.${config.labelKey}`)}
                    </p>
                    <p className="text-[10px] text-gray-400 leading-tight">
                      {t(`employee.permissions.${config.descKey}`)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-right block font-bold text-gray-700 dark:text-gray-300 text-xs sm:text-sm">
                {t("employee.permissions.dateLabel")}
              </Label>
              <DateInput
                
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="h-11 sm:h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-right text-xs sm:text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-right block font-bold text-gray-700 dark:text-gray-300 text-xs sm:text-sm">
                {t("employee.permissions.urgencyLabel")}
              </Label>
              <div className="flex gap-2 h-11 sm:h-12">
                <Button
                  type="button"
                  variant={formData.isUrgent ? "default" : "outline"}
                  className={`flex-1 rounded-xl h-full border-gray-100 dark:border-gray-800 text-xs sm:text-sm ${
                    formData.isUrgent ? "bg-red-600 hover:bg-red-700" : ""
                  }`}
                  onClick={() =>
                    setFormData({ ...formData, isUrgent: !formData.isUrgent })
                  }
                >
                  {formData.isUrgent
                    ? t("employee.permissions.urgent")
                    : t("employee.permissions.normal")}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-right block font-bold text-gray-700 dark:text-gray-300 text-xs sm:text-sm">
                {t("employee.permissions.exitTime")}
              </Label>
              <Input
                type="time"
                value={formData.startTime}
                onChange={(e) =>
                  setFormData({ ...formData, startTime: e.target.value })
                }
                className="h-11 sm:h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-right font-bold font-mono tabular-nums text-xs sm:text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-right block font-bold text-gray-700 dark:text-gray-300 text-xs sm:text-sm">
                {t("employee.permissions.returnTime")}
              </Label>
              <Input
                type="time"
                value={formData.endTime}
                onChange={(e) =>
                  setFormData({ ...formData, endTime: e.target.value })
                }
                className="h-11 sm:h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-right font-bold font-mono tabular-nums text-xs sm:text-sm"
              />
            </div>

            <div className="col-span-1 sm:col-span-2 p-3 sm:p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-between border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <p className="text-2xl sm:text-3xl font-black text-blue-600 font-mono tabular-nums">
                  {calculateHours(formData.startTime, formData.endTime)}
                </p>
                <p className="text-[11px] sm:text-xs text-gray-500 font-bold uppercase tracking-widest">
                  {t("employee.permissions.totalHoursLabel")}
                </p>
              </div>
              <Timer className="h-8 w-8 sm:h-10 sm:w-10 text-gray-200 dark:text-gray-800" />
            </div>

            <div className="col-span-1 sm:col-span-2 space-y-2">
              <Label className="text-right block font-bold text-gray-700 dark:text-gray-300 text-xs sm:text-sm">
                {t("employee.permissions.reasonLabel")}
              </Label>
              <Textarea
                placeholder={t("employee.permissions.reasonPlaceholder")}
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                className="min-h-[90px] sm:min-h-[100px] bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-right resize-none rounded-2xl p-3 sm:p-4 text-xs sm:text-sm"
              />
            </div>

            <div className="col-span-1 sm:col-span-2 space-y-2">
              <Label className="text-right block font-bold text-gray-700 dark:text-gray-300 text-xs sm:text-sm">
                {t("employee.permissions.documentsLink")}
              </Label>
              <Input
                placeholder={t("employee.permissions.documentsPlaceholder")}
                value={formData.attachments}
                onChange={(e) =>
                  setFormData({ ...formData, attachments: e.target.value })
                }
                className="h-11 sm:h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-right rounded-2xl p-3 sm:p-4 text-xs sm:text-sm"
              />
              <p className="text-[10px] text-gray-400 text-right pr-2">
                {t("employee.permissions.documentsHint")}
              </p>
            </div>
          </div>
        </div>

        <div className="p-3.5 sm:p-6 bg-gray-50 dark:bg-gray-900/50 flex gap-2 sm:gap-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <Button
            variant="outline"
            className="flex-1 h-10 sm:h-12 rounded-xl text-gray-500 text-xs sm:text-sm"
            onClick={onCancel}
            disabled={submitting}
          >
            {t("employee.permissions.cancelButton")}
          </Button>
          <Button
            className={`flex-1 h-10 sm:h-12 rounded-xl shadow-xl transition-all text-xs sm:text-sm ${
              submitting
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 shadow-blue-200 dark:shadow-none font-bold"
            }`}
            onClick={onSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                <span>{t("employee.permissions.sending")}</span>
              </div>
            ) : (
              t("employee.permissions.submitButton")
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
