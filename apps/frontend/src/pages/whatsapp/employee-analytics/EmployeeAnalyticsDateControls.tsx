import React from "react";
import { Calendar, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePreset, PRESET_LABELS, PRESET_ORDER } from "./types";
import { DateInput } from '../../../components/ui/DateInput';

export interface EmployeeAnalyticsDateControlsProps {
  preset: DatePreset;
  onSelectPreset: (preset: DatePreset) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

export const EmployeeAnalyticsDateControls: React.FC<EmployeeAnalyticsDateControlsProps> = ({
  preset,
  onSelectPreset,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onRefresh,
  refreshing,
}) => {
  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESET_ORDER.map((p) => (
          <Button
            key={p}
            variant={preset === p ? "default" : "outline"}
            size="sm"
            className="h-7 px-2.5 text-[11px]"
            onClick={() => onSelectPreset(p)}
          >
            {PRESET_LABELS[p]}
          </Button>
        ))}
      </div>
      {preset === "custom" && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Calendar className="size-4 text-muted-foreground" />
            <DateInput
              
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="h-8 w-auto text-xs"
            />
          </div>
          <span className="text-xs text-muted-foreground">إلى</span>
          <DateInput
            
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="h-8 w-auto text-xs"
          />
        </div>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={refreshing}
      >
        <RefreshCw className={refreshing ? "size-4 animate-spin" : "size-4"} />
        تحديث
      </Button>
    </>
  );
};
