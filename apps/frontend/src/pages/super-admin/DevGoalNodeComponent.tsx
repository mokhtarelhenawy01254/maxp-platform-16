import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, User } from "lucide-react";

export interface GoalNode {
  id: string;
  title: string;
  type: string;
  status: string;
  progress: number;
  confidence: string | null;
  priority: string;
  currentValue: number;
  targetValue: number;
  unit: string | null;
  owner: { id: string; name: string } | null;
  keyResults: Array<{ id: string; title: string; targetValue: number; currentValue: number; status: string }>;
  _count: { linkedTasks: number; childGoals: number };
  children: GoalNode[];
}

export const statusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  COMPLETED: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
  ON_HOLD: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
  CANCELLED: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
};

export const confidenceColors: Record<string, string> = {
  ON_TRACK: "bg-emerald-500",
  AT_RISK: "bg-amber-500",
  OFF_TRACK: "bg-rose-500",
};

interface DevGoalNodeComponentProps {
  goal: GoalNode;
  level: number;
  navigate: ReturnType<typeof useNavigate>;
}

export const DevGoalNodeComponent: React.FC<DevGoalNodeComponentProps> = ({
  goal,
  level,
  navigate,
}) => {
  const [expanded, setExpanded] = useState(level < 2);
  const hasChildren = goal.children && goal.children.length > 0;

  return (
    <div style={{ marginRight: `${level * 20}px` }} className="relative">
      {level > 0 && (
        <div className="absolute right-[-10px] top-4 w-2.5 h-[1px] bg-border/70" />
      )}
      <div
        className={`bg-card rounded-lg border border-border/70 p-3 mb-2 hover:border-border/90 transition-colors shadow-xs ${
          level > 0 ? "border-r-2 border-r-primary/70" : ""
        }`}
      >
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="p-1 hover:bg-muted/40 rounded text-muted-foreground transition-colors shrink-0 cursor-pointer"
              >
                {expanded ? (
                  <ChevronDown className="size-3.5" />
                ) : (
                  <ChevronRight className="size-3.5" />
                )}
              </button>
            ) : (
              <div className="w-4 shrink-0" />
            )}

            <div
              className="cursor-pointer min-w-0 flex-1"
              onClick={() => navigate(`/super-admin/dev-goals/${goal.id}`)}
            >
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-xs font-semibold text-foreground hover:text-primary transition-colors tracking-tight truncate">
                  {goal.title}
                </h4>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${statusColors[goal.status] || ""}`}>
                  {goal.status}
                </span>
                {goal.confidence && (
                  <span className="flex items-center gap-1 text-[10px]">
                    <span className={`size-1.5 rounded-full ${confidenceColors[goal.confidence] || ""}`} />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5 mt-0.5 text-[10px] text-muted-foreground flex-wrap font-mono">
                {goal.owner && (
                  <span className="flex items-center gap-1 font-sans">
                    <User className="size-3" />
                    <span>{goal.owner.name}</span>
                  </span>
                )}
                <span className="tabular-nums">{goal._count.linkedTasks} مهمة</span>
                <span className="tabular-nums">{goal.keyResults.length} نتائج رئيسية</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {goal.keyResults.length > 0 && (
              <div className="hidden sm:flex items-center gap-1">
                {goal.keyResults.slice(0, 4).map((kr) => {
                  const krProg = kr.targetValue > 0 ? (kr.currentValue / kr.targetValue) * 100 : 0;
                  return (
                    <div key={kr.id} className="w-5 h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${krProg >= 80 ? "bg-emerald-500" : krProg >= 50 ? "bg-blue-500" : "bg-amber-500"}`}
                        style={{ width: `${Math.min(krProg, 100)}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <div className="text-left min-w-[55px]">
              <div className="text-xs font-bold font-mono text-foreground tabular-nums">
                {goal.progress}%
              </div>
              <div className="w-12 bg-muted rounded-full h-1 mt-0.5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    goal.progress >= 80 ? "bg-emerald-500" : goal.progress >= 50 ? "bg-blue-500" : "bg-amber-500"
                  }`}
                  style={{ width: `${goal.progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {expanded && hasChildren && (
        <div className="relative border-r border-border/50 mr-2 pr-2 my-1">
          {goal.children.map((child) => (
            <DevGoalNodeComponent key={child.id} goal={child} level={level + 1} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  );
};
