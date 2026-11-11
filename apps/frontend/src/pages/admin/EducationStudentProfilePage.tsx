import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
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
  ArrowLeft,
  GraduationCap,
  Mail,
  FileText,
  AlertCircle,
  Lock,
  MapPin,
} from "lucide-react";

export default function EducationStudentProfilePage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";

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
        const token = tokenManager.getAccessToken() || localStorage.getItem("accessToken");
        const headers: HeadersInit = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };
        try {
          const u = JSON.parse(localStorage.getItem("user") || "{}");
          if (u?.companyId) (headers as any)["X-Company-Id"] = u.companyId;
        } catch {}
        const [stRes, eRes, sRes] = await Promise.all([
          fetch(buildApiUrl(`education/students/${id}`), { headers }),
          fetch(buildApiUrl(`education/enrollments?studentId=${id}`), { headers }),
          fetch(buildApiUrl(`education/sessions?studentId=${id}`), { headers }),
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
      setParentCredsMsg({
        type: "error",
        text: isEn ? "Email is required" : "البريد الإلكتروني مطلوب",
      });
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
        setParentCredsMsg({
          type: "success",
          text: isEn ? "Parent login credentials saved successfully" : "تم حفظ بيانات دخول ولي الأمر بنجاح",
        });
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
        setParentCredsMsg({
          type: "error",
          text: data.message || (isEn ? "Failed to save login credentials" : "فشل حفظ بيانات الدخول"),
        });
      }
    } catch {
      setParentCredsMsg({
        type: "error",
        text: isEn ? "Error saving credentials" : "حدث خطأ أثناء حفظ بيانات الدخول",
      });
    } finally {
      setIsSavingParentCreds(false);
    }
  };

  const totalHours = activeEnrollments.reduce((a: number, e: any) => a + (e.totalHours || 0), 0);
  const usedHours = activeEnrollments.reduce((a: number, e: any) => a + ((e.totalHours || 0) - (e.remainingHours || 0)), 0);
  const pct = totalHours > 0 ? Math.round((usedHours / totalHours) * 100) : 0;

  const stats = [
    {
      label: t("education.students.statActiveEnrollments", isEn ? "Active Enrollments" : "تسجيلات وباقات نشطة"),
      value: activeEnrollments.filter((e) => e.isActive !== false).length,
      icon: GraduationCap,
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    },
    {
      label: t("education.students.statTotalSessions", isEn ? "Total Sessions" : "إجمالي الحصص"),
      value: activeSessions.length,
      icon: BarChart2,
      color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    },
    {
      label: t("education.students.statConfirmedSessions", isEn ? "Confirmed Sessions" : "الحصص المؤكدة"),
      value: activeSessions.filter((s) => s.status === "CONFIRMED").length,
      icon: CheckCircle2,
      color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    {
      label: t("education.students.statHoursUtilization", isEn ? "Hours Utilization" : "نسبة استهلاك الساعات"),
      value: totalHours > 0 ? `${pct}%` : "—",
      icon: Clock,
      color: pct >= 80 ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
  ];

  const getSessionBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return {
          label: isEn ? "Confirmed" : "مؤكدة",
          color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        };
      case "SCHEDULED":
        return {
          label: isEn ? "Scheduled" : "مجدولة",
          color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        };
      case "CANCELLED":
        return {
          label: isEn ? "Cancelled" : "ملغية",
          color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
        };
      default:
        return {
          label: status,
          color: "bg-muted text-muted-foreground border-border",
        };
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full min-h-0 flex-1 overflow-y-auto max-w-[1600px] mx-auto p-3.5 sm:p-5 lg:p-6 pb-24 sm:pb-12 space-y-4 sm:space-y-5 font-sans" dir={isEn ? "ltr" : "rtl"}>
        <div className="bg-card border border-border/80 rounded-2xl p-10 text-center text-xs text-muted-foreground shadow-xs">
          {t("education.students.loadingStudent", isEn ? "Loading student profile..." : "جاري تحميل بيانات الطالب...")}
        </div>
      </div>
    );
  }

  if (!activeStudent) {
    return (
      <div className="w-full h-full min-h-0 flex-1 overflow-y-auto max-w-[1600px] mx-auto p-3.5 sm:p-5 lg:p-6 pb-24 sm:pb-12 space-y-4 sm:space-y-5 font-sans" dir={isEn ? "ltr" : "rtl"}>
        <div>
          <Link
            to="/admin/education/students"
            className="inline-flex items-center gap-1.5 text-primary text-xs font-semibold hover:underline"
          >
            {isEn ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            {t("education.students.backToList", isEn ? "Back to Students List" : "العودة إلى قائمة الطلاب")}
          </Link>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-10 shadow-xs text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-muted/40 text-muted-foreground flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-base font-bold text-foreground">
            {t("education.students.notFound", isEn ? "Student Not Found" : "الطالب غير موجود")}
          </h1>
          <p className="text-xs text-muted-foreground">
            {t(
              "education.students.notFoundDesc",
              isEn
                ? "Could not find records for this student. The profile may have been deleted or inaccessible."
                : "تعذر العثور على بيانات هذا الطالب. قد يكون السجل محذوفًا أو غير متاح لهذا الحساب."
            )}
          </p>
        </div>
      </div>
    );
  }

  const g = String(activeStudent.gender || "").toUpperCase();
  const genderLabel = g === "MALE" || g === "ذكر"
    ? (isEn ? "Male" : "ذكر")
    : g === "FEMALE" || g === "أنثى"
    ? (isEn ? "Female" : "أنثى")
    : null;

  return (
    <div className="w-full h-full min-h-0 flex-1 overflow-y-auto max-w-[1600px] mx-auto p-3.5 sm:p-5 lg:p-6 pb-24 sm:pb-12 space-y-4 sm:space-y-5 font-sans" dir={isEn ? "ltr" : "rtl"}>
      {/* Back Link */}
      <div>
        <Link
          to="/admin/education/students"
          className="inline-flex items-center gap-1.5 text-primary text-xs font-semibold hover:underline"
        >
          {isEn ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
          {t("education.students.backToList", isEn ? "Back to Students List" : "العودة إلى قائمة الطلاب")}
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
              {activeStudent.code && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 inline-flex items-center gap-1">
                  <span>{t("education.students.codeLabel", isEn ? "Code:" : "كود الطالب:")}</span>
                  <span className="font-mono" dir="ltr">#{activeStudent.code}</span>
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  activeStudent.isActive !== false
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                }`}
              >
                {activeStudent.isActive !== false ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                {activeStudent.isActive !== false
                  ? t("education.students.activeStatus", isEn ? "Active Student" : "طالب نشط")
                  : t("education.students.inactiveStatus", isEn ? "Inactive" : "غير نشط")}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              {activeStudent.phone && (
                <span className="flex items-center gap-1 font-mono tabular-nums" dir="ltr">
                  <Phone className="w-3.5 h-3.5 text-primary" />
                  {activeStudent.phone}
                </span>
              )}
              {activeStudent.phone2 && (
                <span className="flex items-center gap-1 font-mono tabular-nums text-primary/90" dir="ltr">
                  <Phone className="w-3.5 h-3.5 text-primary" />
                  <span>{t("education.students.secondaryPhone", isEn ? "Secondary:" : "إضافي:")} {activeStudent.phone2}</span>
                </span>
              )}
              {activeStudent.grade && (
                <span className="flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-primary" />
                  {t("education.students.gradeLabel", isEn ? "Grade:" : "الصف:")} {activeStudent.grade}
                </span>
              )}
              {activeStudent.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  {t("education.students.addressLabel", isEn ? "Address:" : "العنوان:")} {activeStudent.address}
                </span>
              )}
              {genderLabel && (
                <span>{t("education.students.genderLabel", isEn ? "Gender:" : "النوع:")} {genderLabel}</span>
              )}
            </div>
          </div>
        </div>

        {/* Parent / Customer Info */}
        {activeStudent.customer && (
          <div className="pt-3 border-t border-border/60 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-primary" />
              {t("education.students.guardianLabel", isEn ? "Guardian:" : "ولي الأمر:")} {activeStudent.customer.firstName} {activeStudent.customer.lastName}
            </span>
            {activeStudent.customer.phone && (
              <span className="font-mono tabular-nums" dir="ltr">
                {activeStudent.customer.phone}
              </span>
            )}
            {activeStudent.customer.phone2 && (
              <span className="font-mono tabular-nums text-primary" dir="ltr">
                {t("education.students.secondaryPhone", isEn ? "Secondary:" : "إضافي:")} {activeStudent.customer.phone2}
              </span>
            )}
            {activeStudent.customer.email && (
              <span className="font-mono">{activeStudent.customer.email}</span>
            )}
          </div>
        )}

        {activeStudent.subjects && Array.isArray(activeStudent.subjects) && activeStudent.subjects.length > 0 && (
          <div className="pt-3 border-t border-border/60 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              {t("education.students.subjectsLabel", isEn ? "Subjects:" : "المواد الدراسية:")}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {activeStudent.subjects.map((sub: any, idx: number) => {
                const subName = typeof sub === "string" ? sub : sub.name || sub.id;
                return (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                  >
                    {subName}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {activeStudent.notes && (
          <div className="pt-3 border-t border-border/60 text-xs text-muted-foreground flex items-start gap-1.5">
            <FileText className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium text-foreground">{t("education.students.academicNotes", isEn ? "Academic Notes:" : "ملاحظات أكاديمية:")}</span> {activeStudent.notes}
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
                <h2 className="text-sm font-bold text-foreground">
                  {t("education.students.portalAccessTitle", isEn ? "Parent Portal Login Credentials" : "بيانات دخول بوابة ولي الأمر")}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t("education.students.portalAccessSubtitle", isEn ? "Manage parent email and password to access /parent" : "إدارة البريد الإلكتروني وكلمة المرور لدخول ولي الأمر عبر /parent")}
                </p>
              </div>
            </div>
            <div>
              {hasPortalAccess ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  {t("education.students.portalEnabled", isEn ? "Enabled" : "مفعّل")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                  <AlertCircle className="w-3 h-3" />
                  {t("education.students.portalNoAccess", isEn ? "No Access" : "لا يوجد دخول")}
                </span>
              )}
            </div>
          </div>

          <form onSubmit={handleSaveParentCreds} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  {t("education.common.email", isEn ? "Email" : "البريد الإلكتروني")}
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
                  {t("education.common.password", isEn ? "Password" : "كلمة المرور")}
                </label>
                <input
                  type="password"
                  value={parentPassword}
                  onChange={(e) => setParentPassword(e.target.value)}
                  placeholder={t("education.students.newPasswordPlaceholder", isEn ? "New password" : "كلمة مرور جديدة")}
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
                {isSavingParentCreds
                  ? t("education.common.saving", isEn ? "Saving..." : "جاري الحفظ...")
                  : t("education.students.saveCredsBtn", isEn ? "Save Login Credentials" : "حفظ بيانات الدخول")}
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
              {t("education.students.hoursUsageTitle", isEn ? "Hours Balance Consumption" : "استهلاك رصيد الساعات")}
            </span>
            <span className="font-mono tabular-nums font-bold text-foreground">
              {usedHours} {t("education.students.ofTotalHours", isEn ? "of" : "من أصل")} {totalHours} {t("education.common.hour", isEn ? "hrs" : "ساعة")} ({pct}%)
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
            {t("education.students.tabEnrollments", isEn ? "Enrollments & Packages" : "التسجيلات والباقات")} ({activeEnrollments.length})
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
            {t("education.students.tabSessions", isEn ? "Sessions Log" : "سجل الحصص")} ({activeSessions.length})
          </button>
        </div>

        {/* Enrollments Tab */}
        {tab === "enrollments" && (
          <div className="overflow-x-auto">
            <table className={`w-full text-xs ${isEn ? "text-left" : "text-right"}`}>
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground">
                  <th className="py-3 px-4 font-semibold">{t("education.packages.package", isEn ? "Package" : "الباقة")}</th>
                  <th className="py-3 px-4 font-semibold">{t("education.subjects.subject", isEn ? "Subject" : "المادة")}</th>
                  <th className="py-3 px-4 font-semibold">{t("education.teachers.teacher", isEn ? "Instructor" : "المدرس")}</th>
                  <th className="py-3 px-4 font-semibold">{t("education.enrollments.remainingHours", isEn ? "Remaining" : "المتبقي")}</th>
                  <th className="py-3 px-4 font-semibold">{t("education.enrollments.totalHours", isEn ? "Total" : "الإجمالي")}</th>
                  <th className="py-3 px-4 font-semibold">{t("education.enrollments.amountPaid", isEn ? "Paid" : "المدفوع")}</th>
                  <th className="py-3 px-4 font-semibold">{t("education.common.status", isEn ? "Status" : "الحالة")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {activeEnrollments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 px-4 text-center text-xs text-muted-foreground">
                      {t("education.common.noData", isEn ? "No records found" : "لا توجد بيانات بعد")}
                    </td>
                  </tr>
                )}
                {activeEnrollments.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 font-semibold text-foreground">{e.package?.name || "—"}</td>
                    <td className="py-3 px-4 text-foreground">{e.package?.subject?.name || "—"}</td>
                    <td className="py-3 px-4 text-muted-foreground">{e.teacher?.name || "—"}</td>
                    <td className="py-3 px-4 font-mono tabular-nums text-foreground">{e.remainingHours || 0} {t("education.common.hour", isEn ? "hrs" : "ساعة")}</td>
                    <td className="py-3 px-4 font-mono tabular-nums text-muted-foreground">{e.totalHours || 0} {t("education.common.hour", isEn ? "hrs" : "ساعة")}</td>
                    <td className="py-3 px-4 font-mono tabular-nums font-medium text-foreground">
                      {(e.amountPaid || 0).toLocaleString()} {t("education.common.egp", isEn ? "EGP" : "ج.م")}
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
                        {e.paymentStatus === "COMPLETED"
                          ? t("education.payments.paid", isEn ? "Paid" : "مدفوع")
                          : t("education.payments.pending", isEn ? "Pending" : "معلق")}
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
            <table className={`w-full text-xs ${isEn ? "text-left" : "text-right"}`}>
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground">
                  <th className="py-3 px-4 font-semibold">{t("education.teachers.teacher", isEn ? "Instructor" : "المدرس")}</th>
                  <th className="py-3 px-4 font-semibold">{t("education.subjects.subject", isEn ? "Subject" : "المادة")}</th>
                  <th className="py-3 px-4 font-semibold">{t("education.sessions.dateTime", isEn ? "Date & Time" : "التاريخ والتوقيت")}</th>
                  <th className="py-3 px-4 font-semibold">{t("education.sessions.duration", isEn ? "Duration" : "المدة")}</th>
                  <th className="py-3 px-4 font-semibold">{t("education.sessions.topic", isEn ? "Topic" : "الموضوع")}</th>
                  <th className="py-3 px-4 font-semibold">{t("education.common.status", isEn ? "Status" : "الحالة")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {activeSessions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 px-4 text-center text-xs text-muted-foreground">
                      {t("education.common.noData", isEn ? "No records found" : "لا توجد بيانات بعد")}
                    </td>
                  </tr>
                )}
                {activeSessions.map((s) => {
                  const st = getSessionBadge(s.status);
                  return (
                    <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground">{s.teacher?.name || "—"}</td>
                      <td className="py-3 px-4 text-foreground">{s.subject?.name || "—"}</td>
                      <td className="py-3 px-4 font-mono tabular-nums text-muted-foreground">
                        {new Date(s.scheduledAt).toLocaleDateString(isEn ? "en-US" : "ar-EG")}{" "}
                        {new Date(s.scheduledAt).toLocaleTimeString(isEn ? "en-US" : "ar-EG", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-foreground">
                        {s.actualDuration || s.plannedDuration} {t("education.common.min", isEn ? "min" : "دقيقة")}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{s.topic || "—"}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                            st.color
                          }`}
                        >
                          {st.label}
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
}
