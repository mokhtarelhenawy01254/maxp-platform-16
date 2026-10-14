import React from "react";
import { BarChart3 } from "lucide-react";

export interface MemberPerformance {
  memberId: string;
  userId: string;
  name: string;
  avatar: string | null;
  department: string | null;
  totalHours: string;
  billableHours: string;
  tasksCompleted: number;
  avgTaskDuration: string;
  efficiencyScore: number;
  timeLogCount: number;
}

interface TimeTrackingTeamPerformanceProps {
  memberPerformance: MemberPerformance[];
}

export function TimeTrackingTeamPerformance({
  memberPerformance,
}: TimeTrackingTeamPerformanceProps) {
  return (
    <div className="rounded-lg border border-border/70 bg-card shadow-xs overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-border/60 bg-muted/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-4 text-primary" />
          <h2 className="text-xs font-semibold text-foreground font-mono">
            أداء وإنتاجية الفريق
          </h2>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">
          {memberPerformance.length} عضو
        </span>
      </div>

      <div className="divide-y divide-border/50 max-h-96 overflow-y-auto font-mono">
        {memberPerformance.length > 0 ? (
          memberPerformance.map((member, index) => (
            <div key={member.memberId} className="p-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-muted-foreground font-mono w-4">
                    #{index + 1}
                  </span>
                  {member.avatar ? (
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="size-7 rounded-full border border-border"
                    />
                  ) : (
                    <div className="size-7 rounded-full flex items-center justify-center bg-primary/10 text-primary border border-primary/20 text-xs font-bold font-mono">
                      {member.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-xs text-foreground font-sans">
                      {member.name}
                    </p>
                    {member.department && (
                      <p className="text-[10px] text-muted-foreground font-sans">
                        {member.department}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-left font-mono">
                  <p className="font-bold text-xs text-foreground tabular-nums">
                    {member.totalHours}h
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {member.tasksCompleted} مهام
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-[10px]">
                <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{
                      width: `${Math.min(
                        (parseFloat(member.totalHours) / 8) * 100,
                        100,
                      )}%`,
                    }}
                  />
                </div>
                <span className="text-muted-foreground font-sans tabular-nums">
                  كفاءة: {(member.efficiencyScore ?? 0).toFixed(1)}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center py-10 text-xs text-muted-foreground font-mono">
            لا توجد بيانات في هذه الفترة
          </p>
        )}
      </div>
    </div>
  );
}
