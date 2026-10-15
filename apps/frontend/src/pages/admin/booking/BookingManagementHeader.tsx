import React from "react";
import { Building2, CalendarCheck2 } from "lucide-react";
import { BookingBranch } from "./shared";

interface BookingManagementHeaderProps {
  branches: BookingBranch[];
  selectedBranchId: string;
  onBranchChange: (branchId: string) => void;
}

export const BookingManagementHeader: React.FC<BookingManagementHeaderProps> = ({
  branches,
  selectedBranchId,
  onBranchChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-border/70">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
          <CalendarCheck2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            نظام إدارة الحجوزات
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            تحكم متكامل في المواعيد، الفروع، الأطباء، والخدمات السريرية
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 self-stretch sm:self-auto">
        <label className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-muted-foreground/70" />
          <span>الفرع الحالي:</span>
        </label>
        <select
          value={selectedBranchId}
          onChange={(e) => onBranchChange(e.target.value)}
          className="border border-border/70 rounded-lg px-3 py-1.5 text-xs sm:text-sm bg-card text-foreground shadow-sm hover:border-border transition-colors min-w-[200px] focus:outline-none focus:ring-1 focus:ring-primary/40"
        >
          <option value="">جميع الفروع</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default BookingManagementHeader;
