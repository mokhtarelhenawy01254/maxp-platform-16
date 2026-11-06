import React from "react";
import { MoreVertical, Edit, Trash2, Eye, Shield, KeyRound, UserX, UserCheck, UserMinus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { TableRow, TableCell } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Employee } from "./types";
import { statusColors, contractKeys, statusKeys } from "./helpers";

interface EmployeeTableRowProps {
  employee: Employee;
  onOpenAssets: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
  onResetPassword?: (employee: Employee) => void;
  onToggleStatus?: (employee: Employee) => void;
  onTerminate?: (employee: Employee) => void;
}

export const EmployeeTableRow: React.FC<EmployeeTableRowProps> = ({
  employee,
  onOpenAssets,
  onDelete,
  onResetPassword,
  onToggleStatus,
  onTerminate,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <TableRow className="hover:bg-gray-50 dark:hover:bg-gray-800">
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar>
            {employee.avatar ? (
              <AvatarImage
                src={
                  employee.avatar.startsWith("http")
                    ? employee.avatar
                    : `https://mokhtarelhenawy.online${employee.avatar}`
                }
                onError={(e) => {
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${employee.firstName}+${employee.lastName}&background=random`;
                }}
              />
            ) : (
              <AvatarFallback>
                {employee.firstName?.[0]}
                {employee.lastName?.[0]}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <p className="font-medium">
              {employee.firstName || t("employees.notSpecified")}{" "}
              {employee.lastName || ""}
            </p>
            <p className="text-sm text-gray-500 font-mono tabular-nums">
              {employee.employeeNumber || t("employees.notSpecified")}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {employee.department ? (
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: employee.department.color || "#6B7280",
              }}
            />
            {employee.department.name || t("employees.notSpecified")}
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </TableCell>
      <TableCell>
        {employee.position?.title || <span className="text-gray-400">-</span>}
      </TableCell>
      {/* User Account Status */}
      <TableCell>
        {employee.user ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Badge
                className={
                  employee.user.isActive
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }
              >
                {employee.user.isActive
                  ? t("employees.accountActive")
                  : t("employees.accountInactive")}
              </Badge>
              {employee.user.isEmailVerified && (
                <Badge className="bg-blue-100 text-blue-800 text-xs">
                  {t("employees.verified")}
                </Badge>
              )}
            </div>
            {employee.user.lastLoginAt && (
              <span className="text-xs text-gray-500 font-mono tabular-nums">
                {t("employees.lastLogin")}{" "}
                {new Date(employee.user.lastLoginAt).toLocaleDateString(
                  "ar-EG",
                )}
              </span>
            )}
            {!employee.user.lastLoginAt && (
              <span className="text-xs text-gray-400">
                {t("employees.neverLoggedIn")}
              </span>
            )}
          </div>
        ) : (
          <Badge className="bg-gray-100 text-gray-600">
            {t("employees.noUserAccount")}
          </Badge>
        )}
      </TableCell>
      <TableCell>
        {employee.user ? (
          <Badge className="bg-purple-100 text-purple-800">
            {employee.user.role === "COMPANY_ADMIN"
              ? t("employees.roleCompanyAdmin")
              : employee.user.role === "MANAGER"
                ? t("employees.roleManager")
                : employee.user.role === "AGENT"
                  ? t("employees.roleAgent")
                  : employee.user.role === "AFFILIATE"
                    ? t("employees.roleAffiliate")
                    : employee.user.role || t("employees.notSpecified")}
          </Badge>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </TableCell>
      <TableCell>
        {t(`employees.${contractKeys[employee.contractType]}`) ||
          employee.contractType ||
          t("employees.notSpecified")}
      </TableCell>
      <TableCell className="font-mono tabular-nums">
        {employee.hireDate
          ? new Date(employee.hireDate).toLocaleDateString("ar-EG")
          : t("employees.notSpecified")}
      </TableCell>
      <TableCell>
        <Badge className={statusColors[employee.status] || ""}>
          {statusKeys[employee.status]
            ? t(`employees.${statusKeys[employee.status]}`)
            : employee.status || t("employees.notSpecified")}
        </Badge>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48" dir="rtl">
            <DropdownMenuItem
              onClick={() => navigate(`/hr/employees/${employee.id}`)}
            >
              <Eye className="h-4 w-4 ml-2 text-gray-500" />
              عرض الملف
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onOpenAssets(employee)}>
              <Shield className="h-4 w-4 ml-2 text-gray-500" />
              العهدة والممتلكات
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate(`/hr/employees/${employee.id}/edit`)}
            >
              <Edit className="h-4 w-4 ml-2 text-gray-500" />
              تعديل البيانات
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {onResetPassword && (
              <DropdownMenuItem
                onClick={() => onResetPassword(employee)}
                className="text-indigo-600 focus:text-indigo-700"
              >
                <KeyRound className="h-4 w-4 ml-2" />
                بيانات الدخول / كلمة السر
              </DropdownMenuItem>
            )}

            {onToggleStatus && (
              <DropdownMenuItem
                onClick={() => onToggleStatus(employee)}
                className={employee.user?.isActive ? "text-amber-600" : "text-emerald-600"}
              >
                {employee.user?.isActive ? (
                  <>
                    <UserX className="h-4 w-4 ml-2" />
                    تجميد حساب الدخول
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4 ml-2" />
                    تفعيل حساب الدخول
                  </>
                )}
              </DropdownMenuItem>
            )}

            {onTerminate && employee.status !== "TERMINATED" && (
              <DropdownMenuItem
                onClick={() => onTerminate(employee)}
                className="text-orange-600"
              >
                <UserMinus className="h-4 w-4 ml-2" />
                إنهاء الخدمة
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="text-red-600 focus:text-red-700"
              onClick={() => onDelete(employee)}
            >
              <Trash2 className="h-4 w-4 ml-2" />
              حذف الموظف
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};
