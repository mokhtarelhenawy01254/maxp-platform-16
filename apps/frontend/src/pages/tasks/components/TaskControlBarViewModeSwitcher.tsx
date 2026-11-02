import React from "react";
import { LayoutList, Layers, Kanban } from "lucide-react";
import type { TaskViewMode } from "../types";

export interface TaskControlBarViewModeSwitcherProps {
  viewMode?: TaskViewMode | "kanban" | "list";
  onViewModeChange?: (mode: "flat" | "grouped" | "kanban") => void;
  onToggleViewMode?: () => void;
}

export const TaskControlBarViewModeSwitcher: React.FC<TaskControlBarViewModeSwitcherProps> = ({
  viewMode = "grouped",
  onViewModeChange,
  onToggleViewMode,
}) => {
  const isModeActive = (m: "flat" | "grouped" | "kanban") => {
    if (m === "flat") return viewMode === "flat" || viewMode === "list";
    return viewMode === m;
  };

  const handleMode = (mode: "flat" | "grouped" | "kanban") => {
    if (onViewModeChange) onViewModeChange(mode);
    else if (onToggleViewMode) onToggleViewMode();
  };

  return (
    <div className="hidden lg:inline-flex rounded-lg border border-border/50 bg-muted/30 p-0.5">
      <button
        type="button"
        title="عرض القائمة"
        onClick={() => handleMode("flat")}
        className={`rounded-md p-1.5 text-xs transition-all active:scale-[0.98] ${
          isModeActive("flat")
            ? "bg-card text-foreground shadow-xs"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <LayoutList className="size-3.5" />
      </button>
      <button
        type="button"
        title="عرض مجمع بالمشروع"
        onClick={() => handleMode("grouped")}
        className={`rounded-md p-1.5 text-xs transition-all active:scale-[0.98] ${
          isModeActive("grouped")
            ? "bg-card text-foreground shadow-xs"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Layers className="size-3.5" />
      </button>
      <button
        type="button"
        title="لوحة كانبان"
        onClick={() => handleMode("kanban")}
        className={`rounded-md p-1.5 text-xs transition-all active:scale-[0.98] ${
          isModeActive("kanban")
            ? "bg-card text-foreground shadow-xs"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Kanban className="size-3.5" />
      </button>
    </div>
  );
};
