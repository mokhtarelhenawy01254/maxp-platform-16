import React, { useEffect, useState, useMemo } from "react";
import {
  CalendarDays,
  Clock,
  Search,
  RefreshCw,
  CheckCircle2,
  CalendarCheck,
  BookOpen,
  User,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";

interface Session {
  id: string;
  scheduledAt: string;
  plannedDuration: number;
  actualDuration: number | null;
  status: "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  student: { firstName: string; lastName: string; phone?: string };
  subject: { name: string };
  enrollment?: { remainingHours: number };
}

const mockScheduleSessions: Session[] = [
  {
    id: "sch-1",
    scheduledAt: new Date(Date.now() + 1000 * 60 * 120).toISOString(),
    plannedDuration: 60,
    actualDuration: null,
    status: "SCHEDULED",
    student: { firstName: "أحمد", lastName: "طارق سليم", phone: "01098765432" },
    subject: { name: "الرياضيات المتقدمة - تفاضل وتكامل" },
    enrollment: { remainingHours: 14 }
  },
  {
    id: "sch-2",
    scheduledAt: new Date(Date.now() + 1000 * 60 * 360).toISOString(),
    plannedDuration: 90,
    actualDuration: null,
    status: "CONFIRMED",
    student: { firstName: "مريم", lastName: "عبد العزيز الهاشمي", phone: "01123456789" },
    subject: { name: "الهندسة التحليلية والفراغية" },
    enrollment: { remainingHours: 8 }
  },
  {
    id: "sch-3",
    scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 26).toISOString(),
    plannedDuration: 60,
    actualDuration: null,
    status: "SCHEDULED",
    student: { firstName: "عمر", lastName: "خالد الشربيني", phone: "01234567890" },
    subject: { name: "الجبر والمصفوفات" },
    enrollment: { remainingHours: 20 }
  },
  {
    id: "sch-4",
    scheduledAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    plannedDuration: 60,
    actualDuration: 60,
    status: "COMPLETED",
    student: { firstName: "نور", lastName: "سامح فهمي", phone: "01011223344" },
    subject: { name: "حساب المثلثات والميكانيكا" },
    enrollment: { remainingHours: 6 }
  },
  {
    id: "sch-5",
    scheduledAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    plannedDuration: 45,
    actualDuration: 45,
    status: "COMPLETED",
    student: { firstName: "ياسين", lastName: "عمرو زهران", phone: "01555667788" },
    subject: { name: "الرياضيات العامة" },
    enrollment: { remainingHours: 18 }
  }
];

const TeacherSchedulePage: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterTab, setFilterTab] = useState<"ALL" | "UPCOMING" | "CONFIRMED" | "PAST">("UPCOMING");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchSessions = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem("teacherToken");
      const res = await fetch("/api/v1/education/teacher-portal/sessions", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setSessions(json.data);
      } else {
        setSessions(mockScheduleSessions);
      }
    } catch {
      setSessions(mockScheduleSessions);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const now = new Date();

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const sDate = new Date(s.scheduledAt);
      const matchesSearch =
        s.student.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.student.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.subject.name.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterTab === "UPCOMING") {
        return sDate >= now && s.status !== "CANCELLED";
      }
      if (filterTab === "CONFIRMED") {
        return s.status === "CONFIRMED";
      }
      if (filterTab === "PAST") {
        return sDate < now || s.status === "COMPLETED";
      }
      return true;
    });
  }, [sessions, filterTab, searchQuery, now]);

  const upcomingCount = sessions.filter((s) => new Date(s.scheduledAt) >= now && s.status !== "CANCELLED").length;
  const completedCount = sessions.filter((s) => s.status === "COMPLETED" || new Date(s.scheduledAt) < now).length;
  const confirmedCount = sessions.filter((s) => s.status === "CONFIRMED").length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[360px] space-y-3">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs font-mono text-muted-foreground uppercase">جاري تحميل جدول الحصص...</p>
      </div>
    );
  }

  const renderStatusBadge = (status: Session["status"]) => {
    switch (status) {
      case "CONFIRMED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <CheckCircle className="w-3 h-3" />
            مؤكدة
          </span>
        );
      case "SCHEDULED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 border border-blue-500/20">
            <Clock className="w-3 h-3" />
            مجدولة
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
            <CheckCircle2 className="w-3 h-3" />
            مكتملة
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
            <XCircle className="w-3 h-3" />
            ملغية
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-10" dir="rtl">
      {/* Telemetry Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
              ACADEMIC TIMETABLE
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              إجمالي {sessions.length} حصة مسجلة
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">جدول الحصص التعليمية</h1>
          <p className="text-xs text-muted-foreground">
            إدارة مواعيد الحصص المباشرة، سجل الحضور، وساعات الطلاب المتبقية
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchSessions}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/80 bg-background hover:bg-muted text-foreground transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>تحديث الجدول</span>
          </button>
        </div>
      </div>

      {/* Filter Ribbon & Search Bar */}
      <div className="p-4 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg border border-border/50 text-xs">
            <button
              onClick={() => setFilterTab("UPCOMING")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                filterTab === "UPCOMING"
                  ? "bg-background text-foreground shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              القادمة ({upcomingCount})
            </button>
            <button
              onClick={() => setFilterTab("CONFIRMED")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                filterTab === "CONFIRMED"
                  ? "bg-background text-foreground shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              المؤكدة ({confirmedCount})
            </button>
            <button
              onClick={() => setFilterTab("PAST")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                filterTab === "PAST"
                  ? "bg-background text-foreground shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              السابقة والمكتملة ({completedCount})
            </button>
            <button
              onClick={() => setFilterTab("ALL")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                filterTab === "ALL"
                  ? "bg-background text-foreground shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              الكل ({sessions.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="بحث باسم الطالب أو المادة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-8 py-1.5 text-xs rounded-lg border border-border/70 bg-background text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* Sessions Single-Surface Container */}
      <div className="rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm overflow-hidden">
        {filteredSessions.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-2">
            <CalendarDays className="w-10 h-10 text-muted-foreground mx-auto stroke-1" />
            <p className="text-sm font-medium text-foreground">لا توجد حصص مطابقة للمعايير المحددة</p>
            <p className="text-xs text-muted-foreground">جرب تغيير التبويب أو تصفية البحث لرؤية الحصص الأخرى</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filteredSessions.map((session) => {
              const sessionDate = new Date(session.scheduledAt);
              const isPast = sessionDate < now;
              return (
                <div
                  key={session.id}
                  className="p-4 sm:p-5 hover:bg-muted/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">
                          {session.student.firstName} {session.student.lastName}
                        </h3>
                        {renderStatusBadge(session.status)}
                      </div>

                      <p className="text-xs text-muted-foreground">
                        {session.subject.name}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                          <Clock className="w-3 h-3 text-primary" />
                          {session.plannedDuration} دقيقة
                        </span>
                        <span>•</span>
                        <span className="font-mono tabular-nums text-foreground/80">
                          {sessionDate.toLocaleDateString("ar-EG", {
                            weekday: "long",
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                          })}
                        </span>
                        <span>•</span>
                        <span className="font-mono tabular-nums text-foreground/80">
                          {sessionDate.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {session.enrollment && (
                          <>
                            <span>•</span>
                            <span className="text-[11px] font-mono text-muted-foreground">
                              المتبقي للطالب: {session.enrollment.remainingHours} ساعة
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-end md:self-center">
                    <span className="text-xs font-mono px-2.5 py-1 rounded bg-muted text-muted-foreground border border-border/50">
                      {isPast ? "حصة منتهية" : "مجدولة"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherSchedulePage;
