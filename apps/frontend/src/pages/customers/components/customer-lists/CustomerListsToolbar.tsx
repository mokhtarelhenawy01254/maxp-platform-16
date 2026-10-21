import React, { RefObject } from "react";
import { Search, ListFilter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CustomerListsToolbarProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  filterType: "all" | "custom" | "default";
  onFilterTypeChange: (val: "all" | "custom" | "default") => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
}

export const CustomerListsToolbar: React.FC<CustomerListsToolbarProps> = ({
  searchTerm,
  onSearchChange,
  filterType,
  onFilterTypeChange,
  searchInputRef,
}) => {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
        <Input
          ref={searchInputRef}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="ابحث في القوائم..."
          className="h-10 rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] pr-9"
        />
      </div>
      <div className="flex items-center gap-2">
        <ListFilter className="size-4 text-[color:var(--color-muted-foreground)]" />
        <div className="flex flex-wrap gap-1 rounded-full border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] p-1">
          {([
            { value: "all", label: "الكل" },
            { value: "custom", label: "المخصصة" },
            { value: "default", label: "الافتراضية" },
          ] as const).map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => onFilterTypeChange(f.value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filterType === f.value
                  ? "bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)]"
                  : "text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)]",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
