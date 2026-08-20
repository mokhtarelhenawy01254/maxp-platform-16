import React, { useState, useRef, useEffect, useMemo } from "react";
import { MagnifyingGlassIcon, CheckIcon, ChevronUpDownIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "اختر...",
  searchPlaceholder = "بحث...",
  emptyText = "لا توجد نتائج",
  disabled = false,
  loading = false,
  loadingText = "جاري التحميل...",
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus();
    }
    if (!open) {
      setSearch("");
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q),
    );
  }, [options, search]);

  const selectedLabel = options.find((opt) => opt.value === value)?.label || "";

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    setOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-2 text-right border rounded-md transition-colors ${
          disabled
            ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700"
            : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-900 dark:text-gray-100"
        } ${open ? "ring-2 ring-blue-500 border-blue-500" : ""}`}
      >
        <span className={`truncate ${value ? "" : "text-gray-400 dark:text-gray-500"}`}>
          {loading ? loadingText : value ? selectedLabel : placeholder}
        </span>
        <ChevronUpDownIcon className="w-4 h-4 text-gray-400 shrink-0 mr-2" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
          <div className="relative border-b border-gray-200 dark:border-gray-600">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pr-9 pl-3 py-2 text-sm bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="max-h-48 overflow-y-auto">
            {value && (
              <button
                onClick={handleClear}
                className="w-full text-right px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 border-b border-gray-100 dark:border-gray-600"
              >
                <XMarkIcon className="w-4 h-4" />
                إلغاء التحديد
              </button>
            )}
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-6 text-sm text-gray-400 dark:text-gray-500 text-center">
                {emptyText}
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full text-right px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                    opt.value === value
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                      : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      opt.value === value
                        ? "bg-blue-600 border-blue-600"
                        : "border-gray-300 dark:border-gray-500"
                    }`}
                  >
                    {opt.value === value && (
                      <CheckIcon className="w-3 h-3 text-white" strokeWidth={3} />
                    )}
                  </span>
                  <span className="truncate">{opt.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export { SearchableSelect };
export type { SearchableSelectOption };
