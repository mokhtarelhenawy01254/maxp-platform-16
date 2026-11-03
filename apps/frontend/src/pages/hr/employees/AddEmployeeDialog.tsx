import React, { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  hasError,
  getErrorMessage,
  ValidationError,
} from "../../../utils/hrValidation";
import { EmployeeFormData, Department, LookupResponse } from "./types";
import { EmployeeSmartDetectionCard } from "./EmployeeSmartDetectionCard";
import { EmployeePersonalFields } from "./EmployeePersonalFields";
import { EmployeeDeductionSettingsSection } from "./EmployeeDeductionSettingsSection";
import { DateInput } from '../../../components/ui/DateInput';

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: EmployeeFormData;
  setFormData: React.Dispatch<React.SetStateAction<EmployeeFormData>>;
  departments: Department[];
  lookupLoading: boolean;
  lookupResult: LookupResponse | null;
  errors: ValidationError[];
  submitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  onReactivate?: (userId: string) => void;
}

export const AddEmployeeDialog: React.FC<AddEmployeeDialogProps> = ({
  open,
  onOpenChange,
  formData,
  setFormData,
  departments,
  lookupLoading,
  lookupResult,
  errors,
  submitting,
  onSubmit,
  onCancel,
  onReactivate,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Determine if this action requires confirmation
  const needsConfirmation =
    lookupResult?.status === "EXISTING_PLATFORM_USER" ||
    lookupResult?.status === "COMPANY_USER_NOT_EMPLOYEE" ||
    lookupResult?.status === "INACTIVE_FORMER_EMPLOYEE";

  const handleSubmitClick = () => {
    if (needsConfirmation) {
      setShowConfirmDialog(true);
    } else {
      onSubmit();
    }
  };

  const handleConfirmedSubmit = () => {
    setShowConfirmDialog(false);
    onSubmit();
  };

  // Get the submit button label based on the lookup status
  const getSubmitLabel = () => {
    if (submitting) {
      return (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t("employees.saving")}
        </>
      );
    }
    if (lookupResult?.status === "COMPANY_USER_NOT_EMPLOYEE") {
      return t("employees.upgradeToEmployee");
    }
    if (lookupResult?.status === "EXISTING_PLATFORM_USER") {
      return t("employees.linkAndAddEmployee");
    }
    if (lookupResult?.status === "INACTIVE_FORMER_EMPLOYEE") {
      return t("employees.reactivateAndUpdate");
    }
    return t("employees.addEmployeeButton");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("employees.addEmployeeTitle")}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            {/* Email Field First - Primary Lookup Key */}
            <div className="space-y-2 col-span-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="employee-email">{t("employees.email")}</Label>
                {lookupLoading && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    {t("employees.lookupChecking")}
                  </span>
                )}
              </div>
              <Input
                id="employee-email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="example@company.com"
                className={hasError(errors, "email") ? "border-red-500" : ""}
              />
              {hasError(errors, "email") && (
                <p className="text-sm text-red-500">
                  {getErrorMessage(errors, "email")}
                </p>
              )}
            </div>

            {/* Smart Detection Card */}
            {lookupResult?.exists && lookupResult.user && (
              <EmployeeSmartDetectionCard
                lookupResult={lookupResult}
                onViewProfile={(userId) => {
                  onOpenChange(false);
                  navigate(`/hr/employees/${userId}`);
                }}
                onReactivate={onReactivate}
              />
            )}

            {/* Personal Information Fields */}
            <EmployeePersonalFields
              formData={formData}
              setFormData={setFormData}
              departments={departments}
              lookupResult={lookupResult}
              errors={errors}
            />

            <div className="space-y-2">
              <Label>{t("employees.contractType")}</Label>
              <Select
                value={formData.contractType}
                onValueChange={(value) =>
                  setFormData({ ...formData, contractType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL_TIME">
                    {t("employees.contractFullTime")}
                  </SelectItem>
                  <SelectItem value="PART_TIME">
                    {t("employees.contractPartTime")}
                  </SelectItem>
                  <SelectItem value="CONTRACTOR">
                    {t("employees.contractContract")}
                  </SelectItem>
                  <SelectItem value="TEMPORARY">
                    {t("employees.contractTemporary")}
                  </SelectItem>
                  <SelectItem value="INTERN">
                    {t("employees.contractInternship")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("employees.hireDate")}</Label>
              <DateInput
                
                value={formData.hireDate}
                onChange={(e) =>
                  setFormData({ ...formData, hireDate: e.target.value })
                }
                className={hasError(errors, "hireDate") ? "border-red-500" : ""}
              />
              {hasError(errors, "hireDate") && (
                <p className="text-sm text-red-500">
                  {getErrorMessage(errors, "hireDate")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t("employees.baseSalary")}</Label>
              <Input
                type="number"
                value={formData.baseSalary}
                onChange={(e) =>
                  setFormData({ ...formData, baseSalary: e.target.value })
                }
                placeholder="0.00"
                className={
                  hasError(errors, "baseSalary") ? "border-red-500" : ""
                }
              />
              {hasError(errors, "baseSalary") && (
                <p className="text-sm text-red-500">
                  {getErrorMessage(errors, "baseSalary")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t("employees.nationalId")}</Label>
              <Input
                value={formData.nationalId}
                onChange={(e) =>
                  setFormData({ ...formData, nationalId: e.target.value })
                }
                placeholder={t("employees.nationalIdPlaceholder")}
                className={
                  hasError(errors, "nationalId") ? "border-red-500" : ""
                }
              />
              {hasError(errors, "nationalId") && (
                <p className="text-sm text-red-500">
                  {getErrorMessage(errors, "nationalId")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t("employees.dateOfBirth")}</Label>
              <DateInput
                
                value={formData.dateOfBirth}
                onChange={(e) =>
                  setFormData({ ...formData, dateOfBirth: e.target.value })
                }
                className={
                  hasError(errors, "dateOfBirth") ? "border-red-500" : ""
                }
              />
              {hasError(errors, "dateOfBirth") && (
                <p className="text-sm text-red-500">
                  {getErrorMessage(errors, "dateOfBirth")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t("employees.gender")}</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) =>
                  setFormData({ ...formData, gender: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("employees.selectGender")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">{t("employees.male")}</SelectItem>
                  <SelectItem value="FEMALE">{t("employees.female")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("employees.city")}</Label>
              <Input
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                placeholder={t("employees.cityPlaceholder")}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label>{t("employees.address")}</Label>
              <Textarea
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder={t("employees.addressPlaceholder")}
                rows={2}
              />
            </div>

            {/* Deduction Settings Section */}
            <EmployeeDeductionSettingsSection
              formData={formData}
              setFormData={setFormData}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={submitting}
            >
              {t("employees.cancel")}
            </Button>
            <Button
              onClick={handleSubmitClick}
              disabled={
                submitting ||
                lookupResult?.status === "ALREADY_ACTIVE_EMPLOYEE"
              }
            >
              {getSubmitLabel()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for linking external/existing user */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t("employees.confirmLinkTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              {lookupResult?.status === "EXISTING_PLATFORM_USER"
                ? t("employees.confirmLinkExternalDesc", {
                    name: `${lookupResult?.user?.firstName || ""} ${lookupResult?.user?.lastName || ""}`.trim(),
                    email: lookupResult?.user?.email || "",
                  })
                : lookupResult?.status === "INACTIVE_FORMER_EMPLOYEE"
                ? t("employees.confirmReactivateDesc", {
                    name: `${lookupResult?.user?.firstName || ""} ${lookupResult?.user?.lastName || ""}`.trim(),
                    email: lookupResult?.user?.email || "",
                  })
                : t("employees.confirmUpgradeDesc", {
                    name: `${lookupResult?.user?.firstName || ""} ${lookupResult?.user?.lastName || ""}`.trim(),
                    email: lookupResult?.user?.email || "",
                  })}
            </p>
            <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1.5 text-muted-foreground">
              <p className="font-medium text-foreground">{t("employees.confirmWhatHappens")}</p>
              <p>✓ {t("employees.confirmPoint1")}</p>
              <p>✓ {t("employees.confirmPoint2")}</p>
              <p>✓ {t("employees.confirmPoint3")}</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              {t("employees.cancel")}
            </Button>
            <Button onClick={handleConfirmedSubmit}>
              {t("employees.confirmAddButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
