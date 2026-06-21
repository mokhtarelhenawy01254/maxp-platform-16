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
  options, selected, onChange,
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

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    o.value.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (value: string) => {
    if (selected.includes(value)) onChange(selected.filter(v => v !== value));
    else onChange([...selected, value]);
  };

  const selectAll = () => onChange(options.map(o => o.value));
  const deselectAll = () => onChange([]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`w-full min-h-10 rounded-lg border bg-background px-3 py-1.5 text-sm text-right flex flex-wrap gap-1 items-center cursor-pointer transition-all ${
            open
              ? "border-ring ring-1 ring-ring"
              : "border-input hover:border-muted-foreground/40"
          }`}
        >
          <div className="flex-1 flex flex-wrap gap-1 items-center">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              selected.slice(0, 8).map(v => {
                const opt = options.find(o => o.value === v);
                return (
                  <span
                    key={v}
                    className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full border border-primary/15"
                  >
                    {opt?.label || v}
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); toggle(v); }}
                      className="hover:text-destructive transition-colors"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                );
              })
            )}
            {selected.length > 8 && (
              <span className="text-xs text-muted-foreground">+{selected.length - 8}</span>
            )}
          </div>
          <ChevronDown className={`size-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 shadow-lg rounded-xl"
        align="start"
        sideOffset={4}
      >
        <div className="flex flex-col max-h-80">
          <div className="relative p-2 border-b">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="pr-9 text-sm"
            />
          </div>
          <div className="flex items-center gap-3 px-3 py-1.5 border-b bg-muted/20">
            <button
              type="button"
              onClick={selectAll}
              className="text-xs font-medium text-primary hover:underline"
            >
              تحديد الكل
            </button>
            <span className="text-xs text-muted-foreground">|</span>
            <button
              type="button"
              onClick={deselectAll}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              إلغاء الكل
            </button>
            <span className="text-xs text-muted-foreground mr-auto">
              {selected.length}/{options.length}
            </span>
          </div>
          <div className="overflow-auto py-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">{emptyText}</p>
            ) : (
              filtered.map(o => {
                const isSelected = selected.includes(o.value);
                return (
                  <label
                    key={o.value}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer text-sm transition-colors ${
                      isSelected ? "bg-primary/5" : "hover:bg-muted/40"
                    }`}
                  >
                    <span
                      className={`size-4 rounded border flex items-center justify-center transition-all shrink-0 ${
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      }`}
                    >
                      {isSelected && <Check className="size-3" />}
                    </span>
                    <span className="flex-1">{o.label}</span>
                    {o.group && (
                      <span className="text-[0.6rem] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
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
