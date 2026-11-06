import React from "react";
import { Users, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmployeeTableSkeleton } from "@/components/hr/SkeletonLoader";
import { EmptyState } from "@/components/hr/EmptyState";
import { EnhancedPagination } from "@/components/hr/EnhancedPagination";
import { Employee, PaginationState } from "./types";
import { EmployeeTableRow } from "./EmployeeTableRow";

interface EmployeeTableProps {
  loading: boolean;
  employees: Employee[];
  pagination: PaginationState;
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
  onOpenAddDialog: () => void;
  onOpenAssets: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
  onResetPassword?: (employee: Employee) => void;
  onToggleStatus?: (employee: Employee) => void;
  onTerminate?: (employee: Employee) => void;
}

export const EmployeeTable: React.FC<EmployeeTableProps> = ({
  loading,
  employees,
  pagination,
  setPagination,
  onOpenAddDialog,
  onOpenAssets,
  onDelete,
  onResetPassword,
  onToggleStatus,
  onTerminate,
}) => {
  const { t } = useTranslation();

  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <CardContent className="p-0">
        {loading ? (
          <EmployeeTableSkeleton />
        ) : employees.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t("employees.noEmployees")}
            description={t("employees.noEmployeesDesc")}
            actionLabel={t("employees.addFirstEmployee")}
            onAction={onOpenAddDialog}
            secondaryActionLabel={t("employees.importFromExcel")}
            secondaryIcon={Upload}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">
                  {t("employees.tableEmployee")}
                </TableHead>
                <TableHead className="text-right">
                  {t("employees.tableDepartment")}
                </TableHead>
                <TableHead className="text-right">
                  {t("employees.tablePosition")}
                </TableHead>
                <TableHead className="text-right">
                  {t("employees.tableUserAccount")}
                </TableHead>
                <TableHead className="text-right">
                  {t("employees.tableRole")}
                </TableHead>
                <TableHead className="text-right">
                  {t("employees.tableContractType")}
                </TableHead>
                <TableHead className="text-right">
                  {t("employees.tableHireDate")}
                </TableHead>
                <TableHead className="text-right">
                  {t("employees.tableStatus")}
                </TableHead>
                <TableHead className="text-right">
                  {t("employees.tableActions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <EmployeeTableRow
                  key={employee.id}
                  employee={employee}
                  onOpenAssets={onOpenAssets}
                  onDelete={onDelete}
                  onResetPassword={onResetPassword}
                  onToggleStatus={onToggleStatus}
                  onTerminate={onTerminate}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <EnhancedPagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          pageSize={pagination.limit}
          totalItems={pagination.total}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          onPageSizeChange={(limit) =>
            setPagination((prev) => ({ ...prev, limit, page: 1 }))
          }
        />
      )}
    </Card>
  );
};
