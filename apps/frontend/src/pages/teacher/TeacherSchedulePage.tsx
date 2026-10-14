import React, { useEffect, useState, useMemo } from "react";
import {
  CalendarDays,
  Clock,
  Search,
  RefreshCw,
  CheckCircle2,
  CalendarCheck,
  BookOpen,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

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
    enrollment: { remainingHours: 14 },
  },
  {
    id: "sch-2",
    scheduledAt: new Date(Date.now() + 1000 * 60 * 360).toISOString(),
    plannedDuration: 90,
    actualDuration: null,
    status: "CONFIRMED",
    student: { firstName: "مريم", lastName: "عبد العزيز الهاشمي", phone: "01123456789" },
    subject: { name: "الهندسة التحليلية والفراغية" },
    enrollment: { remainingHours: 8 },
  },
  {
    id: "sch-3",
    scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 26).toISOString(),
    plannedDuration: 60,
    actualDuration: null,
    status: "SCHEDULED",
    student: { firstName: "عمر", lastName: "خالد الشربيني", phone: "01234567890" },
    subject: { name: "الجبر والمصفوفات" },
    enrollment: { remainingHours: 20 },
  },
  {
    id: "sch-4",
    scheduledAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    plannedDuration: 60,
    actualDuration: 60,
    status: "COMPLETED",
    student: { firstName: "نور", lastName: "سامح فهمي", phone: "01011223344" },
    subject: { name: "حساب المثلثات والميكانيكا" },
    enrollment: { remainingHours: 6 },
  },
];

export default function TeacherSchedulePage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterTab, setFilterTab] = useState<"ALL" | "UPCOMING" | "CONFIRMED" | "PAST">("UPCOMING");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchSessions = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem("teacherToken") || localStorage.getItem("token");
      const res = await fetch("/api/v1/education/teacher-portal/sessions", {
        headers: { Authorization: `Bearer ${token}` },
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
    void fetchSessions();
  }, []);

  const now = useMemo(() => new Date(), []);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const sDate = new Date(s.scheduledAt);
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        s.student.firstName.toLowerCase().includes(q) ||
        s.student.lastName.toLowerCase().includes(q) ||
        s.subject.name.toLowerCase().includes(q);

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

  const upcomingCount = useMemo(
    () => sessions.filter((s) => new Date(s.scheduledAt) >= now && s.status !== "CANCELLED").length,
    [sessions, now]
  );
  const completedCount = useMemo(
    () => sessions.filter((s) => s.status === "COMPLETED" || new Date(s.scheduledAt) < now).length,
    [sessions, now]
  );
  const confirmedCount = useMemo(
    () => sessions.filter((s) => s.status === "CONFIRMED").length,
    [sessions]
  );

  if (loading && sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-2.5 text-muted-foreground">
        <RefreshCw className="size-5 animate-spin text-primary" />
        <span className="text-xs font-mono">جاري تحميل جدول الحصص والمواعيد...</span>
      </div>
    );
  }

  const renderStatusBadge = (status: Session["status"]) => {
    switch (status) {
      case "CONFIRMED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
            <CheckCircle className="size-3" />
            مؤكدة
          </span>
        );
      case "SCHEDULED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border bg-blue-500/10 text-blue-500 border-blue-500/20">
            <Clock className="size-3" />
            مجدولة
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border bg-primary/10 text-primary border-primary/20">
            <CheckCircle2 className="size-3" />
            مكتملة
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border bg-destructive/10 text-destructive border-destructive/20">
            <XCircle className="size-3" />
            ملغية
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-4" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/70 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <CalendarCheck className="size-4" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              جدول الحصص والمواعيد
            </h1>
            <Badge variant="outline" className="text-[11px] font-mono border-border/80 bg-muted/30">
              {sessions.length} حصة مسجلة
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            إدارة مواعيد الحصص المباشرة، سجل الحضور، وساعات الطلاب المتبقية
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-xs">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchSessions()}
            disabled={refreshing}
            className="h-8 px-2.5 text-xs font-mono gap-1 border-border/70 active:scale-[0.98]"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </Button>
        </div>
      </div>

      {/* Filter Ribbon & Search Bar */}
      <div className="p-2.5 sm:p-3 rounded-lg border border-border/70 bg-card shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Tabs */}
        <div className="flex items-center gap-1 font-mono text-xs">
          {[
            { id: "UPCOMING", label: `القادمة (${upcomingCount})` },
            { id: "CONFIRMED", label: `المؤكدة (${confirmedCount})` },
            { id: "PAST", label: `المكتملة (${completedCount})` },
            { id: "ALL", label: `الكل (${sessions.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                filterTab === tab.id
                  ? "bg-card text-foreground font-semibold shadow-xs border border-border/70"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative w-full sm:w-64">
          <Search className="size-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="بحث بالطالب أو المادة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pr-8 text-xs font-mono bg-background border-border/70"
          />
        </div>
      </div>

      {/* Sessions Single-Surface Container */}
      <div className="rounded-lg border border-border/70 bg-card shadow-xs overflow-hidden">
        {filteredSessions.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-2">
            <CalendarDays className="size-9 text-muted-foreground/40 mx-auto" />
            <p className="text-xs font-semibold text-foreground font-mono">
              لا توجد حصص مطابقة للمعايير المحددة
            </p>
            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
              جرب تغيير التبويب أو تصفية البحث لرؤية الحصص الأخرى
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filteredSessions.map((session) => {
              const sessionDate = new Date(session.scheduledAt);
              const isPast = sessionDate < now;
              return (
                <div
                  key={session.id}
                  className="p-3.5 sm:p-4 hover:bg-muted/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="size-8 rounded-md bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                      <BookOpen className="size-4" />
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-semibold text-foreground">
                          {session.student.firstName} {session.student.lastName}
                        </h3>
                        {renderStatusBadge(session.status)}
                      </div>

                      <p className="text-[11px] text-muted-foreground font-mono">
                        {session.subject.name}
                      </p>

                      <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-muted-foreground pt-0.5 font-mono">
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Clock className="size-3 text-primary" />
                          {session.plannedDuration} دقيقة
                        </span>
                        <span>•</span>
                        <span className="tabular-nums">
                          {sessionDate.toLocaleDateString("ar-EG", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span>•</span>
                        <span className="tabular-nums">
                          {sessionDate.toLocaleTimeString("ar-EG", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {session.enrollment && (
                          <>
                            <span>•</span>
                            <span className="text-[10px] text-muted-foreground/70">
                              المتبقي للطالب: {session.enrollment.remainingHours} ساعة
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center font-mono">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/50">
                      {isPast ? "منتهية" : "مجدولة"}
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
}
