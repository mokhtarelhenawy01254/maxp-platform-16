import React, { useMemo, useState } from "react";
import { ChevronDownIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
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
        ? selectedNames.join("╪î ")
        : `${selectedNames.slice(0, 2).join("╪î ")} +${selectedNames.length - 2}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        className={`${fieldClassName} flex items-center justify-between gap-1.5 text-start`}
      >
        <span
          className={`truncate ${value.length === 0 ? "text-slate-400 dark:text-slate-500" : ""}`}
        >
          {triggerText}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {value.length > 0 && (
            <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
              {value.length}
            </span>
          )}
          <ChevronDownIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
        </span>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="z-50 w-72 border border-slate-200/80 bg-white p-2 shadow-lg dark:border-slate-700/80 dark:bg-slate-900"
      >
        <div className="flex flex-col gap-2">
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              aria-label={searchPlaceholder}
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="theme-native-control w-full rounded-xl border border-slate-200/80 bg-white/90 px-3 py-1.5 pr-8 text-xs text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/15 dark:border-slate-700/80 dark:bg-slate-800/85 dark:text-slate-100"
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => onChange(normalized.map((option) => option.code))}
              className="rounded-lg px-2 py-1 text-[11px] font-semibold text-blue-600 transition hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/10"
            >
              {selectAllLabel}
            </button>
            <button
              type="button"
              onClick={() => onChange([])}
              className="rounded-lg px-2 py-1 text-[11px] font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
            >
              {clearAllLabel}
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {visible.length === 0 ? (
              <div className="px-2 py-4 text-center text-xs text-slate-400 dark:text-slate-500">
                {noResultsLabel}
              </div>
            ) : (
              visible.map((option) => {
                const isChecked = selectedMap.has(option.code.toLowerCase());
                return (
                  <label
                    key={option.code}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-slate-50 dark:hover:bg-slate-800"
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
                    <span className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
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
