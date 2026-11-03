import React from "react";
import { ChevronDown } from "lucide-react";
import type { Project, TaskFiltersState, TaskUser } from "../types";

export interface TaskControlBarDropdownsProps {
  filters: TaskFiltersState;
  setFilters: (filters: TaskFiltersState) => void;
  setCurrentPage?: (page: number) => void;
  projects?: Project[];
  users?: TaskUser[];
  isMobileGrid?: boolean;
}

const statusOptions = [
  { value: "pending", label: "قيد الانتظار" },
  { value: "in_progress", label: "قيد التنفيذ" },
  { value: "in_review", label: "قيد المراجعة" },
  { value: "completed", label: "مكتملة" },
  { value: "cancelled", label: "ملغاة" },
];

const priorityOptions = [
  { value: "urgent", label: "عاجل" },
  { value: "high", label: "مرتفع" },
  { value: "medium", label: "متوسط" },
  { value: "low", label: "منخفض" },
];

const FilterDropdown: React.FC<{
  id: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}> = ({ id, value, onChange, options, placeholder }) => {
  const isSelected = Boolean(value);
  return (
    <div
      className={`relative inline-flex items-center rounded-lg border transition-all ${
        isSelected
          ? "border-primary/40 bg-primary/10 text-primary font-medium"
          : "border-border/60 bg-muted/20 text-muted-foreground hover:border-border hover:bg-muted/40"
      }`}
    >
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-7 w-full bg-transparent text-xs appearance-none focus:outline-none cursor-pointer py-0.5 pr-2.5 pl-6 ${
          isSelected ? "text-primary font-medium" : "text-foreground"
        }`}
      >
        <option value="" className="bg-card text-foreground">
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-card text-foreground">
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute left-2 size-3 text-muted-foreground" />
    </div>
  );
};

export const TaskControlBarDropdowns: React.FC<TaskControlBarDropdownsProps> = ({
  filters,
  setFilters,
  setCurrentPage,
  projects = [],
  users = [],
  isMobileGrid = false,
}) => {
  const projectOptions = projects.map((p) => ({ value: p.id, label: p.name }));
  const userOptions = users.map((u) => ({
    value: u.id,
    label: u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || "مستخدم",
  }));

  const handleUpdate = (key: keyof TaskFiltersState, val: string) => {
    setFilters({ ...filters, [key]: val });
    setCurrentPage?.(1);
  };

  const containerCls = isMobileGrid
    ? "grid grid-cols-2 gap-2"
    : "flex flex-wrap items-center gap-1.5";

  return (
    <div className={containerCls}>
      <FilterDropdown
        id="controlbar-project"
        value={filters.projectId}
        onChange={(val) => handleUpdate("projectId", val)}
        options={projectOptions}
        placeholder="كل المشاريع"
      />
      <FilterDropdown
        id="controlbar-status"
        value={filters.status}
        onChange={(val) => handleUpdate("status", val)}
        options={statusOptions}
        placeholder="كل الحالات"
      />
      <FilterDropdown
        id="controlbar-priority"
        value={filters.priority}
        onChange={(val) => handleUpdate("priority", val)}
        options={priorityOptions}
        placeholder="كل الأولويات"
      />
      {userOptions.length > 0 && (
        <FilterDropdown
          id="controlbar-assignee"
          value={filters.assignedTo}
          onChange={(val) => handleUpdate("assignedTo", val)}
          options={userOptions}
          placeholder="كل المسؤولين"
        />
      )}
    </div>
  );
};
