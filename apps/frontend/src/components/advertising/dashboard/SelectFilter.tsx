import React from "react";

export interface SelectFilterProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}

export default function SelectFilter({
  icon: Icon,
  label,
  value,
  onChange,
  options,
}: SelectFilterProps) {
  return (
    <label className="block select-none">
      <span className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
        <Icon className="size-3 text-muted-foreground" />
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8.5 w-full rounded-lg border border-border/70 bg-card px-2.5 text-xs font-medium text-foreground transition-all focus:border-primary focus:ring-1 focus:ring-primary/20 shadow-2xs outline-none cursor-pointer"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-card text-foreground">
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
