import React from "react";
import { GitCommit, TrendingUp, Users, Gift, Clock, Sparkles } from "lucide-react";
import { EducationFunnelData } from "./types";

interface EducationFunnelTabProps {
  funnel: EducationFunnelData | null;
  loading: boolean;
  isEn: boolean;
}

export const EducationFunnelTab: React.FC<EducationFunnelTabProps> = ({
  funnel,
  loading,
  isEn,
}) => {
  const totalCustomers = funnel?.totalCustomers ?? 0;
  const demoAttendees = funnel?.totalDemoAttendees ?? 0;
  const demoAttended = funnel?.attendedDemoAttendees ?? 0;
  const enrolledStudents = funnel?.registeredStudents ?? 0;
  const packageEnrollments = funnel?.packagesEnrollments ?? 0;
  const completedSessions = funnel?.completedSessions ?? 0;

  const baselineCount = Math.max(totalCustomers, 1);

  const stages = [
    {
      label: isEn ? "Incoming Leads & Customers" : "الليدات والعملاء الواردين",
      count: totalCustomers,
      rate: 100,
      color: "bg-blue-600",
      textColor: "text-blue-600 dark:text-blue-400",
    },
    {
      label: isEn ? "Demo Day Registrations" : "مسجلو اليوم التجريبي (ديمو داي)",
      count: demoAttendees,
      rate: Math.min(100, Math.round((demoAttendees / baselineCount) * 100)),
      color: "bg-purple-600",
      textColor: "text-purple-600 dark:text-purple-400",
    },
    {
      label: isEn ? "Attended Demo Day (Show-up)" : "حضور الديمو داي الفعلي",
      count: demoAttended,
      rate: Math.min(
        100,
        demoAttendees > 0 ? Math.round((demoAttended / demoAttendees) * 100) : 0
      ),
      color: "bg-indigo-600",
      textColor: "text-indigo-600 dark:text-indigo-400",
    },
    {
      label: isEn ? "Enrolled Paying Students" : "الطلاب المشتركين في باقات",
      count: enrolledStudents,
      rate: Math.min(100, Math.round((enrolledStudents / baselineCount) * 100)),
      color: "bg-emerald-600",
      textColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: isEn ? "Completed Sessions" : "الحصص الدراسية المنفذة",
      count: completedSessions,
      rate: funnel?.rates?.completionRate ?? 0,
      color: "bg-teal-600",
      textColor: "text-teal-600 dark:text-teal-400",
    },
  ];

  return (
    <div className="space-y-6 pt-2">
      {/* Unified Pipeline + Telemetry Grid (Single Surface - No Cards inside Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:divide-x lg:divide-x-reverse lg:divide-border/60">
        {/* Left 7 cols: Pipeline Flow (Clean Single Surface) */}
        <div className="lg:col-span-7 space-y-4 lg:pl-6">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-primary" />
                {isEn ? "Academy Conversion Pipeline" : "قمع التحويل ومسار الطالب في الأكاديمية"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEn ? "From ad lead to completed session" : "تسلسل تحول الليد إلى طالب وحصص"}
              </p>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
              5 {isEn ? "Stages" : "مراحل"}
            </span>
          </div>

          <div className="space-y-4 pt-1">
            {stages.map((stg, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    {stg.label}
                  </span>
                  <div className="flex items-center gap-2 font-mono tabular-nums">
                    <span className="font-bold text-foreground">{stg.count.toLocaleString()}</span>
                    <span className="text-[11px] text-muted-foreground w-12 text-left">
                      ({stg.rate}%)
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-muted/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${stg.color} rounded-full transition-all duration-300`}
                    style={{
                      width: `${Math.max(0, Math.min(100, Math.max(stg.rate, stg.count > 0 ? 3 : 0)))}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 5 cols: Telemetry & Retention (Flat Telemetry, NO nested card boxes!) */}
        <div className="lg:col-span-5 space-y-5 lg:pr-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              {isEn ? "Conversion & Retention Rates" : "معدلات التحويل والولاء الأكاديمي"}
            </h3>
            <span className="text-[11px] font-mono text-muted-foreground">KPIs</span>
          </div>

          {/* Flat metrics strip separated by hairlines (no border boxes!) */}
          <div className="grid grid-cols-2 gap-4 py-1 border-b border-border/60 pb-5">
            <div className="space-y-1">
              <div className="text-[11px] font-medium text-muted-foreground">
                {isEn ? "Lead to Student" : "العملاء إلى طلاب"}
              </div>
              <div className="text-2xl font-bold text-foreground font-mono tabular-nums">
                {funnel?.rates?.customersToStudents ?? 0}%
              </div>
              <div className="text-[10px] text-muted-foreground">
                {isEn ? "Enrolled conversion" : "معدل التحويل لاشتراك"}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-medium text-muted-foreground">
                {isEn ? "Student to Packages" : "الطلاب لتسجيلات"}
              </div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                {funnel?.rates?.studentsToEnrollments ?? 0}%
              </div>
              <div className="text-[10px] text-muted-foreground">
                {isEn ? "Package adoption" : "الاشتراك في باقات"}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-medium text-muted-foreground">
                {isEn ? "Sessions Completed" : "إنجاز الحصص"}
              </div>
              <div className="text-2xl font-bold text-teal-600 dark:text-teal-400 font-mono tabular-nums">
                {funnel?.rates?.completionRate ?? 0}%
              </div>
              <div className="text-[10px] text-muted-foreground">
                {isEn ? "Attendance discipline" : "نسبة الحضور والالتزام"}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-medium text-muted-foreground">
                {isEn ? "Package Renewals" : "تجديد الباقات"}
              </div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 font-mono tabular-nums">
                {funnel?.rates?.repeatRate ?? 0}%
              </div>
              <div className="text-[10px] text-muted-foreground">
                {isEn ? "Student retention" : "تكرار الشراء والولاء"}
              </div>
            </div>
          </div>

          {/* Flat accent callout: NO nested border box! Single hairline accent bar */}
          <div className="border-r-2 border-primary/70 pr-3 py-1 space-y-1 text-xs">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>{isEn ? "Retention & Lifetime Value" : "تكرار الشراء والاحتفاظ بالطلاب"}</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {isEn
                ? `Students with multiple package enrollments: ${
                    funnel?.repeatStats?.multipleEnrollmentsStudents ?? 0
                  } (${funnel?.rates?.repeatRate ?? 0}% renewal rate).`
                : `طلاب باشتراكات وباقات متعددة: ${
                    funnel?.repeatStats?.multipleEnrollmentsStudents ?? 0
                  } طالب (${funnel?.rates?.repeatRate ?? 0}% معدل تجديد).`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
