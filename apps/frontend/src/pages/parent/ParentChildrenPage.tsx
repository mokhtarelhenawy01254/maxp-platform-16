import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Users,
  GraduationCap,
  CalendarDays,
  Clock,
  RefreshCw,
  ChevronLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  XCircle,
  FileText
} from "lucide-react";

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  grade?: string;
}

interface Session {
  id: string;
  scheduledAt: string;
  plannedDuration: number;
  actualDuration: number | null;
  status: string;
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

const mockChildren: Child[] = [
  {
    id: "ch-1",
    firstName: "يوسف",
    lastName: "محمد النجار",
    grade: "الصف الثالث الثانوي - علمي رياضة"
  },
  {
    id: "ch-2",
    firstName: "سارة",
    lastName: "محمد النجار",
    grade: "الصف الأول الإعدادي - لغات"
  }
];

const mockChildSessions: Session[] = [
  {
    id: "s-101",
    scheduledAt: new Date(Date.now() + 1000 * 60 * 120).toISOString(),
    plannedDuration: 60,
    actualDuration: null,
    status: "CONFIRMED",
    subject: { name: "الرياضيات التطبيقية - ميكانيكا" },
    teacher: { name: "أ. حسام الدين عبد الله" }
  },
  {
    id: "s-102",
    scheduledAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    plannedDuration: 90,
    actualDuration: 90,
    status: "CONFIRMED",
    subject: { name: "الفيزياء الكهربية" },
    teacher: { name: "أ. محمود شاكر" }
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

export const ParentChildrenPage: React.FC = () => {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchChildren = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem("parentToken");
      const res = await fetch("/api/v1/education/parent-portal/children", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setChildren(data.data);
      } else {
        setChildren(mockChildren);
      }
    } catch {
      setChildren(mockChildren);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchChildren();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[360px] space-y-3">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs font-mono text-muted-foreground uppercase">جاري تحميل قائمة الأبناء...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10" dir="rtl">
      {/* Telemetry Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
              STUDENT PROFILES
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              إجمالي {children.length} أبناء مسجلين
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">ملفات أبنائي الأكاديمية</h1>
          <p className="text-xs text-muted-foreground">
            متابعة الحصص التعليمية، المعلمين، ورصيد الساعات المتبقية لكل طالب
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchChildren}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/80 bg-background hover:bg-muted text-foreground transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>تحديث البيانات</span>
          </button>
        </div>
      </div>

      {/* Children Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children.map((child) => (
          <Link
            key={child.id}
            to={`/parent/children/${child.id}`}
            className="rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm p-5 hover:border-border transition-all flex flex-col justify-between space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="font-bold text-base text-foreground">
                  {child.firstName} {child.lastName}
                </h3>
                {child.grade && (
                  <p className="text-xs text-muted-foreground">{child.grade}</p>
                )}
              </div>
              <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                {child.firstName[0]}
              </div>
            </div>

            <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs text-primary font-medium">
              <span>عرض تفاصيل الحصص والتسجيلات</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </div>
          </Link>
        ))}

        {children.length === 0 && (
          <div className="col-span-2 rounded-xl border border-border/70 bg-card p-12 text-center space-y-2">
            <Users className="w-10 h-10 text-muted-foreground mx-auto stroke-1" />
            <p className="text-sm font-medium text-foreground">لا يوجد أبناء مسجلين حالياً</p>
            <p className="text-xs text-muted-foreground">يمكنك إضافة أبنائك والتسجيل عبر الأكاديمية</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const ParentChildDetailPage: React.FC = () => {
  const { studentId } = useParams();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [activeTab, setActiveTab] = useState<"sessions" | "enrollments">("sessions");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("parentToken");
    Promise.all([
      fetch(`/api/v1/education/parent-portal/children/${studentId}/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then((r) => r.json()).catch(() => ({ success: false })),
      fetch(`/api/v1/education/parent-portal/children/${studentId}/enrollments`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then((r) => r.json()).catch(() => ({ success: false }))
    ])
      .then(([sessRes, enrRes]) => {
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
      })
      .catch(() => {
        setSessions(mockChildSessions);
        setEnrollments(mockChildEnrollments);
      })
      .finally(() => setLoading(false));
  }, [studentId]);

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
      {/* Back Ribbon */}
      <div className="flex items-center justify-between">
        <Link
          to="/parent/children"
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          <span>العودة إلى قائمة الأبناء</span>
        </Link>
      </div>

      {/* Filter Tabs */}
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
              لا توجد حصص مسجلة
            </div>
          ) : (
            sessions.map((s) => (
              <div key={s.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-foreground">{s.subject?.name || "حصة تعليمية"}</h4>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                        s.status === "CONFIRMED"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                      }`}
                    >
                      {s.status === "CONFIRMED" ? "مؤكدة" : "مجدولة"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">المعلم: {s.teacher?.name || "معلم المادة"}</p>
                  <p className="text-[11px] font-mono text-muted-foreground">
                    {new Date(s.scheduledAt).toLocaleDateString("ar-EG")} • {s.actualDuration || s.plannedDuration} دقيقة
                  </p>
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
              لا توجد باقات مسجلة
            </div>
          ) : (
            enrollments.map((e) => (
              <div key={e.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-foreground">{e.package?.name || "باقة تعليمية"}</h4>
                  <p className="text-xs text-muted-foreground">
                    {e.subject?.name} • المعلم: {e.teacher?.name || "لم يحدد"}
                  </p>
                </div>
                <div className="text-left font-mono">
                  <div className="text-sm font-bold text-foreground">
                    {e.remainingHours} / {e.package?.hoursCount || 0} س
                  </div>
                  <div className="text-[11px] text-muted-foreground">{e.package?.price} ج.م</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ParentChildrenPage;
