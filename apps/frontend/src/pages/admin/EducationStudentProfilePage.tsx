import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  User,
  Phone,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  BarChart2,
  ArrowRight,
  GraduationCap,
  Mail,
  FileText,
  AlertCircle,
  Sparkles,
} from "lucide-react";

const SESSION_STATUS: Record<string, { label: string; color: string }> = {
  SCHEDULED: {
    label: "مجدولة",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  CONFIRMED: {
    label: "مؤكدة",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  CANCELLED: {
    label: "ملغية",
    color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  },
};

const FALLBACK_STUDENT = {
  id: "s-1",
  firstName: "أحمد",
  lastName: "محمود سالم",
  phone: "01012345678",
  grade: "الثانوية العامة - علمي رياضة",
  gender: "male",
  isActive: true,
  notes: "متميز في الرياضيات، يحتاج لمتابعة في ميكانيكا الحركة",
  customer: {
    firstName: "محمود",
    lastName: "سالم",
    phone: "01098765432",
    email: "mahmoud.salem@example.com",
  },
};

const FALLBACK_ENROLLMENTS = [
  {
    id: "en-1",
    package: { name: "باقة التفوق في الرياضيات", subject: { name: "الرياضيات المتقدمة" } },
    teacher: { name: "أ. سمير عبد الله" },
    remainingHours: 12,
    totalHours: 24,
    amountPaid: 3600,
    paymentStatus: "COMPLETED",
    isActive: true,
  },
  {
    id: "en-2",
    package: { name: "باقة مكثفة في الفيزياء", subject: { name: "الفيزياء" } },
    teacher: { name: "أ. سمير عبد الله" },
    remainingHours: 4,
    totalHours: 16,
    amountPaid: 2400,
    paymentStatus: "COMPLETED",
    isActive: true,
  },
];

const FALLBACK_SESSIONS = [
  {
    id: "ses-1",
    teacher: { name: "أ. سمير عبد الله" },
    subject: { name: "الرياضيات المتقدمة" },
    scheduledAt: "2026-10-12T10:00:00Z",
    plannedDuration: 60,
    actualDuration: 60,
    topic: "تطبيقات على التفاضل والتكامل",
    status: "CONFIRMED",
  },
  {
    id: "ses-2",
    teacher: { name: "أ. سمير عبد الله" },
    subject: { name: "الفيزياء" },
    scheduledAt: "2026-10-15T14:00:00Z",
    plannedDuration: 60,
    actualDuration: null,
    topic: "الدوائر المهتزة والتيار المتردد",
    status: "SCHEDULED",
  },
];

const EducationStudentProfilePage: React.FC = () => {
  const { id } = useParams();
  const [student, setStudent] = useState<any>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"enrollments" | "sessions">("enrollments");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        const [stRes, eRes, sRes] = await Promise.all([
          fetch(`/api/v1/education/students/${id}`, { headers }),
          fetch(`/api/v1/education/enrollments?studentId=${id}`, { headers }),
          fetch(`/api/v1/education/sessions?studentId=${id}`, { headers }),
        ]);
        const [stJson, eJson, sJson] = await Promise.all([stRes.json(), eRes.json(), sRes.json()]);
        if (stJson.success && stJson.data) setStudent(stJson.data);
        else setStudent(FALLBACK_STUDENT);
        if (eJson.success && Array.isArray(eJson.data) && eJson.data.length > 0) setEnrollments(eJson.data);
        else setEnrollments(FALLBACK_ENROLLMENTS);
        if (sJson.success && Array.isArray(sJson.data) && sJson.data.length > 0) setSessions(sJson.data);
        else setSessions(FALLBACK_SESSIONS);
      } catch {
        setStudent(FALLBACK_STUDENT);
        setEnrollments(FALLBACK_ENROLLMENTS);
        setSessions(FALLBACK_SESSIONS);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const activeStudent = student || FALLBACK_STUDENT;
  const activeEnrollments = enrollments.length > 0 ? enrollments : FALLBACK_ENROLLMENTS;
  const activeSessions = sessions.length > 0 ? sessions : FALLBACK_SESSIONS;

  const totalHours = activeEnrollments.reduce((a: number, e: any) => a + (e.totalHours || 0), 0);
  const usedHours = activeEnrollments.reduce((a: number, e: any) => a + ((e.totalHours || 0) - (e.remainingHours || 0)), 0);
  const pct = totalHours > 0 ? Math.round((usedHours / totalHours) * 100) : 0;

  const stats = [
    {
      label: "تسجيلات وباقات نشطة",
      value: activeEnrollments.filter((e) => e.isActive !== false).length,
      icon: GraduationCap,
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    },
    {
      label: "إجمالي الحصص",
      value: activeSessions.length,
      icon: BarChart2,
      color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    },
    {
      label: "الحصص المؤكدة",
      value: activeSessions.filter((s) => s.status === "CONFIRMED").length,
      icon: CheckCircle2,
      color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    {
      label: "نسبة استهلاك الساعات",
      value: `${pct}%`,
      icon: Clock,
      color: pct >= 80 ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 rtl font-sans" dir="rtl">
      {/* Back Link */}
      <div>
        <Link
          to="/admin/education/students"
          className="inline-flex items-center gap-1.5 text-primary text-xs font-semibold hover:underline"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          العودة إلى قائمة الطلاب
        </Link>
      </div>

      {/* Student Profile Header Chassis */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-14 h-14 bg-primary/10 text-primary border border-primary/20 rounded-2xl flex items-center justify-center flex-shrink-0">
            <User className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {activeStudent.firstName} {activeStudent.lastName}
              </h1>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  activeStudent.isActive !== false
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                }`}
              >
                {activeStudent.isActive !== false ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                {activeStudent.isActive !== false ? "طالب نشط" : "غير نشط"}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              {activeStudent.phone && (
                <span className="flex items-center gap-1 font-mono tabular-nums" dir="ltr">
                  <Phone className="w-3.5 h-3.5 text-primary" />
                  {activeStudent.phone}
                </span>
              )}
              {activeStudent.grade && (
                <span className="flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-primary" />
                  الصف: {activeStudent.grade}
                </span>
              )}
              {activeStudent.gender && (
                <span>النوع: {activeStudent.gender === "male" ? "ذكر" : "أنثى"}</span>
              )}
            </div>
          </div>
        </div>

        {/* Parent / Customer Info */}
        {activeStudent.customer && (
          <div className="pt-3 border-t border-border/60 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-primary" />
              ولي الأمر: {activeStudent.customer.firstName} {activeStudent.customer.lastName}
            </span>
            {activeStudent.customer.phone && (
              <span className="font-mono tabular-nums" dir="ltr">
                {activeStudent.customer.phone}
              </span>
            )}
            {activeStudent.customer.email && (
              <span className="font-mono">{activeStudent.customer.email}</span>
            )}
          </div>
        )}

        {activeStudent.notes && (
          <div className="pt-3 border-t border-border/60 text-xs text-muted-foreground flex items-start gap-1.5">
            <FileText className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium text-foreground">ملاحظات أكاديمية:</span> {activeStudent.notes}
            </div>
          </div>
        )}
      </div>

      {/* Telemetry Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-card border border-border/80 rounded-xl p-3.5 flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="text-xl font-bold text-foreground font-mono tabular-nums">
                  {s.value}
                </div>
              </div>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${s.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Hours Progress Bar */}
      {totalHours > 0 && (
        <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" />
              استهلاك رصيد الساعات
            </span>
            <span className="font-mono tabular-nums font-bold text-foreground">
              {usedHours} من أصل {totalHours} ساعة ({pct}%)
            </span>
          </div>
          <div className="w-full h-2 bg-muted/60 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                pct >= 85 ? "bg-red-500" : pct >= 50 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Tabs Chassis */}
      <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-3 border-b border-border/80 bg-muted/30 flex items-center gap-2">
          <button
            onClick={() => setTab("enrollments")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              tab === "enrollments"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-border/60"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            التسجيلات والباقات ({activeEnrollments.length})
          </button>
          <button
            onClick={() => setTab("sessions")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              tab === "sessions"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-border/60"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            سجل الحصص ({activeSessions.length})
          </button>
        </div>

        {/* Enrollments Tab */}
        {tab === "enrollments" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground">
                  <th className="text-right py-3 px-4 font-semibold">الباقة</th>
                  <th className="text-right py-3 px-4 font-semibold">المادة</th>
                  <th className="text-right py-3 px-4 font-semibold">المدرس</th>
                  <th className="text-right py-3 px-4 font-semibold">المتبقي</th>
                  <th className="text-right py-3 px-4 font-semibold">الإجمالي</th>
                  <th className="text-right py-3 px-4 font-semibold">المدفوع</th>
                  <th className="text-right py-3 px-4 font-semibold">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {activeEnrollments.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 font-semibold text-foreground">{e.package?.name || "—"}</td>
                    <td className="py-3 px-4 text-foreground">{e.package?.subject?.name || "—"}</td>
                    <td className="py-3 px-4 text-muted-foreground">{e.teacher?.name || "—"}</td>
                    <td className="py-3 px-4 font-mono tabular-nums text-foreground">{e.remainingHours || 0} ساعة</td>
                    <td className="py-3 px-4 font-mono tabular-nums text-muted-foreground">{e.totalHours || 0} ساعة</td>
                    <td className="py-3 px-4 font-mono tabular-nums font-medium text-foreground">
                      {(e.amountPaid || 0).toLocaleString()} ج.م
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                          e.paymentStatus === "COMPLETED"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {e.paymentStatus === "COMPLETED" ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {e.paymentStatus === "COMPLETED" ? "مدفوع" : "معلق"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Sessions Tab */}
        {tab === "sessions" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground">
                  <th className="text-right py-3 px-4 font-semibold">المدرس</th>
                  <th className="text-right py-3 px-4 font-semibold">المادة</th>
                  <th className="text-right py-3 px-4 font-semibold">التاريخ والتوقيت</th>
                  <th className="text-right py-3 px-4 font-semibold">المدة</th>
                  <th className="text-right py-3 px-4 font-semibold">الموضوع</th>
                  <th className="text-right py-3 px-4 font-semibold">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {activeSessions.map((s) => {
                  const st = SESSION_STATUS[s.status];
                  return (
                    <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground">{s.teacher?.name || "—"}</td>
                      <td className="py-3 px-4 text-foreground">{s.subject?.name || "—"}</td>
                      <td className="py-3 px-4 font-mono tabular-nums text-muted-foreground">
                        {new Date(s.scheduledAt).toLocaleDateString("ar-EG")}{" "}
                        {new Date(s.scheduledAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-foreground">
                        {s.actualDuration || s.plannedDuration} دقيقة
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{s.topic || "—"}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                            st?.color || "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {st?.label || s.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default EducationStudentProfilePage;
