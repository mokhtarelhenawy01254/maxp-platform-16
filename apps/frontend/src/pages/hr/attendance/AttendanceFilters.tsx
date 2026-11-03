import React from "react";
import { XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmployeeSimple, AutoCloseReviewStatus } from "./types";
import { getLocalDateString } from "./helpers";
import { DateInput } from '../../../components/ui/DateInput';

interface AttendanceFiltersProps {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  useDateRange: boolean;
  setUseDateRange: (val: boolean) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  employeeId: string;
  setEmployeeId: (val: string) => void;
  autoClosedOnly: boolean;
  setAutoClosedOnly: (val: boolean) => void;
  autoCloseReviewStatus: "ALL" | AutoCloseReviewStatus;
  setAutoCloseReviewStatus: (val: "ALL" | AutoCloseReviewStatus) => void;
  employees: EmployeeSimple[];
  setPagination: React.Dispatch<React.SetStateAction<any>>;
}

export const AttendanceFilters: React.FC<AttendanceFiltersProps> = ({
  selectedDate,
  setSelectedDate,
  endDate,
  setEndDate,
  useDateRange,
  setUseDateRange,
  statusFilter,
  setStatusFilter,
  employeeId,
  setEmployeeId,
  autoClosedOnly,
  setAutoClosedOnly,
  autoCloseReviewStatus,
  setAutoCloseReviewStatus,
  employees,
  setPagination,
}) => {
  return (
    <Card>
      <CardContent className="p-6 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex flex-wrap gap-4 items-center">
          <DateInput
            
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setPagination((p: any) => ({ ...p, page: 1 }));
            }}
            className="w-[160px]"
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="useRange"
              checked={useDateRange}
              onChange={(e) => {
                setUseDateRange(e.target.checked);
                setPagination((p: any) => ({ ...p, page: 1 }));
              }}
              className="rounded"
            />
            <label htmlFor="useRange" className="text-sm cursor-pointer">
              فترة زمنية
            </label>
          </div>
          {useDateRange && (
            <DateInput
              
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPagination((p: any) => ({ ...p, page: 1 }));
              }}
              className="w-[160px]"
              min={selectedDate}
            />
          )}
        </div>
        <div className="flex flex-wrap gap-4">
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value ?? "ALL");
              setPagination((p: any) => ({ ...p, page: 1 }));
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">الكل</SelectItem>
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

          <select
            value={employeeId || "all"}
            onChange={(e) => {
              const v = e.target.value;
              setEmployeeId(v && v !== "all" ? v : "");
              setPagination((p: any) => ({ ...p, page: 1 }));
            }}
            className="flex h-10 w-[200px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
          >
            <option value="all">الكل</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2">
            <input
              type="checkbox"
              id="autoClosedOnly"
              checked={autoClosedOnly}
              onChange={(e) => {
                setAutoClosedOnly(e.target.checked);
                setPagination((p: any) => ({ ...p, page: 1 }));
              }}
              className="rounded"
            />
            <label htmlFor="autoClosedOnly" className="text-sm cursor-pointer">
              الإغلاق التلقائي فقط
            </label>
          </div>

          <Select
            value={autoCloseReviewStatus}
            onValueChange={(value) => {
              setAutoCloseReviewStatus((value as "ALL" | AutoCloseReviewStatus) || "ALL");
              setPagination((p: any) => ({ ...p, page: 1 }));
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="حالة المراجعة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">كل المراجعات</SelectItem>
              <SelectItem value="PENDING">بانتظار المراجعة</SelectItem>
              <SelectItem value="REVIEWED">تمت المراجعة</SelectItem>
              <SelectItem value="ADJUSTED">تم التعديل</SelectItem>
              <SelectItem value="DISMISSED">اعتماد كما هو</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => {
              setSelectedDate(getLocalDateString());
              setEndDate(getLocalDateString());
              setUseDateRange(false);
              setStatusFilter("ALL");
              setEmployeeId("");
              setAutoClosedOnly(false);
              setAutoCloseReviewStatus("ALL");
              setPagination((p: any) => ({ ...p, page: 1 }));
            }}
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
