import React from "react";
import { Card, CardContent } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Search } from "lucide-react";
import { AuditFilters } from "./types";
import { DateInput } from '../../../components/ui/DateInput';

interface AuditLogsFiltersProps {
  filters: AuditFilters;
  onFilterChange: (filters: AuditFilters) => void;
}

export const AuditLogsFilters: React.FC<AuditLogsFiltersProps> = ({
  filters,
  onFilterChange,
}) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث في السجلات..."
              value={filters.search}
              onChange={(e) =>
                onFilterChange({ ...filters, search: e.target.value })
              }
              className="pr-9"
            />
          </div>

          <Select
            value={filters.entityType || "all"}
            onValueChange={(value) =>
              onFilterChange({
                ...filters,
                entityType: value === "all" ? "" : value,
              })
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="نوع الكيان" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="EMPLOYEE">الموظفين</SelectItem>
              <SelectItem value="DEPARTMENT">الأقسام</SelectItem>
              <SelectItem value="POSITION">الوظائف</SelectItem>
              <SelectItem value="LEAVE">الإجازات</SelectItem>
              <SelectItem value="ADVANCE">السلف</SelectItem>
              <SelectItem value="ADVANCE_REQUEST">طلبات السلف</SelectItem>
              <SelectItem value="RESIGNATION">الاستقالات</SelectItem>
              <SelectItem value="ATTENDANCE">الحضور</SelectItem>
              <SelectItem value="SHIFT">المناوبات</SelectItem>
              <SelectItem value="PERMISSION_REQUEST">الإذونات</SelectItem>
              <SelectItem value="DEDUCTION">الخصومات</SelectItem>
              <SelectItem value="PAYROLL">الرواتب</SelectItem>
              <SelectItem value="POLICY">السياسات</SelectItem>
              <SelectItem value="GOAL">الأهداف</SelectItem>
              <SelectItem value="FEEDBACK">التغذية الراجعة</SelectItem>
              <SelectItem value="SETTINGS">الإعدادات</SelectItem>
              <SelectItem value="USER">المستخدمين</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.action || "all"}
            onValueChange={(value) =>
              onFilterChange({
                ...filters,
                action: value === "all" ? "" : value,
              })
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="نوع العملية" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="CREATE">إنشاء</SelectItem>
              <SelectItem value="UPDATE">تحديث</SelectItem>
              <SelectItem value="DELETE">حذف</SelectItem>
              <SelectItem value="APPROVE">موافقة</SelectItem>
              <SelectItem value="REJECT">رفض</SelectItem>
              <SelectItem value="LOGIN">تسجيل دخول</SelectItem>
              <SelectItem value="LOGOUT">تسجيل خروج</SelectItem>
              <SelectItem value="EXPORT">تصدير</SelectItem>
              <SelectItem value="IMPORT">استيراد</SelectItem>
              <SelectItem value="SETTLEMENT">تصفية</SelectItem>
              <SelectItem value="ASSIGN">تعيين</SelectItem>
              <SelectItem value="ACTIVATE">تفعيل</SelectItem>
              <SelectItem value="DEACTIVATE">تعطيل</SelectItem>
            </SelectContent>
          </Select>

          <DateInput
            
            className="w-[160px]"
            value={filters.startDate}
            onChange={(e) =>
              onFilterChange({ ...filters, startDate: e.target.value })
            }
          />
          <DateInput
            
            className="w-[160px]"
            value={filters.endDate}
            onChange={(e) =>
              onFilterChange({ ...filters, endDate: e.target.value })
            }
          />
        </div>
      </CardContent>
    </Card>
  );
};
