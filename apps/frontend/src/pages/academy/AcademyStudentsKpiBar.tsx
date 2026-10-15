import { Users, CheckCircle2, Clock, FileText } from "lucide-react";

interface AcademyStudentsKpiBarProps {
  totalStudents: number;
  completedStudents: number;
  inProgressStudents: number;
  pendingSubmissionsCount: number;
}

export function AcademyStudentsKpiBar({
  totalStudents,
  completedStudents,
  inProgressStudents,
  pendingSubmissionsCount,
}: AcademyStudentsKpiBarProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-[11px] text-muted-foreground font-medium">
            إجمالي المسجلين
          </span>
          <div className="text-xl sm:text-2xl font-bold text-foreground mt-0.5 font-mono tabular-nums">
            {totalStudents}
          </div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Users className="w-4 h-4" />
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-[11px] text-muted-foreground font-medium">
            أكملوا وحصلوا على شهادة
          </span>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono tabular-nums">
            {completedStudents}
          </div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <CheckCircle2 className="w-4 h-4" />
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-[11px] text-muted-foreground font-medium">
            قيد التعلم والمتابعة
          </span>
          <div className="text-xl sm:text-2xl font-bold text-primary mt-0.5 font-mono tabular-nums">
            {inProgressStudents}
          </div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Clock className="w-4 h-4" />
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-[11px] text-muted-foreground font-medium">
            تسليمات بحاجة لمراجعة
          </span>
          <div className="text-xl sm:text-2xl font-bold text-amber-500 mt-0.5 font-mono tabular-nums">
            {pendingSubmissionsCount}
          </div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
          <FileText className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
