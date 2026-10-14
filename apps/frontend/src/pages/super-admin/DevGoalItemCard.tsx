import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  User,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flag,
  Eye,
  Trash2,
  Edit,
} from "lucide-react";

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  targetType: string;
  targetValue: number;
  currentValue: number;
  unit: string | null;
  progress: number;
  confidence: string | null;
  startDate: string;
  endDate: string;
  quarter: string | null;
  tags: string[];
  owner: { id: string; name: string; userId: string } | null;
  project: { id: string; name: string; color: string } | null;
  _count: { keyResults: number; linkedTasks: number; childGoals: number };
}

export const goalTypeLabels: Record<string, string> = {
  COMPANY: "هدف شركة",
  TEAM: "هدف فريق",
  INDIVIDUAL: "هدف فردي",
};

export const goalTypeColors: Record<string, string> = {
  COMPANY: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20",
  TEAM: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
  INDIVIDUAL: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
};

export const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ACTIVE: {
    label: "نشط",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    icon: <CheckCircle2 className="size-3.5" />,
  },
  COMPLETED: {
    label: "مكتمل",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
    icon: <Flag className="size-3.5" />,
  },
  ON_HOLD: {
    label: "معلق",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    icon: <Clock className="size-3.5" />,
  },
  CANCELLED: {
    label: "ملغي",
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
    icon: <AlertTriangle className="size-3.5" />,
  },
};

export const confidenceConfig: Record<string, { label: string; color: string }> = {
  ON_TRACK: { label: "على المسار", color: "bg-emerald-500" },
  AT_RISK: { label: "في خطر", color: "bg-amber-500" },
  OFF_TRACK: { label: "خارج المسار", color: "bg-rose-500" },
};

export const getProgressColor = (progress: number) => {
  if (progress >= 80) return "bg-emerald-500";
  if (progress >= 50) return "bg-blue-500";
  if (progress >= 30) return "bg-amber-500";
  return "bg-rose-500";
};

interface DevGoalItemCardProps {
  goal: Goal;
  deleteConfirm: string | null;
  setDeleteConfirm: (id: string | null) => void;
  onDelete: (id: string) => void;
}

export function DevGoalItemCard({
  goal,
  deleteConfirm,
  setDeleteConfirm,
  onDelete,
}: DevGoalItemCardProps) {
  const navigate = useNavigate();
  const statusInfo = statusConfig[goal.status] || statusConfig.ACTIVE;
  const confidenceInfo = goal.confidence ? confidenceConfig[goal.confidence] : null;
  const isOverdue = new Date(goal.endDate) < new Date() && goal.status === "ACTIVE";

  return (
    <div className="bg-card rounded-lg border border-border/70 overflow-hidden hover:border-border/90 transition-colors shadow-xs">
      {/* Slim Linear Progress Bar Header */}
      <div className="h-1 bg-muted/40">
        <div
          className={`h-full transition-all duration-300 ${getProgressColor(goal.progress)}`}
          style={{ width: `${goal.progress}%` }}
        />
      </div>

      <div className="p-3.5 sm:p-4">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${goalTypeColors[goal.type] || ""}`}>
                {goalTypeLabels[goal.type] || goal.type}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium flex items-center gap-1 ${statusInfo.color}`}>
                {statusInfo.icon}
                {statusInfo.label}
              </span>
              {confidenceInfo && (
                <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/60">
                  <span className={`size-1.5 rounded-full ${confidenceInfo.color}`} />
                  {confidenceInfo.label}
                </span>
              )}
              {isOverdue && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  متأخر
                </span>
              )}
            </div>
            <h3
              className="text-sm font-semibold text-foreground cursor-pointer hover:text-primary transition-colors tracking-tight"
              onClick={() => navigate(`/super-admin/dev-goals/${goal.id}`)}
            >
              {goal.title}
            </h3>
            {goal.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {goal.description}
              </p>
            )}
          </div>

          <div className="flex items-baseline gap-0.5 text-left shrink-0 font-mono">
            <span className="text-xl font-bold tracking-tight text-foreground tabular-nums">
              {goal.progress}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">%</span>
          </div>
        </div>

        {/* Metrics Telemetry Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-2.5 text-center font-mono">
          <div className="bg-muted/20 border border-border/60 rounded p-1.5">
            <p className="text-[10px] text-muted-foreground">النتائج الرئيسية</p>
            <p className="text-xs font-semibold text-foreground mt-0.5 tabular-nums">
              {goal._count.keyResults}
            </p>
          </div>
          <div className="bg-muted/20 border border-border/60 rounded p-1.5">
            <p className="text-[10px] text-muted-foreground">المهام المرتبطة</p>
            <p className="text-xs font-semibold text-foreground mt-0.5 tabular-nums">
              {goal._count.linkedTasks}
            </p>
          </div>
          <div className="bg-muted/20 border border-border/60 rounded p-1.5">
            <p className="text-[10px] text-muted-foreground">أهداف فرعية</p>
            <p className="text-xs font-semibold text-foreground mt-0.5 tabular-nums">
              {goal._count.childGoals}
            </p>
          </div>
          <div className="bg-muted/20 border border-border/60 rounded p-1.5">
            <p className="text-[10px] text-muted-foreground">القيمة المستهدفة</p>
            <p className="text-xs font-semibold text-foreground mt-0.5 tabular-nums">
              {goal.currentValue} / {goal.targetValue}
              {goal.unit ? ` ${goal.unit}` : ""}
            </p>
          </div>
        </div>

        {/* Footer Info & Actions */}
        <div className="flex items-center justify-between pt-2.5 border-t border-border/60 flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2.5 text-muted-foreground flex-wrap font-mono text-[11px]">
            {goal.owner && (
              <span className="flex items-center gap-1">
                <User className="size-3.5" />
                <span className="font-sans">{goal.owner.name}</span>
              </span>
            )}
            {goal.project && (
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ backgroundColor: goal.project.color }} />
                <span className="font-sans">{goal.project.name}</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="size-3.5" />
              <span className="tabular-nums">
                {new Date(goal.startDate).toLocaleDateString("ar-EG")} - {new Date(goal.endDate).toLocaleDateString("ar-EG")}
              </span>
            </span>
            {goal.quarter && (
              <span className="px-1.5 py-0.5 bg-muted/50 rounded text-[10px] border border-border/60">
                {goal.quarter}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate(`/super-admin/dev-goals/${goal.id}`)}
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
              title="عرض"
            >
              <Eye className="size-3.5" />
            </button>
            <button
              onClick={() => navigate(`/super-admin/dev-goals/${goal.id}/edit`)}
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
              title="تعديل"
            >
              <Edit className="size-3.5" />
            </button>
            {deleteConfirm === goal.id ? (
              <div className="flex items-center gap-1 bg-destructive/10 p-0.5 rounded border border-destructive/20 font-mono text-[10px]">
                <button
                  onClick={() => onDelete(goal.id)}
                  className="px-1.5 py-0.5 bg-destructive text-destructive-foreground font-medium rounded hover:bg-destructive/90 transition-colors"
                >
                  تأكيد
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-1.5 py-0.5 bg-muted text-foreground font-medium rounded hover:bg-muted/80 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirm(goal.id)}
                className="p-1 hover:bg-rose-500/10 rounded text-muted-foreground hover:text-rose-500 transition-colors"
                title="حذف"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
