import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  Clock,
  CheckCircle2,
  XCircle,
  Wallet,
  ArrowRight,
  ArrowLeft,
  Award,
  Briefcase,
  BookOpen,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

interface SubjectRate {
  id: string;
  hourlyRate: number;
  subject?: { name: string };
}

interface TeacherSession {
  id: string;
  status: "SCHEDULED" | "CONFIRMED" | "CANCELLED";
  scheduledAt: string;
  plannedDuration: number;
  actualDuration?: number;
  student?: { firstName: string; lastName: string; phone?: string };
  subject?: { name: string };
}

interface TeacherPayment {
  id: string;
  periodFrom: string;
  periodTo: string;
  totalSessions: number;
  totalHours: number;
  grossAmount: number;
  deductions: number;
  netAmount: number;
  status: "PAID" | "PENDING";
}

const EMPTY_TEACHER = {
  id: "",
  name: "",
  email: "",
  phone: "",
  isActive: true,
  bio: "",
  qualifications: "",
  subjectRates: [],
};

export default function EducationTeacherProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";

  const [teacher, setTeacher] = useState<any>(EMPTY_TEACHER);
  const [sessions, setSessions] = useState<TeacherSession[]>([]);
  const [payments, setPayments] = useState<TeacherPayment[]>([]);
  const [activeTab, setActiveTab] = useState<"sessions" | "payments">("sessions");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return {
          label: isEn ? "Scheduled" : "مجدولة",
          badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        };
      case "CONFIRMED":
        return {
          label: isEn ? "Confirmed" : "مؤكدة",
          badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        };
      case "CANCELLED":
        return {
          label: isEn ? "Cancelled" : "ملغية",
          badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
        };
      default:
        return {
          label: status,
          badge: "bg-muted text-muted-foreground border-border",
        };
    }
  };

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        const token = tokenManager.getAccessToken() || localStorage.getItem("accessToken");
        const headers: HeadersInit = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };
        try {
          const u = JSON.parse(localStorage.getItem("user") || "{}");
          if (u?.companyId) (headers as any)["X-Company-Id"] = u.companyId;
        } catch {}
        const [tRes, sRes, pRes] = await Promise.all([
          fetch(buildApiUrl(`education/teachers/${id}`), { headers }).catch(() => null),
          fetch(buildApiUrl(`education/sessions?teacherId=${id}`), { headers }).catch(() => null),
          fetch(buildApiUrl(`education/payments?teacherId=${id}`), { headers }).catch(() => null),
        ]);
        if (tRes?.ok) {
          const tJson = await tRes.json();
          if (tJson.success && tJson.data && active) setTeacher(tJson.data);
        }
        if (sRes?.ok) {
          const sJson = await sRes.json();
          if (sJson.success && Array.isArray(sJson.data) && active) setSessions(sJson.data);
          else if (active) setSessions([]);
        } else if (active) {
          setSessions([]);
        }
        if (pRes?.ok) {
          const pJson = await pRes.json();
          if (pJson.success && Array.isArray(pJson.data) && active) setPayments(pJson.data);
          else if (active) setPayments([]);
        } else if (active) {
          setPayments([]);
        }
      } catch {
        if (active) {
          setSessions([]);
          setPayments([]);
        }
      }
    };
    if (id) fetchData();
    return () => { active = false; };
  }, [id]);

  const confirmedCount = sessions.filter((s) => s.status === "CONFIRMED").length;
  const cancelledCount = sessions.filter((s) => s.status === "CANCELLED").length;
  const totalPaid = payments.reduce((acc, p) => acc + (p.status === "PAID" ? p.netAmount : 0), 0);

  return (
    <div className="w-full h-full min-h-0 flex-1 overflow-y-auto bg-background text-foreground flex flex-col font-sans pb-24 sm:pb-12" dir={isEn ? "ltr" : "rtl"}>
      {/* Breadcrumb Header Bar */}
      <div className="border-b border-border/70 bg-card px-4 sm:px-6 py-3">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/admin/education" className="hover:text-foreground">
              {t("education.dashboard.badge", isEn ? "Education & Academy" : "التعليم والأكاديمية")}
            </Link>
            {isEn ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" /> : <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground/60" />}
            <Link to="/admin/education/teacher-schedule" className="hover:text-foreground">
              {t("education.teachers.title", isEn ? "Faculty & Instructors" : "هيئة التدريس")}
            </Link>
            {isEn ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" /> : <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground/60" />}
            <span className="text-foreground font-semibold font-mono">{teacher.name || (isEn ? "Instructor Profile" : "الملف الشخصي")}</span>
          </div>
          <Link
            to="/admin/education/teacher-schedule"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/80 bg-background text-xs font-medium text-foreground hover:bg-muted/50 transition-colors shadow-xs"
          >
            {isEn ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            {t("education.teachers.backToSchedule", isEn ? "Back to Instructors Schedule" : "العودة لجدول المهندسين")}
          </Link>
        </div>
      </div>

      <div className="flex-1 max-w-[1600px] w-full mx-auto p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-5">
        {/* Profile Card */}
        <div className="bg-card border border-border/70 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-foreground">{teacher.name || (isEn ? "Instructor" : "المهندس")}</h1>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${teacher.isActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"}`}>
                  {teacher.isActive
                    ? t("education.teachers.activeAvailable", isEn ? "Active & Available" : "نشط ومتاح")
                    : t("education.teachers.temporarilyDisabled", isEn ? "Temporarily Disabled" : "معطل مؤقتاً")}
                </span>
                <span className="text-xs font-mono text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border border-border/60">ID: {id || teacher.id}</span>
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-0.5">
                {teacher.email && (
                  <span className="inline-flex items-center gap-1.5 font-mono">
                    <Mail className="w-3.5 h-3.5 text-primary" />
                    {teacher.email}
                  </span>
                )}
                {teacher.phone && (
                  <span className="inline-flex items-center gap-1.5 font-mono tabular-nums" dir="ltr">
                    <Phone className="w-3.5 h-3.5 text-primary" />
                    {teacher.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {(teacher.bio || teacher.qualifications) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-border/60 text-xs">
              {teacher.bio && (
                <div className="space-y-1 bg-muted/20 p-3 rounded-lg border border-border/50">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-primary" />
                    {t("education.teachers.bio", isEn ? "Biography" : "السيرة الذاتية")}
                  </span>
                  <p className="text-muted-foreground leading-relaxed">{teacher.bio}</p>
                </div>
              )}
              {teacher.qualifications && (
                <div className="space-y-1 bg-muted/20 p-3 rounded-lg border border-border/50">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-primary" />
                    {t("education.teachers.qualifications", isEn ? "Academic Qualifications" : "المؤهلات العلمية")}
                  </span>
                  <p className="text-muted-foreground leading-relaxed">{teacher.qualifications}</p>
                </div>
              )}
            </div>
          )}

          {teacher.subjectRates?.length > 0 && (
            <div className="pt-3 border-t border-border/60 space-y-2">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-primary" />
                {t("education.teachers.assignedSubjectsRates", isEn ? "Assigned Courses & Approved Hourly Rates" : "المقررات المسندة وتكلفة الساعة المعتمدة")}
              </span>
              <div className="flex flex-wrap gap-2">
                {teacher.subjectRates.map((sr: SubjectRate) => (
                  <span key={sr.id} className="inline-flex items-center gap-1.5 bg-card text-foreground border border-border/80 px-2.5 py-1 rounded-md text-xs shadow-2xs">
                    <span className="font-medium">{sr.subject?.name || (isEn ? "Course" : "مقرر")}</span>
                    <span className="text-muted-foreground/60">|</span>
                    <span className="font-mono tabular-nums text-primary font-bold">{sr.hourlyRate} {t("education.common.egpPerHour", isEn ? "EGP/hr" : "ج.م/س")}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Telemetry KPI Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t("education.teachers.totalSessions", isEn ? "Total Sessions" : "إجمالي الحصص")}</span>
              <GraduationCap className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">{sessions.length}</div>
            <div className="text-[11px] text-muted-foreground">
              {t("education.teachers.recordedInSystem", isEn ? "sessions recorded" : "حصة مسجلة بالنظام")}
            </div>
          </div>
          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t("education.teachers.confirmedSessions", isEn ? "Confirmed Sessions" : "الحصص المؤكدة")}</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{confirmedCount}</div>
            <div className="text-[11px] text-muted-foreground">
              {t("education.teachers.completedSuccessfully", isEn ? "completed successfully" : "تم تنفيذها بنجاح")}
            </div>
          </div>
          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t("education.teachers.cancelledSessions", isEn ? "Cancelled Sessions" : "الحصص الملغية")}</span>
              <XCircle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">{cancelledCount}</div>
            <div className="text-[11px] text-muted-foreground">
              {t("education.teachers.cancelledByParties", isEn ? "cancelled sessions" : "ملغاة من الأطراف")}
            </div>
          </div>
          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t("education.teachers.paidDues", isEn ? "Paid Dues" : "المستحقات المدفوعة")}</span>
              <Wallet className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {totalPaid.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{t("education.common.egp", isEn ? "EGP" : "ج.م")}</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {t("education.teachers.netSalariesDisbursed", isEn ? "net payroll disbursed" : "صافي الرواتب المصروفة")}
            </div>
          </div>
        </div>

        {/* Tab Switcher & Table */}
        <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-xs">
          <div className="border-b border-border/70 px-4 py-2 flex items-center gap-2 bg-muted/20">
            <button
              onClick={() => setActiveTab("sessions")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeTab === "sessions" ? "bg-card text-foreground border border-border/80 shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>{t("education.teachers.tabSessions", isEn ? "Sessions Log" : "سجل الحصص")} ({sessions.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("payments")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeTab === "payments" ? "bg-card text-foreground border border-border/80 shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Wallet className="w-3.5 h-3.5 text-primary" />
              <span>{t("education.teachers.tabPayments", isEn ? "Payments & Dues" : "المدفوعات والمستحقات")} ({payments.length})</span>
            </button>
          </div>

          {activeTab === "sessions" ? (
            <div className="overflow-x-auto">
              <table className={`w-full text-xs ${isEn ? "text-left" : "text-right"}`}>
                <thead>
                  <tr className="border-b border-border/70 bg-muted/40 text-muted-foreground">
                    <th className="py-2.5 px-4 font-semibold">{t("education.students.student", isEn ? "Student" : "الطالب")}</th>
                    <th className="py-2.5 px-4 font-semibold">{t("education.subjects.subject", isEn ? "Subject" : "المادة")}</th>
                    <th className="py-2.5 px-4 font-semibold">{t("education.sessions.dateTime", isEn ? "Schedule & Date" : "الموعد والتاريخ")}</th>
                    <th className="py-2.5 px-4 font-semibold">{t("education.sessions.duration", isEn ? "Duration" : "المدة")}</th>
                    <th className="py-2.5 px-4 font-semibold">{t("education.common.status", isEn ? "Status" : "الحالة")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {sessions.map((s) => {
                    const cfg = getStatusBadge(s.status);
                    const d = new Date(s.scheduledAt);
                    return (
                      <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 font-medium text-foreground">
                          {s.student ? `${s.student.firstName} ${s.student.lastName}` : (isEn ? "Student" : "طالب")}
                          {s.student?.phone && <span className="block text-[11px] font-mono text-muted-foreground tabular-nums">{s.student.phone}</span>}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{s.subject?.name || "—"}</td>
                        <td className="py-3 px-4 font-mono text-muted-foreground tabular-nums">
                          {d.toLocaleDateString(isEn ? "en-US" : "ar-EG")} • {d.toLocaleTimeString(isEn ? "en-US" : "ar-EG", { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-foreground">
                          {s.actualDuration || s.plannedDuration} {t("education.common.min", isEn ? "min" : "دقيقة")}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${cfg.badge}`}>
                            {cfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {!sessions.length && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-muted-foreground">
                        {t("education.teachers.noSessionsInstructor", isEn ? "No sessions registered for this instructor" : "لا توجد حصص مسجلة لهذا المدرس")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className={`w-full text-xs ${isEn ? "text-left" : "text-right"}`}>
                <thead>
                  <tr className="border-b border-border/70 bg-muted/40 text-muted-foreground">
                    <th className="py-2.5 px-4 font-semibold">{t("education.payments.colPeriod", isEn ? "Period" : "فترة المحاسبة")}</th>
                    <th className="py-2.5 px-4 font-semibold">{t("education.payments.colSessions", isEn ? "Sessions" : "الحصص")}</th>
                    <th className="py-2.5 px-4 font-semibold">{t("education.payments.colHours", isEn ? "Hours" : "الساعات")}</th>
                    <th className="py-2.5 px-4 font-semibold">{t("education.payments.colGross", isEn ? "Gross" : "الإجمالي")}</th>
                    <th className="py-2.5 px-4 font-semibold">{t("education.payments.colDeductions", isEn ? "Deductions" : "الخصومات")}</th>
                    <th className="py-2.5 px-4 font-semibold">{t("education.payments.colNet", isEn ? "Net" : "الصافي")}</th>
                    <th className="py-2.5 px-4 font-semibold">{t("education.common.status", isEn ? "Status" : "الحالة")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-mono text-muted-foreground tabular-nums">
                        {new Date(p.periodFrom).toLocaleDateString(isEn ? "en-US" : "ar-EG")} — {new Date(p.periodTo).toLocaleDateString(isEn ? "en-US" : "ar-EG")}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-foreground">{p.totalSessions}</td>
                      <td className="py-3 px-4 font-mono tabular-nums text-foreground">{p.totalHours} {t("education.common.hour", isEn ? "hrs" : "س")}</td>
                      <td className="py-3 px-4 font-mono tabular-nums text-foreground">{p.grossAmount.toLocaleString()} {t("education.common.egp", isEn ? "EGP" : "ج.م")}</td>
                      <td className="py-3 px-4 font-mono tabular-nums text-rose-600 dark:text-rose-400">
                        {p.deductions > 0 ? `-${p.deductions.toLocaleString()} ${t("education.common.egp", isEn ? "EGP" : "ج.م")}` : "—"}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums font-bold text-foreground">{p.netAmount.toLocaleString()} {t("education.common.egp", isEn ? "EGP" : "ج.م")}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${p.status === "PAID" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"}`}>
                          {p.status === "PAID"
                            ? t("education.payments.paid", isEn ? "Paid" : "تم الصرف")
                            : t("education.payments.pending", isEn ? "Pending" : "معلق")}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!payments.length && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-muted-foreground">
                        {t("education.teachers.noPayrollInstructor", isEn ? "No payroll records for this instructor" : "لا توجد مسيرات رواتب مسجلة لهذا المدرس")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
