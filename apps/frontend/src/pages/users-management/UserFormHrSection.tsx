import React from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type UserFormState,
  type UserFormErrors,
  type UserRecord,
  CONTRACT_OPTIONS,
} from "./types";
import { useTranslation } from "react-i18next";
import { DateInput } from '../../components/ui/DateInput';

interface UserFormHrSectionProps {
  userForm: UserFormState;
  formErrors: UserFormErrors;
  onUpdateForm: (field: keyof UserFormState, value: string | boolean | string[]) => void;
  departments: Array<{ id: string; name: string; color?: string | null }>;
  positions: Array<{ id: string; title: string }>;
  editingUser: UserRecord | null;
}

export const UserFormHrSection: React.FC<UserFormHrSectionProps> = ({
  userForm,
  formErrors,
  onUpdateForm,
  departments,
  positions,
  editingUser,
}) => {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-sm text-foreground">بيانات الموظف</p>
          <p className="text-xs text-muted-foreground">
            اربط الحساب بالقسم والمنصب لو كان المستخدم جزءًا من فريق العمل.
          </p>
        </div>
        <Badge variant="outline" className="rounded-full text-xs">
          HR
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>القسم</Label>
          <Select
            value={userForm.departmentId || "NONE"}
            onValueChange={(val) => {
              const nextVal = val === "NONE" ? "" : val || "";
              if (nextVal !== userForm.departmentId) {
                onUpdateForm("departmentId", nextVal);
              }
            }}
          >
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue placeholder="اختر القسم" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="NONE"> بدون قسم </SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
              {userForm.departmentId &&
                !departments.some((d) => d.id === userForm.departmentId) && (
                  <SelectItem value={userForm.departmentId}>
                    {editingUser?.employee?.department?.name || userForm.departmentId}
                  </SelectItem>
                )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>المنصب</Label>
          <Select
            value={userForm.positionId || "NONE"}
            onValueChange={(val) => {
              const nextVal = val === "NONE" ? "" : val || "";
              if (nextVal !== userForm.positionId) {
                onUpdateForm("positionId", nextVal);
              }
            }}
          >
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue placeholder="اختر المنصب" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="NONE"> بدون منصب </SelectItem>
              {positions.map((pos) => (
                <SelectItem key={pos.id} value={pos.id}>
                  {pos.title}
                </SelectItem>
              ))}
              {userForm.positionId &&
                !positions.some((p) => p.id === userForm.positionId) && (
                  <SelectItem value={userForm.positionId}>
                    {editingUser?.employee?.position?.title || userForm.positionId}
                  </SelectItem>
                )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="user-hire-date">تاريخ التعيين</Label>
          <DateInput
            id="user-hire-date"
            
            value={userForm.hireDate}
            onChange={(e) => onUpdateForm("hireDate", e.target.value)}
            className="h-10 rounded-xl font-mono"
          />
          {formErrors.hireDate ? (
            <p className="text-xs text-destructive">{formErrors.hireDate}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>نوع العقد</Label>
          <Select
            value={userForm.contractType}
            onValueChange={(val) => {
              const nextVal = val || "FULL_TIME";
              if (nextVal !== userForm.contractType) {
                onUpdateForm("contractType", nextVal);
              }
            }}
          >
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue placeholder="نوع العقد" />
            </SelectTrigger>
            <SelectContent align="end">
              {CONTRACT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="user-base-salary">الراتب الأساسي</Label>
          <Input
            id="user-base-salary"
            type="number"
            value={userForm.baseSalary}
            onChange={(e) => onUpdateForm("baseSalary", e.target.value)}
            className="h-10 rounded-xl font-mono tabular-nums"
            min={0}
            max={10000000}
            step="0.01"
          />
          {formErrors.baseSalary ? (
            <p className="text-xs text-destructive">{formErrors.baseSalary}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>{t("users.form.active", "حالة الحساب")}</Label>
          <div className="flex min-h-10 items-center justify-between rounded-xl border border-border bg-background px-3">
            <div>
              <p className="text-xs font-semibold text-foreground">تفعيل الحساب</p>
              <p className="text-[11px] text-muted-foreground">
                منع تسجيل الدخول إذا تم إيقاف المفتاح.
              </p>
            </div>
            <Switch
              checked={userForm.isActive}
              onCheckedChange={(val) => onUpdateForm("isActive", Boolean(val))}
            />
          </div>
          {formErrors.isActive ? (
            <p className="text-xs text-destructive">{formErrors.isActive}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
};
