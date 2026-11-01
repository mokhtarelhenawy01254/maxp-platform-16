import React, { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import { Checkbox } from "../../../components/ui/checkbox";

export interface MultiSelectOption {
  code: string;
  name: string;
  color?: string;
  description?: string;
  disabled?: boolean;
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
  fieldClassName?: string;
  /** نص الخطأ: يظهر بدل "لا توجد نتائج" عند فشل تحميل الخيارات */
  errorText?: string;
  /** زر إعادة المحاولة بعد فشل التحميل */
  onRetry?: () => void;
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
  fieldClassName = "",
  errorText,
  onRetry,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const normalized = useMemo(
    () =>
      options.map((option) => ({
        code: option.code,
        name: option.name,
        color: option.color,
        description: option.description,
        disabled: Boolean(option.disabled),
      })),
    [options],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return normalized;
    return normalized.filter(
      (option) =>
        option.name.toLowerCase().includes(q) ||
        option.code.toLowerCase().includes(q) ||
        String(option.description || "").toLowerCase().includes(q),
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

  const selectableOptions = useMemo(
    () => normalized.filter((option) => !option.disabled),
    [normalized],
  );

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
        className={`flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-border/70 bg-background px-3.5 py-2 text-start text-xs sm:text-sm transition-all hover:bg-muted/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${fieldClassName}`}
      >
        <span
          className={`truncate font-medium ${value.length === 0 ? "text-muted-foreground" : "text-foreground"}`}
        >
          {triggerText}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {value.length > 0 && (
            <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-bold font-mono tabular-nums text-primary-foreground shadow-xs">
              {value.length}
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
              open ? "rotate-180 text-foreground" : ""
            }`}
          />
        </span>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        dir="rtl"
        className="z-[120] w-[var(--radix-popover-trigger-width)] min-w-[280px] max-w-[420px] rounded-2xl border border-border/70 bg-card p-2.5 text-card-foreground shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150"
      >
        <div className="flex flex-col gap-2">
          {/* Search Bar */}
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              aria-label={searchPlaceholder}
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-border/70 bg-background py-1.5 pe-3 ps-9 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-start"
            />
          </div>

          {/* Quick Actions (Select All / Clear All) */}
          <div className="flex items-center justify-between border-b border-border/50 px-1 pb-1.5 pt-0.5">
            <button
              type="button"
              onClick={() => onChange(selectableOptions.map((option) => option.code))}
              className="rounded-lg px-2 py-1 text-[11px] font-semibold text-primary transition-all hover:bg-primary/10 active:scale-95"
            >
              {selectAllLabel}
            </button>
            <button
              type="button"
              onClick={() => onChange([])}
              className="rounded-lg px-2 py-1 text-[11px] font-semibold text-destructive transition-all hover:bg-destructive/10 active:scale-95"
            >
              {clearAllLabel}
            </button>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto space-y-0.5 px-0.5">
            {visible.length === 0 ? (
              errorText ? (
                <button
                  type="button"
                  onClick={() => onRetry?.()}
                  className="w-full rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-3 text-center text-xs font-semibold text-destructive transition hover:bg-destructive/15"
                >
                  {errorText}
                </button>
              ) : (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground font-medium">
                  {noResultsLabel}
                </div>
              )
            ) : (
              visible.map((option) => {
                const isChecked = selectedMap.has(option.code.toLowerCase());
                return (
                  <label
                    key={option.code}
                    className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-all select-none ${
                      option.disabled
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer hover:bg-muted/60 active:scale-[0.99]"
                    }`}
                  >
                    <Checkbox
                      checked={isChecked}
                      disabled={option.disabled}
                      onCheckedChange={(checked) => {
                        if (option.disabled) return;
                        toggle(option.code, Boolean(checked));
                      }}
                      className="rounded"
                    />
                    {option.color && (
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full shadow-xs"
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-xs sm:text-sm font-medium text-foreground">
                        {option.name}
                      </span>
                      {option.description && (
                        <span className="truncate text-[10px] font-medium text-muted-foreground">
                          {option.description}
                        </span>
                      )}
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
