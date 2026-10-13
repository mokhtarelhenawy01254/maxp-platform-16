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
  Sparkles,
  Calendar,
  Layers,
} from "lucide-react";

const SESSION_STATUS: Record<string, { label: string; color: string }> = {
  SCHEDULED: { label: "مجدولة", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  CONFIRMED: { label: "مؤكدة", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  CANCELLED: { label: "ملغية", color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
};

const EducationTeacherProfilePage: React.FC = () => {
  const { id } = useParams();
  const [teacher, setTeacher] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"sessions" | "payments">("sessions");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        const [tRes, sRes, pRes] = await Promise.all([
          fetch(`/api/v1/education/teachers/${id}`, { headers }),
          fetch(`/api/v1/education/sessions?teacherId=${id}`, { headers }),
          fetch(`/api/v1/education/payments?teacherId=${id}`, { headers }),
        ]);
        const [tJson, sJson, pJson] = await Promise.all([tRes.json(), sRes.json(), pRes.json()]);
        if (tJson.success) setTeacher(tJson.data);
        if (sJson.success) setSessions(sJson.data || []);
        if (pJson.success) setPayments(pJson.data || []);
      } catch {
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-3 text-muted-foreground">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono">جاري تحميل الملف التعريفي للمدرس...</span>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-3 rtl font-sans" dir="rtl">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center border border-red-500/20">
          <XCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-foreground">بيانات المدرس غير متوفرة</h2>
        <p className="text-xs text-muted-foreground">لم يتم العثور على سجل هذا المدرس أو تم حذفه من النظام</p>
        <Link
          to="/admin/education/teachers"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          العودة لقائمة المدرسين
        </Link>
      </div>
    );
  }

  const stats = [
    {
      label: "إجمالي الحصص",
      value: sessions.length,
      icon: GraduationCap,
      color: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
    },
    {
      label: "الحصص المؤكدة",
      value: sessions.filter((s) => s.status === "CONFIRMED").length,
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "الحصص الملغية",
      value: sessions.filter((s) => s.status === "CANCELLED").length,
      icon: XCircle,
      color: "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20",
    },
    {
      label: "إجمالي المدفوعات",
      value: `${payments.reduce((a, p) => a + (p.status === "PAID" ? p.netAmount : 0), 0)} ج.م`,
      icon: Wallet,
      color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
  ];

  const tabs = [
    { id: "sessions" as const, label: `الحصص (${sessions.length})`, icon: Clock },
    { id: "payments" as const, label: `المرتبات والمستحقات (${payments.length})`, icon: Wallet },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 rtl font-sans" dir="rtl">
      {/* Back button */}
      <div>
        <Link
          to="/admin/education/teachers"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          العودة إلى إدارة المدرسين
        </Link>
      </div>

      {/* Profile Header Card */}
      <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            {teacher.avatarUrl ? (
              <img src={teacher.avatarUrl} alt="" className="w-16 h-16 rounded-xl object-cover" />
            ) : (
              <User className="w-8 h-8 text-primary" />
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">{teacher.name}</h1>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                  teacher.isActive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                }`}
              >
                {teacher.isActive ? "نشط" : "معطل"}
              </span>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {teacher.email && (
                <span className="inline-flex items-center gap-1 font-mono">
                  <Mail className="w-3 h-3 text-primary" />
                  {teacher.email}
                </span>
              )}
              {teacher.phone && (
                <span className="inline-flex items-center gap-1 font-mono">
                  <Phone className="w-3 h-3 text-primary" />
                  {teacher.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bio and Qualifications */}
        {(teacher.bio || teacher.qualifications) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-border/60 text-xs">
            {teacher.bio && (
              <div className="space-y-1">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-primary" />
                  السيرة الذاتية
                </span>
                <p className="text-muted-foreground leading-relaxed">{teacher.bio}</p>
              </div>
            )}
            {teacher.qualifications && (
              <div className="space-y-1">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-primary" />
                  المؤهلات العلمية
                </span>
                <p className="text-muted-foreground leading-relaxed">{teacher.qualifications}</p>
              </div>
            )}
          </div>
        )}

        {/* Rates badges */}
        {teacher.subjectRates?.length > 0 && (
          <div className="pt-3 border-t border-border/60 space-y-2">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              المواد المسندة وأسعار الساعة
            </span>
            <div className="flex flex-wrap gap-1.5">
              {teacher.subjectRates.map((sr: any) => (
                <span
                  key={sr.id}
                  className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-md text-xs font-mono tabular-nums"
                >
                  {sr.subject?.name}: {sr.hourlyRate} ج.م/س
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Telemetry Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-card border border-border/80 rounded-xl p-4 flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <p className="text-2xl font-bold font-mono tabular-nums text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
              <div className={`p-2.5 rounded-lg border ${s.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-border/60 pb-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Sessions Tab */}
      {tab === "sessions" && (
        <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground text-xs">
                <th className="text-right py-3 px-4 font-semibold">الطالب</th>
                <th className="text-right py-3 px-4 font-semibold">المادة</th>
                <th className="text-right py-3 px-4 font-semibold">التاريخ والوقت</th>
                <th className="text-right py-3 px-4 font-semibold">المدة</th>
                <th className="text-right py-3 px-4 font-semibold">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-medium text-foreground">
                    {s.student?.firstName} {s.student?.lastName}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{s.subject?.name}</td>
                  <td className="py-3 px-4 font-mono text-muted-foreground">
                    {new Date(s.scheduledAt).toLocaleDateString("ar-EG")}{" "}
                    {new Date(s.scheduledAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-foreground">
                    {s.actualDuration || s.plannedDuration} دقيقة
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                        SESSION_STATUS[s.status]?.color || ""
                      }`}
                    >
                      {SESSION_STATUS[s.status]?.label || s.status}
                    </span>
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-xs text-muted-foreground">
                    لا توجد حصص مسجلة لهذا المدرس
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Payments Tab */}
      {tab === "payments" && (
        <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground text-xs">
                <th className="text-right py-3 px-4 font-semibold">الفترة المحتسبة</th>
                <th className="text-right py-3 px-4 font-semibold">الحصص</th>
                <th className="text-right py-3 px-4 font-semibold">الساعات</th>
                <th className="text-right py-3 px-4 font-semibold">الإجمالي</th>
                <th className="text-right py-3 px-4 font-semibold">الخصم</th>
                <th className="text-right py-3 px-4 font-semibold">الصافي</th>
                <th className="text-right py-3 px-4 font-semibold">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 text-muted-foreground font-mono">
                    {new Date(p.periodFrom).toLocaleDateString("ar-EG")} — {new Date(p.periodTo).toLocaleDateString("ar-EG")}
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-foreground">{p.totalSessions}</td>
                  <td className="py-3 px-4 font-mono tabular-nums text-foreground">{p.totalHours}</td>
                  <td className="py-3 px-4 font-mono tabular-nums text-foreground">{p.grossAmount} ج.م</td>
                  <td className="py-3 px-4 font-mono tabular-nums text-red-600 dark:text-red-400">
                    {p.deductions > 0 ? `-${p.deductions} ج.م` : "—"}
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums font-bold text-foreground">{p.netAmount} ج.م</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                        p.status === "PAID"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      }`}
                    >
                      {p.status === "PAID" ? "مدفوع" : "معلق"}
                    </span>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-xs text-muted-foreground">
                    لا توجد مدفوعات مسجلة لهذا المدرس
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EducationTeacherProfilePage;
