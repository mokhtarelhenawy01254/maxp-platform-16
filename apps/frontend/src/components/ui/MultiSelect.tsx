import React, { useState, useRef, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Input } from "./input";
import { Search, ChevronDown, X, Check } from "lucide-react";

export interface MultiSelectOption {
  value: string;
  label: string;
  group?: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  selected,
  onChange,
  placeholder = "اختر...",
  searchPlaceholder = "بحث...",
  emptyText = "لا توجد خيارات",
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
    if (!open) setSearch("");
  }, [open]);

  const filtered = options.filter(
    (o) =>
      o.label.toLowerCase().includes(search.toLowerCase()) ||
      o.value.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (value: string) => {
    if (selected.includes(value)) onChange(selected.filter((v) => v !== value));
    else onChange([...selected, value]);
  };

  const selectAll = () => onChange(options.map((o) => o.value));
  const deselectAll = () => onChange([]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`w-full min-h-10 rounded-xl border bg-card px-3 py-1.5 text-sm text-right flex flex-wrap gap-1.5 items-center cursor-pointer transition-all duration-150 ${
            open
              ? "border-primary ring-1 ring-primary shadow-xs"
              : "border-border/70 hover:border-border hover:bg-muted/30"
          }`}
        >
          <div className="flex-1 flex flex-wrap gap-1.5 items-center">
            {selected.length === 0 ? (
              <span className="text-muted-foreground text-xs">{placeholder}</span>
            ) : (
              selected.slice(0, 8).map((v) => {
                const opt = options.find((o) => o.value === v);
                return (
                  <span
                    key={v}
                    className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary shadow-2xs"
                  >
                    <span>{opt?.label || v}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(v);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          toggle(v);
                        }
                      }}
                      className="cursor-pointer transition-colors hover:text-destructive active:scale-90"
                      aria-label={`إزالة ${opt?.label || v}`}
                    >
                      <X className="size-3" />
                    </span>
                  </span>
                );
              })
            )}
            {selected.length > 8 && (
              <span className="font-mono text-xs font-medium text-muted-foreground tabular-nums">
                +{selected.length - 8}
              </span>
            )}
          </div>
          <ChevronDown
            className={`size-4 text-muted-foreground shrink-0 transition-transform duration-150 ${
              open ? "rotate-180 text-foreground" : ""
            }`}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 shadow-2xl rounded-xl bg-card z-[100] border border-border/70 overflow-hidden text-foreground"
        align="start"
        sideOffset={4}
      >
        <div className="flex flex-col max-h-80">
          <div className="relative p-2.5 border-b border-border/60">
            <Search className="absolute right-4.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="pr-9 h-9 text-xs rounded-lg border-border/70 bg-background"
            />
          </div>
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-muted/30 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="font-semibold text-primary transition-colors hover:underline active:scale-[0.98]"
              >
                تحديد الكل
              </button>
              <span className="text-muted-foreground/40">|</span>
              <button
                type="button"
                onClick={deselectAll}
                className="text-muted-foreground transition-colors hover:text-foreground active:scale-[0.98]"
              >
                إلغاء الكل
              </button>
            </div>
            <span className="font-mono text-[11px] font-medium text-muted-foreground tabular-nums">
              {selected.length}/{options.length}
            </span>
          </div>
          <div className="overflow-auto py-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">{emptyText}</p>
            ) : (
              filtered.map((o) => {
                const isSelected = selected.includes(o.value);
                return (
                  <label
                    key={o.value}
                    onClick={() => toggle(o.value)}
                    className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer text-xs transition-colors ${
                      isSelected
                        ? "bg-primary/10 text-foreground font-medium"
                        : "text-foreground hover:bg-muted/40"
                    }`}
                  >
                    <span
                      className={`size-4 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground shadow-2xs"
                          : "border-border/80 bg-background"
                      }`}
                    >
                      {isSelected && <Check className="size-3" />}
                    </span>
                    <span className="flex-1 truncate">{o.label}</span>
                    {o.group && (
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md font-medium shrink-0">
                        {o.group}
                      </span>
                    )}
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

export default MultiSelect;
