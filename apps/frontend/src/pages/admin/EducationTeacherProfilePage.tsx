import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
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
  Award,
  Briefcase,
  BookOpen,
  ChevronRight,
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

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  SCHEDULED: { label: "مجدولة", badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  CONFIRMED: { label: "مؤكدة", badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  CANCELLED: { label: "ملغية", badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
};

const DEFAULT_TEACHER = {
  id: "t-1",
  name: "أ. طارق عبد الرحمن الفقي",
  email: "tarek.feki@academy.edu.eg",
  phone: "01098765432",
  isActive: true,
  bio: "خبرة أكثر من 14 عاماً في تدريس الرياضيات التطبيقية والتفاضل والتكامل للمرحلة الثانوية العامة واللغات.",
  qualifications: "بكالوريوس علوم ورياضيات جامعة القاهرة، دبلوم تربوي متقدم وتدريب أولمبياد الرياضيات.",
  subjectRates: [
    { id: "sr-1", hourlyRate: 350, subject: { name: "تفاضل وتكامل 3ث" } },
    { id: "sr-2", hourlyRate: 300, subject: { name: "جبر وهندسة فراغية" } },
    { id: "sr-3", hourlyRate: 400, subject: { name: "إحصاء وبحوث عمليات" } },
  ],
};

const DEFAULT_SESSIONS: TeacherSession[] = [
  { id: "s-1", status: "CONFIRMED", scheduledAt: "2026-10-14T10:00:00", plannedDuration: 60, actualDuration: 65, student: { firstName: "عمر", lastName: "هشام الغزالي", phone: "01122334455" }, subject: { name: "تفاضل وتكامل 3ث" } },
  { id: "s-2", status: "SCHEDULED", scheduledAt: "2026-10-15T12:30:00", plannedDuration: 90, student: { firstName: "سارة", lastName: "محمود الشربيني", phone: "01233445566" }, subject: { name: "جبر وهندسة فراغية" } },
  { id: "s-3", status: "CONFIRMED", scheduledAt: "2026-10-13T16:00:00", plannedDuration: 60, actualDuration: 60, student: { firstName: "كريم", lastName: "أحمد المنسي", phone: "01044556677" }, subject: { name: "تفاضل وتكامل 3ث" } },
  { id: "s-4", status: "CANCELLED", scheduledAt: "2026-10-12T14:00:00", plannedDuration: 60, student: { firstName: "نور", lastName: "خالد البدري", phone: "01555667788" }, subject: { name: "إحصاء وبحوث عمليات" } },
];

const DEFAULT_PAYMENTS: TeacherPayment[] = [
  { id: "p-1", periodFrom: "2026-10-01", periodTo: "2026-10-15", totalSessions: 18, totalHours: 24, grossAmount: 8400, deductions: 200, netAmount: 8200, status: "PAID" },
  { id: "p-2", periodFrom: "2026-09-16", periodTo: "2026-09-30", totalSessions: 22, totalHours: 30, grossAmount: 10500, deductions: 0, netAmount: 10500, status: "PAID" },
  { id: "p-3", periodFrom: "2026-09-01", periodTo: "2026-09-15", totalSessions: 16, totalHours: 21, grossAmount: 7350, deductions: 150, netAmount: 7200, status: "PENDING" },
];

export default function EducationTeacherProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [teacher, setTeacher] = useState<any>(DEFAULT_TEACHER);
  const [sessions, setSessions] = useState<TeacherSession[]>(DEFAULT_SESSIONS);
  const [payments, setPayments] = useState<TeacherPayment[]>(DEFAULT_PAYMENTS);
  const [activeTab, setActiveTab] = useState<"sessions" | "payments">("sessions");

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        const [tRes, sRes, pRes] = await Promise.all([
          fetch(`/api/v1/education/teachers/${id}`, { headers }).catch(() => null),
          fetch(`/api/v1/education/sessions?teacherId=${id}`, { headers }).catch(() => null),
          fetch(`/api/v1/education/payments?teacherId=${id}`, { headers }).catch(() => null),
        ]);
        if (tRes?.ok) {
          const tJson = await tRes.json();
          if (tJson.success && tJson.data && active) setTeacher(tJson.data);
        }
        if (sRes?.ok) {
          const sJson = await sRes.json();
          if (sJson.success && Array.isArray(sJson.data) && sJson.data.length && active) setSessions(sJson.data);
        }
        if (pRes?.ok) {
          const pJson = await pRes.json();
          if (pJson.success && Array.isArray(pJson.data) && pJson.data.length && active) setPayments(pJson.data);
        }
      } catch {
        // Fallbacks active
      }
    };
    if (id) fetchData();
    return () => { active = false; };
  }, [id]);

  const confirmedCount = sessions.filter((s) => s.status === "CONFIRMED").length;
  const cancelledCount = sessions.filter((s) => s.status === "CANCELLED").length;
  const totalPaid = payments.reduce((acc, p) => acc + (p.status === "PAID" ? p.netAmount : 0), 0);

  return (
    <div className="w-full min-h-screen bg-background text-foreground flex flex-col font-sans" dir="rtl">
      {/* Breadcrumb Header Bar */}
      <div className="border-b border-border/70 bg-card px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/admin/education" className="hover:text-foreground">التعليم والأكاديمية</Link>
            <ChevronRight className="w-3.5 h-3.5 rotate-180 text-muted-foreground/60" />
            <Link to="/admin/education/teacher-schedule" className="hover:text-foreground">هيئة التدريس</Link>
            <ChevronRight className="w-3.5 h-3.5 rotate-180 text-muted-foreground/60" />
            <span className="text-foreground font-semibold font-mono">{teacher.name}</span>
          </div>
          <Link
            to="/admin/education/teacher-schedule"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/80 bg-background text-xs font-medium text-foreground hover:bg-muted/50 transition-colors shadow-xs"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            العودة لجدول المدرسين
          </Link>
        </div>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Profile Card */}
        <div className="bg-card border border-border/70 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-foreground">{teacher.name}</h1>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${teacher.isActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"}`}>
                  {teacher.isActive ? "نشط ومتاح" : "معطل مؤقتاً"}
                </span>
                <span className="text-xs font-mono text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border border-border/60">ID: {id || teacher.id}</span>
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-0.5">
                {teacher.email && <span className="inline-flex items-center gap-1.5 font-mono"><Mail className="w-3.5 h-3.5 text-primary" />{teacher.email}</span>}
                {teacher.phone && <span className="inline-flex items-center gap-1.5 font-mono tabular-nums"><Phone className="w-3.5 h-3.5 text-primary" />{teacher.phone}</span>}
              </div>
            </div>
          </div>

          {(teacher.bio || teacher.qualifications) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-border/60 text-xs">
              {teacher.bio && <div className="space-y-1 bg-muted/20 p-3 rounded-lg border border-border/50"><span className="font-semibold text-foreground flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-primary" />السيرة الذاتية</span><p className="text-muted-foreground leading-relaxed">{teacher.bio}</p></div>}
              {teacher.qualifications && <div className="space-y-1 bg-muted/20 p-3 rounded-lg border border-border/50"><span className="font-semibold text-foreground flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-primary" />المؤهلات العلمية</span><p className="text-muted-foreground leading-relaxed">{teacher.qualifications}</p></div>}
            </div>
          )}

          {teacher.subjectRates?.length > 0 && (
            <div className="pt-3 border-t border-border/60 space-y-2">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-primary" />المقررات المسندة وتكلفة الساعة المعتمدة</span>
              <div className="flex flex-wrap gap-2">
                {teacher.subjectRates.map((sr: SubjectRate) => (
                  <span key={sr.id} className="inline-flex items-center gap-1.5 bg-card text-foreground border border-border/80 px-2.5 py-1 rounded-md text-xs shadow-2xs">
                    <span className="font-medium">{sr.subject?.name || "مقرر"}</span>
                    <span className="text-muted-foreground/60">|</span>
                    <span className="font-mono tabular-nums text-primary font-bold">{sr.hourlyRate} ج.م/س</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Telemetry KPI Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground"><span>إجمالي الحصص</span><GraduationCap className="w-4 h-4 text-primary" /></div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">{sessions.length}</div>
            <div className="text-[11px] text-muted-foreground">حصة مسجلة بالنظام</div>
          </div>
          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground"><span>الحصص المؤكدة</span><CheckCircle2 className="w-4 h-4 text-emerald-500" /></div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{confirmedCount}</div>
            <div className="text-[11px] text-muted-foreground">تم تنفيذها بنجاح</div>
          </div>
          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground"><span>الحصص الملغية</span><XCircle className="w-4 h-4 text-rose-500" /></div>
            <div className="text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">{cancelledCount}</div>
            <div className="text-[11px] text-muted-foreground">ملغاة من الأطراف</div>
          </div>
          <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground"><span>المستحقات المدفوعة</span><Wallet className="w-4 h-4 text-blue-500" /></div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">{totalPaid.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">ج.م</span></div>
            <div className="text-[11px] text-muted-foreground">صافي الرواتب المصروفة</div>
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
              <span>سجل الحصص ({sessions.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("payments")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeTab === "payments" ? "bg-card text-foreground border border-border/80 shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Wallet className="w-3.5 h-3.5 text-primary" />
              <span>المدفوعات والمستحقات ({payments.length})</span>
            </button>
          </div>

          {activeTab === "sessions" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-border/70 bg-muted/40 text-muted-foreground">
                    <th className="py-2.5 px-4 font-semibold">الطالب</th>
                    <th className="py-2.5 px-4 font-semibold">المادة</th>
                    <th className="py-2.5 px-4 font-semibold">الموعد والتاريخ</th>
                    <th className="py-2.5 px-4 font-semibold">المدة</th>
                    <th className="py-2.5 px-4 font-semibold">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {sessions.map((s) => {
                    const cfg = STATUS_CONFIG[s.status] || { label: s.status, badge: "bg-muted text-muted-foreground border-border" };
                    const d = new Date(s.scheduledAt);
                    return (
                      <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 font-medium text-foreground">
                          {s.student ? `${s.student.firstName} ${s.student.lastName}` : "طالب"}
                          {s.student?.phone && <span className="block text-[11px] font-mono text-muted-foreground tabular-nums">{s.student.phone}</span>}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{s.subject?.name || "—"}</td>
                        <td className="py-3 px-4 font-mono text-muted-foreground tabular-nums">{d.toLocaleDateString("ar-EG")} • {d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</td>
                        <td className="py-3 px-4 font-mono tabular-nums text-foreground">{s.actualDuration || s.plannedDuration} دقيقة</td>
                        <td className="py-3 px-4"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${cfg.badge}`}>{cfg.label}</span></td>
                      </tr>
                    );
                  })}
                  {!sessions.length && <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">لا توجد حصص مسجلة لهذا المدرس</td></tr>}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-border/70 bg-muted/40 text-muted-foreground">
                    <th className="py-2.5 px-4 font-semibold">فترة المحاسبة</th>
                    <th className="py-2.5 px-4 font-semibold">الحصص</th>
                    <th className="py-2.5 px-4 font-semibold">الساعات</th>
                    <th className="py-2.5 px-4 font-semibold">الإجمالي</th>
                    <th className="py-2.5 px-4 font-semibold">الخصومات</th>
                    <th className="py-2.5 px-4 font-semibold">الصافي</th>
                    <th className="py-2.5 px-4 font-semibold">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-mono text-muted-foreground tabular-nums">{new Date(p.periodFrom).toLocaleDateString("ar-EG")} — {new Date(p.periodTo).toLocaleDateString("ar-EG")}</td>
                      <td className="py-3 px-4 font-mono tabular-nums text-foreground">{p.totalSessions}</td>
                      <td className="py-3 px-4 font-mono tabular-nums text-foreground">{p.totalHours} س</td>
                      <td className="py-3 px-4 font-mono tabular-nums text-foreground">{p.grossAmount.toLocaleString()} ج.م</td>
                      <td className="py-3 px-4 font-mono tabular-nums text-rose-600 dark:text-rose-400">{p.deductions > 0 ? `-${p.deductions.toLocaleString()} ج.م` : "—"}</td>
                      <td className="py-3 px-4 font-mono tabular-nums font-bold text-foreground">{p.netAmount.toLocaleString()} ج.م</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${p.status === "PAID" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"}`}>
                          {p.status === "PAID" ? "تم الصرف" : "معلق"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!payments.length && <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">لا توجد مسيرات رواتب مسجلة لهذا المدرس</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
