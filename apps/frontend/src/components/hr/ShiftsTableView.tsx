import React from "react";
import { Edit, Trash2, Copy, Users, MoreVertical, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { calculateWorkHours } from "../../utils/shiftHelpers";
import { cn } from "@/lib/utils";

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  color: string;
  isActive: boolean;
  _count?: {
    assignments: number;
  };
}

interface ShiftsTableViewProps {
  shifts: Shift[];
  selectedShifts: string[];
  onToggleSelect: (shiftId: string) => void;
  onToggleSelectAll: () => void;
  onEdit: (shift: Shift) => void;
  onDelete: (shiftId: string) => void;
  onDuplicate: (shift: Shift) => void;
  onToggleStatus: (shiftId: string, currentStatus: boolean) => void;
}

export const ShiftsTableView: React.FC<ShiftsTableViewProps> = ({
  shifts,
  selectedShifts,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleStatus,
}) => {
  const navigate = useNavigate();

  const allSelected = shifts.length > 0 && selectedShifts.length === shifts.length;
  const someSelected = selectedShifts.length > 0 && selectedShifts.length < shifts.length;

  return (
    <Card className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-2xs">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-start" dir="rtl">
            <thead>
              <tr className="bg-muted/40 border-b border-border/60">
                <th className="px-4 py-3 text-start w-12">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onCheckedChange={onToggleSelectAll}
                    className="border-border/70"
                  />
                </th>
                <th className="px-4 py-3 text-start text-[11px] font-semibold text-muted-foreground uppercase">
                  اسم المناوبة
                </th>
                <th className="px-4 py-3 text-start text-[11px] font-semibold text-muted-foreground uppercase">
                  وقت البدء
                </th>
                <th className="px-4 py-3 text-start text-[11px] font-semibold text-muted-foreground uppercase">
                  وقت الانتهاء
                </th>
                <th className="px-4 py-3 text-start text-[11px] font-semibold text-muted-foreground uppercase">
                  الراحة
                </th>
                <th className="px-4 py-3 text-start text-[11px] font-semibold text-muted-foreground uppercase">
                  ساعات العمل
                </th>
                <th className="px-4 py-3 text-start text-[11px] font-semibold text-muted-foreground uppercase">
                  الموظفين
                </th>
                <th className="px-4 py-3 text-start text-[11px] font-semibold text-muted-foreground uppercase">
                  الحالة
                </th>
                <th className="px-4 py-3 text-start text-[11px] font-semibold text-muted-foreground uppercase">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {shifts.map((shift) => (
                <tr
                  key={shift.id}
                  className="group hover:bg-muted/20 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={selectedShifts.includes(shift.id)}
                      onCheckedChange={() => onToggleSelect(shift.id)}
                      className="border-border/70"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="size-2.5 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: shift.color }}
                      />
                      <button
                        onClick={() => navigate(`/hr/shifts/${shift.id}`)}
                        className="font-semibold text-xs sm:text-sm text-foreground hover:text-primary transition-colors text-start truncate"
                      >
                        {shift.name}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono tabular-nums text-xs text-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/50">
                      {shift.startTime}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono tabular-nums text-xs text-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/50">
                      {shift.endTime}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono tabular-nums">
                    {shift.breakDuration} دقيقة
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="secondary"
                      className="bg-primary/10 text-primary border border-primary/20 font-mono tabular-nums text-[11px] px-2 py-0.5 rounded-md"
                    >
                      {calculateWorkHours(shift.startTime, shift.endTime, shift.breakDuration)} ساعة
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 font-mono tabular-nums text-foreground bg-muted/60 w-fit px-2 py-0.5 rounded-md text-xs border border-border/50">
                      <Users className="size-3 text-muted-foreground" />
                      <span>{shift._count?.assignments || 0}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={shift.isActive}
                        onCheckedChange={() => onToggleStatus(shift.id, shift.isActive)}
                        className="scale-85"
                      />
                      <span
                        className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-md border font-mono tabular-nums",
                          shift.isActive
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-muted text-muted-foreground border-border/60",
                        )}
                      >
                        {shift.isActive ? "نشط" : "معطل"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                        onClick={() => navigate(`/hr/shifts/${shift.id}`)}
                        title="عرض التفاصيل"
                      >
                        <Users className="size-3.5" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                          >
                            <MoreVertical className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="rounded-xl border border-border/70 p-1 bg-card shadow-lg text-foreground"
                        >
                          <DropdownMenuItem
                            className="rounded-lg gap-2 text-xs font-medium py-1.5 px-2.5 cursor-pointer"
                            onClick={() => onEdit(shift)}
                          >
                            <Edit className="size-3.5 text-primary" />
                            تعديل
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="rounded-lg gap-2 text-xs font-medium py-1.5 px-2.5 cursor-pointer"
                            onClick={() => onDuplicate(shift)}
                          >
                            <Copy className="size-3.5 text-muted-foreground" />
                            نسخ
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="rounded-lg gap-2 text-xs font-medium py-1.5 px-2.5 cursor-pointer"
                            onClick={() => navigate(`/hr/shifts/${shift.id}`)}
                          >
                            <Users className="size-3.5 text-primary" />
                            تعيين موظفين
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDelete(shift.id)}
                            className="rounded-lg gap-2 text-xs font-medium text-destructive focus:text-destructive focus:bg-destructive/10 py-1.5 px-2.5 cursor-pointer"
                          >
                            <Trash2 className="size-3.5" />
                            حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShiftsTableView;
