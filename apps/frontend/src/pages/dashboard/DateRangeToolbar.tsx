import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import type { DateRangeToolbarProps } from "./types";

export default function DateRangeToolbar({
  currentRangeLabel,
  currentRangeMeta,
  customPresetLabel,
  end,
  fromLabel,
  isRefreshing,
  onEndChange,
  onRefresh,
  onSelectFilter,
  onStartChange,
  presets,
  rangeLabel,
  refreshLabel,
  selectedFilterId,
  showCustomRangeInputs,
  start,
  toLabel,
}: DateRangeToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2">
        <Select value={selectedFilterId} onValueChange={onSelectFilter}>
          <SelectTrigger className="h-8 w-32 sm:w-36 text-xs bg-background/80 border-border/60 shadow-none font-medium">
            <SelectValue placeholder={rangeLabel}>{currentRangeLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {presets.map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-xs">
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showCustomRangeInputs && (
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={start}
            onChange={(e) => onStartChange(e.target.value)}
            className="h-8 w-32 sm:w-36 text-xs bg-background border-border/60"
            aria-label={fromLabel}
          />
          <span className="text-xs text-muted-foreground">-</span>
          <Input
            type="date"
            value={end}
            onChange={(e) => onEndChange(e.target.value)}
            className="h-8 w-32 sm:w-36 text-xs bg-background border-border/60"
            aria-label={toLabel}
          />
        </div>
      )}

      <Button
        variant="ghost"
        size="sm"
        disabled={isRefreshing}
        onClick={onRefresh}
        className="h-8 text-xs px-2.5 text-muted-foreground hover:text-foreground active:scale-[0.97]"
      >
        {refreshLabel}
      </Button>
    </div>
  );
}
