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
    <div className="flex flex-wrap items-end gap-4 rounded-lg bg-card text-card-foreground p-4 shadow-sm">
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">{rangeLabel}</Label>
        <Select value={selectedFilterId} onValueChange={onSelectFilter}>
          <SelectTrigger className="w-44 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {presets.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showCustomRangeInputs && (
        <>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">
              {fromLabel}
            </Label>
            <Input
              type="date"
              value={start}
              onChange={(e) => onStartChange(e.target.value)}
              className="h-9 w-40 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">{toLabel}</Label>
            <Input
              type="date"
              value={end}
              onChange={(e) => onEndChange(e.target.value)}
              className="h-9 w-40 text-sm"
            />
          </div>
        </>
      )}

      <Button
        variant="outline"
        size="sm"
        disabled={isRefreshing}
        onClick={onRefresh}
      >
        {refreshLabel}
      </Button>
    </div>
  );
}
