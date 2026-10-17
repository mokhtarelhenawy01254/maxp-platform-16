import React, { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import { Checkbox } from "../../../components/ui/checkbox";

export interface MultiSelectOption {
  code: string;
  name: string;
  color?: string;
}

interface MultiSelectFilterProps {
  ariaLabel: string;
  placeholder: string;
  searchPlaceholder: string;
  selectAllLabel: string;
  noResultsLabel: string;
  clearAllLabel: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  fieldClassName: string;
}

export const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({
  ariaLabel,
  placeholder,
  searchPlaceholder,
  selectAllLabel,
  noResultsLabel,
  clearAllLabel,
  options,
  value,
  onChange,
  fieldClassName,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const normalized = useMemo(
    () => options.map((option) => ({ code: option.code, name: option.name, color: option.color })),
    [options],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return normalized;
    return normalized.filter(
      (option) =>
        option.name.toLowerCase().includes(q) || option.code.toLowerCase().includes(q),
    );
  }, [normalized, query]);

  const selectedMap = useMemo(
    () => new Set(value.map((v) => v.toLowerCase())),
    [value],
  );

  const toggle = (code: string, checked: boolean) => {
    if (checked) {
      if (!selectedMap.has(code.toLowerCase())) onChange([...value, code]);
    } else {
      onChange(value.filter((v) => v.toLowerCase() !== code.toLowerCase()));
    }
  };

  const selectedNames = value
    .map((v) => normalized.find((option) => option.code.toLowerCase() === v.toLowerCase())?.name)
    .filter((name): name is string => Boolean(name));

  const triggerText =
    selectedNames.length === 0
      ? placeholder
      : selectedNames.length <= 2
        ? selectedNames.join("، ")
        : `${selectedNames.slice(0, 2).join("، ")} +${selectedNames.length - 2}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        className={`${fieldClassName} flex items-center justify-between gap-1.5 text-start`}
      >
        <span
          className={`truncate ${value.length === 0 ? "text-muted-foreground" : "text-foreground"}`}
        >
          {triggerText}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {value.length > 0 && (
            <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-bold font-mono tabular-nums text-primary-foreground">
              {value.length}
            </span>
          )}
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </span>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="z-50 w-72 border border-border/70 bg-card p-2 text-card-foreground shadow-lg rounded-xl"
      >
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              aria-label={searchPlaceholder}
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="theme-native-control w-full rounded-lg border border-border/70 bg-background px-3 py-1.5 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/15"
            />
          </div>
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => onChange(normalized.map((option) => option.code))}
              className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-primary transition hover:bg-primary/10"
            >
              {selectAllLabel}
            </button>
            <button
              type="button"
              onClick={() => onChange([])}
              className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-destructive transition hover:bg-destructive/10"
            >
              {clearAllLabel}
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {visible.length === 0 ? (
              <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                {noResultsLabel}
              </div>
            ) : (
              visible.map((option) => {
                const isChecked = selectedMap.has(option.code.toLowerCase());
                return (
                  <label
                    key={option.code}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) => toggle(option.code, Boolean(checked))}
                      className="rounded"
                    />
                    {option.color && (
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                    <span className="truncate text-xs font-medium text-foreground">
                      {option.name}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default MultiSelectFilter;
