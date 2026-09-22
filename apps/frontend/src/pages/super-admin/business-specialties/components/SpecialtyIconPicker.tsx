import React, { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../../components/ui/popover";
import { ScrollArea } from "../../../../components/ui/scroll-area";
import { cn } from "../../../../lib/utils";
import {
  SPECIALTY_ICON_CATALOG,
  getSpecialtyIcon,
} from "../types";

interface SpecialtyIconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
  disabled?: boolean;
}

export const SpecialtyIconPicker: React.FC<SpecialtyIconPickerProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const currentIconEntry = useMemo(
    () =>
      SPECIALTY_ICON_CATALOG.find((item) => item.name === value) || {
        name: value || "Briefcase",
        labelAr: "حقيبة أعمال",
        icon: getSpecialtyIcon(value),
      },
    [value],
  );

  const CurrentIcon = currentIconEntry.icon;

  const filteredIcons = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return SPECIALTY_ICON_CATALOG;
    return SPECIALTY_ICON_CATALOG.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.labelAr.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className="flex h-10 w-full items-center justify-between gap-2.5 rounded-lg border border-border/70 bg-background px-3 text-right hover:bg-muted/40 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <CurrentIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0 text-right">
            <span className="block truncate text-xs font-semibold text-foreground">
              {currentIconEntry.labelAr}
            </span>
            <span className="block truncate text-[0.65rem] text-muted-foreground font-mono" dir="ltr">
              {currentIconEntry.name}
            </span>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-80 rounded-xl border border-border/80 bg-card p-3 shadow-xl backdrop-blur-md"
      >
        <div className="relative mb-2.5">
          <Search className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن أيقونة (عربي أو English)..."
            className="h-8 rounded-lg pr-8 text-xs"
            autoFocus
          />
        </div>

        <ScrollArea className="h-60 pr-1">
          {filteredIcons.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              لا توجد أيقونة مطابقة للبحث.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-1.5">
              {filteredIcons.map((item) => {
                const IconComponent = item.icon;
                const isSelected = item.name === value;

                return (
                  <button
                    key={item.name}
                    type="button"
                    title={`${item.labelAr} (${item.name})`}
                    onClick={() => {
                      onChange(item.name);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      "group relative flex flex-col items-center justify-center gap-1 rounded-lg border p-2 text-center transition-all duration-150 active:scale-95",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                        : "border-transparent bg-muted/20 hover:border-border hover:bg-muted/60 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <IconComponent className="h-5 w-5 shrink-0" />
                    <span className="w-full truncate text-[0.65rem] leading-none">
                      {item.labelAr}
                    </span>
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-2 w-2 stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
