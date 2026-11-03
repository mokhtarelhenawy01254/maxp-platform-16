import React from "react";
import { Label } from "../../../components/ui/label";
import { Input } from "../../../components/ui/input";
import { Calendar } from "lucide-react";
import { DateInput } from '../../../components/ui/DateInput';

interface AssignShiftDateSelectorProps {
  dateRangeMode: boolean;
  assignmentDate: string;
  endDate: string;
  onAssignmentDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

export const AssignShiftDateSelector: React.FC<
  AssignShiftDateSelectorProps
> = ({
  dateRangeMode,
  assignmentDate,
  endDate,
  onAssignmentDateChange,
  onEndDateChange,
}) => {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold flex items-center gap-2">
        <Calendar className="h-4 w-4 text-orange-500" />
        {dateRangeMode ? "نطاق التاريخ" : "تاريخ العمل"}
      </Label>
      <div className={dateRangeMode ? "grid grid-cols-2 gap-3" : ""}>
        <div>
          {dateRangeMode && (
            <Label className="text-xs text-muted-foreground mb-1">من</Label>
          )}
          <DateInput
            
            value={assignmentDate}
            onChange={(e) => onAssignmentDateChange(e.target.value)}
            className="bg-gray-50/50 dark:bg-gray-800/50"
          />
        </div>
        {dateRangeMode && (
          <div>
            <Label className="text-xs text-muted-foreground mb-1">إلى</Label>
            <DateInput
              
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              min={assignmentDate}
              className="bg-gray-50/50 dark:bg-gray-800/50"
            />
          </div>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground px-1">
        {dateRangeMode
          ? "* سيتم تعيين الموظفين المحددين لجميع الأيام في النطاق المحدد"
          : "* يمكنك تعيين المناوبة للموظفين في هذا اليوم"}
      </p>
    </div>
  );
};
