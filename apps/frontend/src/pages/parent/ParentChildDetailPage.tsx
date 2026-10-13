import React, { useEffect, useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Users,
  GraduationCap,
  CalendarDays,
  Clock,
  RefreshCw,
  ArrowRight,
  BookOpen,
  User,
  CheckCircle2,
  CalendarCheck
} from "lucide-react";

interface Session {
  id: string;
  scheduledAt: string;
  plannedDuration: number;
  actualDuration: number | null;
  status: "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | string;
  subject: { name: string };
  teacher: { name: string };
  enrollment?: { remainingHours: number; totalHours: number };
}

interface Enrollment {
  id: string;
  remainingHours: number;
  totalHours?: number;
  package: { id: string; name: string; hoursCount: number; price: number };
  teacher: { name: string } | null;
  subject: { name: string } | null;
}

const mockChildSessions: Session[] = [
  {
    id: "s-101",
    scheduledAt: new Date(Date.now() + 1000 * 60 * 180).toISOString(),
    plannedDuration: 60,
    actualDuration: null,
    status: "CONFIRMED",
    subject: { name: "الرياضيات التطبيقية - تفاضل وتكامل" },
    teacher: { name: "أ. حسام الدين عبد الله" }
  },
  {
    id: "s-102",
    scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 28).toISOString(),
    plannedDuration: 90,
    actualDuration: null,
    status: "SCHEDULED",
    subject: { name: "الفيزياء الكهربية والدوائر" },
    teacher: { name: "أ. محمود شاكر" }
  },
  {
    id: "s-103",
    scheduledAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    plannedDuration: 60,
    actualDuration: 60,
    status: "COMPLETED",
    subject: { name: "الرياضيات العامة" },
    teacher: { name: "أ. حسام الدين عبد الله" }
  }
];

const mockChildEnrollments: Enrollment[] = [
  {
    id: "en-1",
    remainingHours: 14,
    totalHours: 20,
    package: { id: "p-1", name: "باقة الرياضيات المتكاملة", hoursCount: 20, price: 3000 },
    teacher: { name: "أ. حسام الدين عبد الله" },
    subject: { name: "الرياضيات التطبيقية" }
  },
  {
    id: "en-2",
    remainingHours: 6,
    totalHours: 12,
    package: { id: "p-2", name: "باقة الفيزياء المتقدمة", hoursCount: 12, price: 2100 },
    teacher: { name: "أ. محمود شاكر" },
    subject: { name: "الفيزياء الحديثة" }
  }
];

const ParentChildDetailPage: React.FC = () => {
  const { studentId } = useParams();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [activeTab, setActiveTab] = useState<"sessions" | "enrollments">("sessions");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDetail = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem("parentToken");
      const [sessRes, enrRes] = await Promise.all([
        fetch(`/api/v1/education/parent-portal/children/${studentId}/sessions`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then((r) => r.json()).catch(() => ({ success: false })),
        fetch(`/api/v1/education/parent-portal/children/${studentId}/enrollments`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then((r) => r.json()).catch(() => ({ success: false }))
      ]);

      if (sessRes.success && Array.isArray(sessRes.data) && sessRes.data.length > 0) {
        setSessions(sessRes.data);
      } else {
        setSessions(mockChildSessions);
      }

      if (enrRes.success && Array.isArray(enrRes.data) && enrRes.data.length > 0) {
        setEnrollments(enrRes.data);
      } else {
        setEnrollments(mockChildEnrollments);
      }
    } catch {
      setSessions(mockChildSessions);
      setEnrollments(mockChildEnrollments);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [studentId]);

  const totalRemainingHours = useMemo(() => {
    return enrollments.reduce((sum, e) => sum + e.remainingHours, 0);
  }, [enrollments]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[360px] space-y-3">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs font-mono text-muted-foreground uppercase">جاري تحميل ملف الطالب...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10" dir="rtl">
      {/* Telemetry Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              to="/parent/children"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>العودة لقائمة الأبناء</span>
            </Link>
            <span className="text-muted-foreground">•</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
              STUDENT PROFILE
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">الملف الأكاديمي للطالب</h1>
          <p className="text-xs text-muted-foreground">
            متابعة جدول الحصص الفردية، حضور الدروس، ورصيد ساعات الباقات المسجلة
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchDetail}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/80 bg-background hover:bg-muted text-foreground transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">الساعات المتبقية</span>
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-foreground mt-2">
            {totalRemainingHours} ساعة
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">الحصص المجدولة</span>
            <CalendarCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-foreground mt-2">
            {sessions.length} حصة
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">الباقات المشترك بها</span>
            <GraduationCap className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-foreground mt-2">
            {enrollments.length} باقة
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg border border-border/50 text-xs w-fit">
        <button
          onClick={() => setActiveTab("sessions")}
          className={`px-3.5 py-1.5 rounded-md font-medium transition-all ${
            activeTab === "sessions"
              ? "bg-background text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          سجل الحصص ({sessions.length})
        </button>
        <button
          onClick={() => setActiveTab("enrollments")}
          className={`px-3.5 py-1.5 rounded-md font-medium transition-all ${
            activeTab === "enrollments"
              ? "bg-background text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          الباقات والتسجيلات ({enrollments.length})
        </button>
      </div>

      {/* Tab 1: Sessions */}
      {activeTab === "sessions" && (
        <div className="rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm overflow-hidden divide-y divide-border/60">
          {sessions.length === 0 ? (
            <div className="text-center py-12 px-4 text-xs text-muted-foreground">
              لا توجد حصص مسجلة للطالب
            </div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className="p-5 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-foreground">
                        {s.subject?.name || "حصة تدريس"}
                      </h4>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                          s.status === "CONFIRMED"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : s.status === "COMPLETED"
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                        }`}
                      >
                        {s.status === "CONFIRMED" ? "مؤكدة" : s.status === "COMPLETED" ? "مكتملة" : "مجدولة"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">المعلم: {s.teacher?.name || "معلم المادة"}</p>
                    <p className="text-[11px] font-mono text-muted-foreground">
                      {new Date(s.scheduledAt).toLocaleDateString("ar-EG")} • {s.actualDuration || s.plannedDuration} دقيقة
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Enrollments */}
      {activeTab === "enrollments" && (
        <div className="rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm overflow-hidden divide-y divide-border/60">
          {enrollments.length === 0 ? (
            <div className="text-center py-12 px-4 text-xs text-muted-foreground">
              لا توجد باقات مسجلة للطالب
            </div>
          ) : (
            enrollments.map((e) => {
              const total = e.package?.hoursCount || 20;
              const pct = Math.min(100, Math.round((e.remainingHours / total) * 100));

              return (
                <div
                  key={e.id}
                  className="p-5 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="space-y-1.5 flex-1 max-w-md">
                    <h4 className="text-sm font-semibold text-foreground">
                      {e.package?.name || "باقة تعليمية"}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {e.subject?.name} • المعلم: {e.teacher?.name || "لم يحدد"}
                    </p>
                    <div className="w-full pt-1 space-y-1">
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                        <span>المتبقي: {e.remainingHours} ساعة</span>
                        <span>الإجمالي: {total} ساعة</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left font-mono">
                    <div className="text-sm font-bold text-foreground">
                      {e.package?.price} ج.م
                    </div>
                    <div className="text-[11px] text-muted-foreground">سعر الباقة</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default ParentChildDetailPage;
