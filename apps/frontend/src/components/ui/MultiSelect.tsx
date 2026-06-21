import React, { useState, useRef, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Input } from "./input";

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
  const containerRef = useRef<HTMLDivElement>(null);

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
        <button className="w-full min-h-10 rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-right flex flex-wrap gap-1 items-center cursor-pointer hover:border-ring transition-colors">
          {selected.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            selected.map(v => {
              const opt = options.find(o => o.value === v);
              return (
                <span key={v} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                  {opt?.label || v}
                  <button onClick={e => { e.stopPropagation(); toggle(v); }} className="hover:text-destructive leading-none">&times;</button>
                </span>
              );
            })
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div ref={containerRef} className="flex flex-col max-h-72">
          <div className="p-2 border-b">
            <Input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder={searchPlaceholder} />
          </div>
          <div className="flex gap-2 px-2 pt-1.5 pb-0.5 border-b">
            <button onClick={selectAll} className="text-xs text-primary hover:underline">تحديد الكل</button>
            <button onClick={deselectAll} className="text-xs text-muted-foreground hover:underline">إلغاء الكل</button>
          </div>
          <div className="overflow-auto py-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">{emptyText}</p>
            ) : (
              filtered.map(o => (
                <label key={o.value} className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 cursor-pointer text-sm">
                  <input type="checkbox" checked={selected.includes(o.value)} onChange={() => toggle(o.value)} className="size-3.5" />
                  <span className="flex-1">{o.label}</span>
                  {o.group && <span className="text-[0.6rem] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{o.group}</span>}
                </label>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
