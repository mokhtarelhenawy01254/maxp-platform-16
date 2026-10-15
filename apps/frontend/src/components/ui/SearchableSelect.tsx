import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, Check, ChevronsUpDown, X, Loader2 } from "lucide-react";

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
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`w-full flex items-center justify-between px-3 py-2 text-right border rounded-lg transition-colors text-xs ${
          disabled
            ? "bg-muted/50 cursor-not-allowed text-muted-foreground border-border/50"
            : "bg-card border-border/70 hover:border-border text-foreground shadow-xs"
        } ${open ? "ring-1 ring-primary/40 border-primary" : ""}`}
      >
        <span className={`truncate ${value ? "text-foreground font-medium" : "text-muted-foreground"}`}>
          {loading ? (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="size-3 animate-spin text-primary" />
              {loadingText}
            </span>
          ) : value ? (
            selectedLabel
          ) : (
            placeholder
          )}
        </span>
        <ChevronsUpDown className="size-3.5 text-muted-foreground shrink-0 mr-2" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-card border border-border/70 rounded-xl shadow-xl overflow-hidden divide-y divide-border/40 animate-in fade-in zoom-in-95 duration-100">
          <div className="relative p-2 bg-muted/20">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pr-8 pl-7 py-1 text-xs bg-background border border-border/60 rounded-md outline-none text-foreground placeholder:text-muted-foreground focus:border-primary"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                aria-label="مسح البحث"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          <div className="max-h-48 overflow-y-auto divide-y divide-border/20">
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="w-full text-right px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-500/10 flex items-center gap-2 transition-colors"
              >
                <X className="size-3" />
                <span>إلغاء التحديد</span>
              </button>
            )}
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-6 text-xs text-muted-foreground text-center">
                {emptyText}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full text-right px-3 py-2 text-xs flex items-center justify-between gap-2 transition-colors ${
                      isSelected
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <Check className="size-3.5 text-primary shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export { SearchableSelect };
export type { SearchableSelectOption };
