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
  Lock,
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

const EducationStudentProfilePage: React.FC = () => {
  const { id } = useParams();
  const [student, setStudent] = useState<any>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"enrollments" | "sessions">("enrollments");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPassword, setParentPassword] = useState("");
  const [isSavingParentCreds, setIsSavingParentCreds] = useState(false);
  const [parentCredsMsg, setParentCredsMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        const [stRes, eRes, sRes] = await Promise.all([
          fetch(`/api/v1/education/students/${id}`, { headers }),
          fetch(`/api/v1/education/enrollments?studentId=${id}`, { headers }),
          fetch(`/api/v1/education/sessions?studentId=${id}`, { headers }),
        ]);
        const [stJson, eJson, sJson] = await Promise.all([stRes.json(), eRes.json(), sRes.json()]);
        if (stJson.success && stJson.data) {
          setStudent(stJson.data);
          setParentEmail(stJson.data.customer?.email || "");
        } else {
          setStudent(null);
        }
        if (eJson.success && Array.isArray(eJson.data)) setEnrollments(eJson.data);
        else setEnrollments([]);
        if (sJson.success && Array.isArray(sJson.data)) setSessions(sJson.data);
        else setSessions([]);
      } catch {
        setStudent(null);
        setEnrollments([]);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const activeStudent = student;
  const activeEnrollments = enrollments;
  const activeSessions = sessions;

  const hasPortalAccess = Boolean(
    activeStudent?.customer?.email &&
      (activeStudent.customer.hasPassword !== undefined
        ? activeStudent.customer.hasPassword
        : true)
  );

  const handleSaveParentCreds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent?.customer?.id) return;
    if (!parentEmail || !parentEmail.trim()) {
      setParentCredsMsg({ type: "error", text: "البريد الإلكتروني مطلوب" });
      return;
    }

    setIsSavingParentCreds(true);
    setParentCredsMsg(null);
    try {
      const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
      const payload: Record<string, any> = {
        email: parentEmail.trim(),
      };
      if (parentPassword) {
        payload.password = parentPassword;
      }
      if (activeStudent.customer.firstName) {
        payload.firstName = activeStudent.customer.firstName;
      }
      if (activeStudent.customer.lastName) {
        payload.lastName = activeStudent.customer.lastName;
      }

      const res = await fetch(`/api/v1/customers/${activeStudent.customer.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setParentCredsMsg({ type: "success", text: "تم حفظ بيانات دخول ولي الأمر بنجاح" });
        setParentPassword("");
        setStudent((prev: any) => ({
          ...prev,
          customer: {
            ...prev.customer,
            email: parentEmail.trim(),
            hasPassword: parentPassword ? true : (prev.customer?.hasPassword ?? true),
          },
        }));
      } else {
        setParentCredsMsg({ type: "error", text: data.message || "فشل حفظ بيانات الدخول" });
      }
    } catch {
      setParentCredsMsg({ type: "error", text: "حدث خطأ أثناء حفظ بيانات الدخول" });
    } finally {
      setIsSavingParentCreds(false);
    }
  };

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
      value: totalHours > 0 ? `${pct}%` : "—",
      icon: Clock,
      color: pct >= 80 ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
  ];

  if (loading) {
    return (
      <div className="w-full h-full min-h-0 flex-1 overflow-y-auto max-w-[1600px] mx-auto p-3.5 sm:p-5 lg:p-6 pb-24 sm:pb-12 space-y-4 sm:space-y-5 rtl font-sans" dir="rtl">
        <div className="bg-card border border-border/80 rounded-2xl p-10 text-center text-xs text-muted-foreground shadow-xs">
          جاري تحميل بيانات الطالب...
        </div>
      </div>
    );
  }

  if (!activeStudent) {
    return (
      <div className="w-full h-full min-h-0 flex-1 overflow-y-auto max-w-[1600px] mx-auto p-3.5 sm:p-5 lg:p-6 pb-24 sm:pb-12 space-y-4 sm:space-y-5 rtl font-sans" dir="rtl">
        <div>
          <Link
            to="/admin/education/students"
            className="inline-flex items-center gap-1.5 text-primary text-xs font-semibold hover:underline"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            العودة إلى قائمة الطلاب
          </Link>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-10 shadow-xs text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-muted/40 text-muted-foreground flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-base font-bold text-foreground">الطالب غير موجود</h1>
          <p className="text-xs text-muted-foreground">
            تعذر العثور على بيانات هذا الطالب. قد يكون السجل محذوفًا أو غير متاح لهذا الحساب.
          </p>
        </div>
      </div>
    );
  }

  const g = String(activeStudent.gender || "").toUpperCase();
  const genderLabel = g === "MALE" || g === "ذكر" ? "ذكر" : g === "FEMALE" || g === "أنثى" ? "أنثى" : null;

  return (
    <div className="w-full h-full min-h-0 flex-1 overflow-y-auto max-w-[1600px] mx-auto p-3.5 sm:p-5 lg:p-6 pb-24 sm:pb-12 space-y-4 sm:space-y-5 rtl font-sans" dir="rtl">
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
              {genderLabel && (
                <span>النوع: {genderLabel}</span>
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

      {/* Parent Portal Access Section */}
      {activeStudent.customer && (
        <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">بيانات دخول بوابة ولي الأمر</h2>
                <p className="text-xs text-muted-foreground">
                  إدارة البريد الإلكتروني وكلمة المرور لدخول ولي الأمر عبر /parent
                </p>
              </div>
            </div>
            <div>
              {hasPortalAccess ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  مفعّل
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                  <AlertCircle className="w-3 h-3" />
                  لا يوجد دخول
                </span>
              )}
            </div>
          </div>

          <form onSubmit={handleSaveParentCreds} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  placeholder="parent@example.com"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  كلمة المرور
                </label>
                <input
                  type="password"
                  value={parentPassword}
                  onChange={(e) => setParentPassword(e.target.value)}
                  placeholder="كلمة مرور جديدة"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            {parentCredsMsg && (
              <div
                className={`text-xs p-2.5 rounded-lg border flex items-center gap-1.5 ${
                  parentCredsMsg.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    : "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
                }`}
              >
                {parentCredsMsg.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{parentCredsMsg.text}</span>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSavingParentCreds}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isSavingParentCreds ? "جاري الحفظ..." : "حفظ بيانات الدخول"}
              </button>
            </div>
          </form>
        </div>
      )}

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
                {activeEnrollments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 px-4 text-center text-xs text-muted-foreground">
                      لا توجد بيانات بعد
                    </td>
                  </tr>
                )}
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
                {activeSessions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 px-4 text-center text-xs text-muted-foreground">
                      لا توجد بيانات بعد
                    </td>
                  </tr>
                )}
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
