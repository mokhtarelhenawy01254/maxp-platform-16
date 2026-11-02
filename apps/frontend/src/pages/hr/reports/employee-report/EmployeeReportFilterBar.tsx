import React from "react";
import { Download, RefreshCw, FileText } from "lucide-react";
import { Card, CardContent } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Label } from "../../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";
import { EmployeeOption } from "./types";
import { DateInput } from '../../../../components/ui/DateInput';

interface EmployeeReportFilterBarProps {
  employees: EmployeeOption[];
  selectedEmployee: string;
  onSelectedEmployeeChange: (val: string) => void;
  startDate: string;
  onStartDateChange: (val: string) => void;
  endDate: string;
  onEndDateChange: (val: string) => void;
  hasReport: boolean;
  onFetchReport: () => void;
  onExport: () => void;
  onPrint: () => void;
}

export const EmployeeReportFilterBar: React.FC<
  EmployeeReportFilterBarProps
> = ({
  employees,
  selectedEmployee,
  onSelectedEmployeeChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  hasReport,
  onFetchReport,
  onExport,
  onPrint,
}) => {
  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700 border-none shadow-sm">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="dark:text-gray-300">الموظف</Label>
            <Select
              value={selectedEmployee}
              onValueChange={onSelectedEmployeeChange}
            >
              <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700">
                <SelectValue
                  placeholder="اختر موظف"
                  className="dark:text-gray-400"
                />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                {employees.map((emp) => (
                  <SelectItem
                    key={emp.id}
                    value={emp.id}
                    className="dark:text-gray-300 dark:focus:bg-gray-700"
                  >
                    {emp.firstName} {emp.lastName} -{" "}
                    <span className="font-mono tabular-nums">
                      {emp.employeeNumber}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="dark:text-gray-300">من تاريخ</Label>
            <DateInput
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500 font-mono tabular-nums"
            />
          </div>

          <div className="space-y-2">
            <Label className="dark:text-gray-300">إلى تاريخ</Label>
            <DateInput
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500 font-mono tabular-nums"
            />
          </div>

          <div className="space-y-2">
            <Label className="invisible">Actions</Label>
            <div className="flex gap-2">
              <Button
                onClick={onFetchReport}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <RefreshCw className="h-4 w-4 ml-2" />
                عرض
              </Button>
              {hasReport && (
                <>
                  <Button
                    variant="outline"
                    onClick={onExport}
                    className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                    aria-label="تصدير CSV"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onPrint}
                    className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 print:hidden"
                    aria-label="طباعة التقرير"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
