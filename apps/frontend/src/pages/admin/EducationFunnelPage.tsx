import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import {
  TrendingUp,
  Users,
  GraduationCap,
  BookOpen,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Send,
  Bell,
  Repeat,
  RefreshCw,
  Search,
  ExternalLink,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import {
  getCompanyId as getEducationCompanyId,
  getAuthHeaders as getEducationAuthHeaders,
} from "./education-management/api";
import TemplateCenter from "../templates/TemplateCenter";
import { educationScopeConfig } from "../templates/scopes/educationScope";

const getCompanyId = () => getEducationCompanyId();

const getAuthHeaders = () => getEducationAuthHeaders();

const api = (path: string) => {
  const base = buildApiUrl(`education/notifications/${path}`);
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    url = new URL(base, window.location.origin);
  }
  const cid = getCompanyId();
  if (cid) url.searchParams.set("companyId", cid);
  return url.toString();
};

const getEventLabels = (isEn: boolean): Record<string, string> => ({
  education_enrollment_created: isEn ? "New Enrollment" : "تسجيل جديد",
  education_session_scheduled: isEn ? "Scheduled Session" : "حصة مجدولة",
  education_session_confirmed: isEn ? "Confirmed Session" : "حصة مؤكدة",
  education_session_cancelled: isEn ? "Cancelled Session" : "حصة ملغية",
  education_session_reminder: isEn ? "Session Reminder" : "تذكير بحصة",
  education_enrollment_low_hours: isEn ? "Low Hours Balance" : "رصيد منخفض",
  education_enrollment_expiring: isEn ? "Package Expiring" : "باقة على وشك الانتهاء",
  education_session_scheduled_teacher: isEn ? "New Session (Teacher)" : "حصة جديدة (معلم)",
  education_session_cancelled_teacher: isEn ? "Cancelled Session (Teacher)" : "إلغاء حصة (معلم)",
  education_session_reminder_teacher: isEn ? "Session Reminder (Teacher)" : "تذكير بحصة (معلم)",
  education_enrollment_created_staff: isEn ? "New Enrollment (Staff)" : "تسجيل جديد (إدارة)",
});

const EVENT_COLORS: Record<string, string> = {
  education_enrollment_created: "text-blue-600 dark:text-blue-400",
  education_session_scheduled: "text-amber-600 dark:text-amber-400",
  education_session_confirmed: "text-emerald-600 dark:text-emerald-400",
  education_session_cancelled: "text-red-600 dark:text-red-400",
  education_session_reminder: "text-purple-600 dark:text-purple-400",
  education_enrollment_low_hours: "text-orange-600 dark:text-orange-400",
  education_enrollment_expiring: "text-rose-600 dark:text-rose-400",
  education_session_scheduled_teacher: "text-indigo-600 dark:text-indigo-400",
  education_session_cancelled_teacher: "text-rose-600 dark:text-rose-400",
  education_session_reminder_teacher: "text-violet-600 dark:text-violet-400",
  education_enrollment_created_staff: "text-teal-600 dark:text-teal-400",
};

const getPeriodLabels = (isEn: boolean): Record<string, string> => ({
  all: isEn ? "All (Cumulative)" : "الكل (تراكمي)",
  "30d": isEn ? "Last 30 Days" : "آخر 30 يوم",
  "7d": isEn ? "Last 7 Days" : "آخر 7 أيام",
  today: isEn ? "Today" : "اليوم",
});

const asNumber = (value: any): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const asPercent = (value: any): string => {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? `${n}%` : "—";
};

export default function EducationFunnelPage() {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";

  const eventLabels = useMemo(() => getEventLabels(isEn), [isEn]);
  const periodLabels = useMemo(() => getPeriodLabels(isEn), [isEn]);

  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [activeView, setActiveView] = useState<"templates" | "funnel" | "logs">(
    initialTab === "funnel" ? "funnel" : initialTab === "logs" ? "logs" : "templates"
  );

  const [funnel, setFunnel] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Funnel Period Filter
  const [period, setPeriod] = useState<"all" | "30d" | "7d" | "today">("all");

  // Logs Filters
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failed">("all");
  const [eventFilter, setEventFilter] = useState<string>("");
  const [phoneSearch, setPhoneSearch] = useState<string>("");
  const [logLimit, setLogLimit] = useState<number>(20);

  // Test notification states
  const [testPhone, setTestPhone] = useState("");
  const [testEvent, setTestEvent] = useState("");
  const [sending, setSending] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  const changeView = (view: "templates" | "funnel" | "logs") => {
    setActiveView(view);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", view);
    setSearchParams(newParams, { replace: true });
  };

  const fetchFunnelData = useCallback(async (selectedPeriod: string) => {
    try {
      const res = await fetch(api(`funnel?period=${selectedPeriod}`), { headers: getAuthHeaders() });
      const d = await res.json();
      if (!d.success) throw new Error(d.error || d.message || (isEn ? "Failed to fetch funnel data" : "فشل جلب بيانات الفانل"));
      return d.data;
    } catch (err: any) {
      console.error("Funnel fetch error:", err);
      throw err;
    }
  }, [isEn]);

  const fetchLogsData = useCallback(
    async (limit: number, event: string, status: string, search: string) => {
      try {
        let query = `logs?limit=${limit}`;
        if (event) query += `&eventType=${encodeURIComponent(event)}`;
        if (status !== "all") query += `&status=${status}`;
        if (search.trim()) query += `&search=${encodeURIComponent(search.trim())}`;

        const res = await fetch(api(query), { headers: getAuthHeaders() });
        const d = await res.json();
        if (!d.success) throw new Error(d.error || d.message || (isEn ? "Failed to fetch notification logs" : "فشل جلب السجلات"));
        return Array.isArray(d.data) ? d.data : [];
      } catch (err: any) {
        console.error("Logs fetch error:", err);
        throw err;
      }
    },
    [isEn]
  );

  const loadAll = useCallback(
    async (isInitial = false) => {
      if (isInitial) setLoading(true);
      else setRefreshing(true);
      setFetchError(null);

      try {
        const [funnelData, logsData] = await Promise.all([
          fetchFunnelData(period),
          fetchLogsData(logLimit, eventFilter, statusFilter, phoneSearch),
        ]);
        setFunnel(funnelData);
        setLogs(logsData);
      } catch (err: any) {
        setFetchError(err.message || (isEn ? "Error loading funnel data" : "حدث خطأ أثناء تحميل بيانات الفانل"));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [period, logLimit, eventFilter, statusFilter, phoneSearch, fetchFunnelData, fetchLogsData, isEn]
  );

  useEffect(() => {
    loadAll(true);
  }, []);

  const handlePeriodChange = async (p: "all" | "30d" | "7d" | "today") => {
    setPeriod(p);
    setLoading(true);
    setFetchError(null);
    try {
      const data = await fetchFunnelData(p);
      setFunnel(data);
    } catch (err: any) {
      setFetchError(err.message || (isEn ? "Error loading funnel for selected period" : "حدث خطأ أثناء تحميل بيانات الفانل للفترة المحددة"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogsFilterChange = async (
    limit: number,
    event: string,
    status: string,
    search: string
  ) => {
    try {
      const updatedLogs = await fetchLogsData(limit, event, status, search);
      setLogs(updatedLogs);
    } catch (err: any) {
      console.error("Error filtering logs:", err);
    }
  };

  const sendTest = async () => {
    if (!testPhone.trim()) {
      setTestStatus("error");
      setTestMessage(isEn ? "Phone number is required" : "يرجى إدخال رقم الهاتف");
      return;
    }
    if (!testEvent) {
      setTestStatus("error");
      setTestMessage(isEn ? "Please select a notification event" : "يرجى اختيار نوع الإشعار");
      return;
    }

    setSending(true);
    setTestStatus("idle");
    setTestMessage("");

    try {
      const res = await fetch(api("test"), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ phone: testPhone.trim(), eventType: testEvent }),
      });
      const d = await res.json();
      if (d.success) {
        setTestStatus("success");
        setTestMessage(isEn ? "Test notification sent successfully" : "تم إرسال الإشعار التجريبي بنجاح");
        const updatedLogs = await fetchLogsData(logLimit, eventFilter, statusFilter, phoneSearch);
        setLogs(updatedLogs);
      } else {
        setTestStatus("error");
        let errMsg = d.error || (isEn ? "Failed to send test notification" : "فشل إرسال الإشعار التجريبي");
        if (errMsg === "no_session" || d.details?.reason === "no_session") {
          errMsg = isEn
            ? "No active WhatsApp session found for company — please link a WhatsApp account from Company Settings first."
            : "لا توجد جلسة واتساب متصلة حالياً للشركة — يرجى ربط حساب واتساب (مسح رمز QR أو Meta Cloud) من إعدادات الشركة أولاً.";
        }
        setTestMessage(errMsg);
      }
    } catch {
      setTestStatus("error");
      setTestMessage(isEn ? "Failed to connect to server. Please try again later." : "تعذر الاتصال بالسيرفر لإرسال الإشعار. يرجى المحاولة لاحقاً");
    } finally {
      setSending(false);
    }
  };

  const activeFunnel = funnel;
  const activeLogs = logs;

  return (
    <div
      className="w-full h-full min-h-0 flex-1 overflow-y-auto overflow-x-hidden font-sans"
      dir={isEn ? "ltr" : "rtl"}
    >
      <div className="w-full max-w-[1600px] mx-auto p-3.5 sm:p-5 lg:p-6 pb-28 sm:pb-20 space-y-4 sm:space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                {t("education.funnel.badge", isEn ? "WhatsApp Notification Templates & Funnel" : "مركز قوالب رسائل الواتساب")}
              </span>
              <span className="text-xs text-muted-foreground font-mono tabular-nums">
                {t("education.funnel.tagline", isEn ? "Academy Funnel & Automated Messaging" : "فانل الأكاديمية والرسائل المؤتمتة")}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {t("education.funnel.title", isEn ? "WhatsApp Notifications & Education Conversion Funnel" : "قوالب إشعارات الواتساب ومسار التحويل للتعليم")}
            </h1>
            <p className="text-xs text-muted-foreground">
              {t(
                "education.funnel.subtitle",
                isEn
                  ? "Customize WhatsApp templates for sessions and packages, and track conversion stages and delivery logs"
                  : "تخصيص قوالب رسائل الواتساب للحالات، الحصص، وأرصدة الباقات مع تتبع مراحل التحويل وسجلات التسليم"
              )}
            </p>
          </div>

          {/* Global Controls: Period selector + Refresh button */}
          <div className="flex items-center gap-2 flex-wrap">
            {activeView !== "templates" && (
              <div className="inline-flex items-center rounded-lg border border-border/80 bg-muted/40 p-1 text-xs">
                {(["all", "30d", "7d", "today"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePeriodChange(p)}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      period === p
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {periodLabels[p]}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => loadAll(false)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/80 bg-background text-foreground text-xs font-medium hover:bg-muted/50 transition-colors disabled:opacity-50 shadow-xs"
              title={t("education.common.refresh", isEn ? "Refresh Data" : "تحديث البيانات")}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>{t("education.common.refresh", isEn ? "Refresh" : "تحديث")}</span>
            </button>
          </div>
        </div>

        {/* View Switcher Tabs Bar */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-muted/60 border border-border/80 w-fit flex-wrap">
          <button
            type="button"
            onClick={() => changeView("templates")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeView === "templates"
                ? "bg-background text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{t("education.funnel.tabTemplates", isEn ? "WhatsApp Templates" : "قوالب رسائل الواتساب")}</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
              11 {t("education.funnel.templatesCount", isEn ? "templates" : "قوالب")}
            </span>
          </button>

          <button
            type="button"
            onClick={() => changeView("funnel")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeView === "funnel"
                ? "bg-background text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingUp className="w-4 h-4 text-primary" />
            <span>{t("education.funnel.tabFunnel", isEn ? "Conversion Funnel" : "مسار التحويل والفانل")}</span>
            {activeFunnel?.funnel?.totalStudents !== undefined && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary font-mono font-bold">
                {activeFunnel?.funnel?.totalStudents} {t("education.students.students", isEn ? "students" : "طالب")}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => changeView("logs")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeView === "logs"
                ? "bg-background text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>{t("education.funnel.tabLogs", isEn ? "Notification Logs" : "سجل الإشعارات المرسلة")}</span>
            {activeLogs.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono font-bold">
                {activeLogs.length} {t("education.funnel.recordsCount", isEn ? "logs" : "سجل")}
              </span>
            )}
          </button>
        </div>

        {/* Error Banner */}
        {fetchError && (
          <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{fetchError}</span>
            </div>
            <button
              onClick={() => loadAll(false)}
              className="px-2.5 py-1 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700 transition-colors shrink-0"
            >
              {t("education.common.retry", isEn ? "Retry" : "إعادة المحاولة")}
            </button>
          </div>
        )}

        {/* VIEW 1: WhatsApp Template Center */}
        {activeView === "templates" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-foreground">
                <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  {t(
                    "education.funnel.templateNotice",
                    isEn
                      ? "Official WhatsApp Template Center — customize messages for students, guardians, and instructors, bind Meta Cloud templates, and send live tests."
                      : "نفس مركز قوالب الواتساب المعتمد للحالات — يتيح تخصيص رسائل الطلاب وأولياء الأمور والمعلمين، ربط قوالب Meta Cloud المعتمدة، وتجربة الإرسال المباشر."
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => changeView("funnel")}
                  className="text-emerald-700 dark:text-emerald-300 font-medium hover:underline text-xs"
                >
                  {t("education.funnel.viewFunnelStats", isEn ? "View Funnel Analytics →" : "عرض إحصائيات الفانل ←")}
                </button>
              </div>
            </div>

            <div className="bg-background rounded-2xl border border-border/60 shadow-xs overflow-hidden">
              <TemplateCenter config={educationScopeConfig} />
            </div>
          </div>
        )}

        {/* VIEW 2: Funnel & Conversion Analytics */}
        {activeView === "funnel" && (
          <div className="space-y-4 sm:space-y-5">
            {loading ? (
              <div className="space-y-4 animate-pulse">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-20 bg-muted/40 rounded-xl border border-border/60" />
                  ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="h-32 bg-muted/40 rounded-xl border border-border/60" />
                  <div className="h-32 bg-muted/40 rounded-xl border border-border/60" />
                  <div className="h-32 bg-muted/40 rounded-xl border border-border/60" />
                </div>
              </div>
            ) : (
              <>
                {/* Telemetry Ribbon (Funnel Stages) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <div className="bg-card border border-border/80 rounded-xl p-3.5 flex items-center justify-between shadow-xs">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">{t("education.funnel.totalCustomers", isEn ? "Total Customers" : "إجمالي العملاء")}</div>
                      <div className="text-xl font-bold text-foreground font-mono tabular-nums">
                        {activeFunnel?.funnel?.totalCustomers ?? 0}
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="bg-card border border-border/80 rounded-xl p-3.5 flex items-center justify-between shadow-xs">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">{t("education.funnel.registeredStudents", isEn ? "Registered Students" : "الطلاب المسجلين")}</div>
                      <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 font-mono tabular-nums">
                        {activeFunnel?.funnel?.totalStudents ?? 0}
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="bg-card border border-border/80 rounded-xl p-3.5 flex items-center justify-between shadow-xs">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">{t("education.funnel.packagesEnrollments", isEn ? "Packages & Enrollments" : "الباقات والتسجيلات")}</div>
                      <div className="text-xl font-bold text-purple-600 dark:text-purple-400 font-mono tabular-nums">
                        {activeFunnel?.funnel?.totalEnrollments ?? 0}
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
                      <BookOpen className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="bg-card border border-border/80 rounded-xl p-3.5 flex items-center justify-between shadow-xs">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">{t("education.funnel.scheduledSessions", isEn ? "Scheduled Sessions" : "حصص مجدولة")}</div>
                      <div className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                        {activeFunnel?.funnel?.scheduledSessions ?? 0}
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="bg-card border border-border/80 rounded-xl p-3.5 flex items-center justify-between shadow-xs col-span-2 sm:col-span-1">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">{t("education.funnel.confirmedSessions", isEn ? "Confirmed Sessions" : "حصص مؤكدة")}</div>
                      <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                        {activeFunnel?.funnel?.confirmedSessions ?? 0}
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Conversion Rates & Loyalty & Test Sender */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Conversion Rates */}
                  <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      {t("education.funnel.conversionRatesTitle", isEn ? "Conversion Rates Between Stages" : "نسب التحويل بين المراحل")}
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <div className="bg-muted/30 border border-border/60 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                          {asPercent(activeFunnel?.conversion?.customersToStudents)}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                          {t("education.funnel.customersToStudents", isEn ? "Customers to Students" : "العملاء إلى طلاب")}
                        </div>
                      </div>
                      <div className="bg-muted/30 border border-border/60 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-purple-600 dark:text-purple-400 font-mono tabular-nums">
                          {asPercent(activeFunnel?.conversion?.studentsToEnrollments)}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                          {t("education.funnel.studentsToEnrollments", isEn ? "Students to Enrollments" : "الطلاب لتسجيلات")}
                        </div>
                      </div>
                      <div className="bg-muted/30 border border-border/60 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                          {asPercent(activeFunnel?.conversion?.completionRate)}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                          {t("education.funnel.completionRate", isEn ? "Session Completion" : "إنجاز الحصص")}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Repeat & Retention */}
                  <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <Repeat className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      {t("education.funnel.repeatAndRetention", isEn ? "Repeat Purchases & Loyalty" : "تكرار الشراء والولاء")}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="bg-muted/30 border border-border/60 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                          {asNumber(activeFunnel?.repeat?.studentsWithMultipleEnrollments)}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                          {t("education.funnel.studentsWithMultipleEnrollments", isEn ? "Students with Multi-Packages" : "طلاب باشتراكات متعددة")}
                        </div>
                      </div>
                      <div className="bg-muted/30 border border-border/60 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                          {asNumber(activeFunnel?.repeat?.totalEnrolledStudents)}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                          {t("education.funnel.totalEnrolledStudents", isEn ? "Total Enrolled Students" : "إجمالي الطلاب المسجلين")}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Send Test Notification */}
                  <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <Send className="w-4 h-4 text-primary" />
                        {t("education.funnel.sendTestTitle", isEn ? "Test Live Notification" : "اختبار إرسال إشعار فوري")}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {t("education.funnel.rateLimitNotice", isEn ? "Max 5 msgs/min" : "حد أقصى 5 رسائل/دقيقة")}
                      </span>
                    </div>
                    <div className="space-y-2 pt-1 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          className="bg-background border border-input rounded-lg px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono tabular-nums text-xs"
                          value={testPhone}
                          onChange={(e) => setTestPhone(e.target.value)}
                          placeholder="010XXXXXXXX / 05XXXXXXXX"
                          dir="ltr"
                        />
                        <select
                          className="bg-background border border-input rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                          value={testEvent}
                          onChange={(e) => setTestEvent(e.target.value)}
                        >
                          <option value="">{t("education.funnel.selectNotificationType", isEn ? "Notification Type..." : "نوع الإشعار...")}</option>
                          {(Object.entries(eventLabels) as [string, string][]).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={sendTest}
                          disabled={sending || !testPhone.trim() || !testEvent}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 text-xs transition-colors shadow-xs"
                        >
                          <Send className="w-3.5 h-3.5" />
                          {sending ? (isEn ? "Sending..." : "جاري الإرسال...") : (isEn ? "Send Test" : "إرسال تجريبي")}
                        </button>
                        {testStatus === "success" && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {testMessage}
                          </span>
                        )}
                        {testStatus === "error" && (
                          <div className="w-full mt-2 p-2.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <AlertCircle className="w-4 h-4 shrink-0" />
                              <span className="leading-relaxed">{testMessage}</span>
                            </div>
                            {(testMessage.includes("واتساب") || testMessage.includes("WhatsApp") || testMessage.includes("جلسة") || testMessage.includes("session")) && (
                              <a
                                href="/whatsapp"
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-600 text-white rounded-md font-medium text-[11px] hover:bg-red-700 transition-colors shrink-0"
                              >
                                <span>{isEn ? "Connect WhatsApp" : "ربط واتساب"}</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Direct Shortcut to Template Center */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        {t("education.funnel.shortcutTitle", isEn ? "Manage & Customize WhatsApp Message Templates" : "إدارة وتخصيص قوالب رسائل الواتساب")}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t(
                          "education.funnel.shortcutDesc",
                          isEn
                            ? "Customize template body copy and variables, toggle triggers for each status, and link approved Meta Cloud templates."
                            : "قم بتعديل نصوص القوالب وإضافة المتغيرات الذكية، تفعيل أو إيقاف إشعار كل حالة، وربط قوالب Meta Cloud المعتمدة."
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => changeView("templates")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shrink-0 shadow-xs"
                  >
                    <span>{t("education.funnel.openTemplateCenter", isEn ? "Open Template Center (11 templates)" : "فتح مركز القوالب (11 قالب)")}</span>
                    <span>{isEn ? "→" : "←"}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* VIEW 3: Notification Activity Logs */}
        {activeView === "logs" && (
          <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs space-y-0">
            <div className="p-3.5 border-b border-border/80 bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">
                  {t("education.funnel.recentLogsTitle", isEn ? "Recent Sent Notifications Log" : "سجل آخر الإشعارات المرسلة")}
                </h2>
              </div>

              {/* Logs Controls (Search, Filters, Limit) */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {/* Search by Phone */}
                <div className="relative">
                  <Search className={`w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 text-muted-foreground ${isEn ? "left-2.5" : "right-2.5"}`} />
                  <input
                    className={`bg-background border border-input rounded-lg py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-36 sm:w-44 font-mono tabular-nums ${
                      isEn ? "pl-8 pr-2.5" : "pr-8 pl-2.5"
                    }`}
                    placeholder={t("education.funnel.searchPhonePrompt", isEn ? "Search by phone..." : "بحث برقم الهاتف...")}
                    value={phoneSearch}
                    onChange={(e) => setPhoneSearch(e.target.value)}
                    dir="ltr"
                  />
                </div>

                {/* Event Type Filter */}
                <select
                  className="bg-background border border-input rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  value={eventFilter}
                  onChange={(e) => {
                    setEventFilter(e.target.value);
                    handleLogsFilterChange(logLimit, e.target.value, statusFilter, phoneSearch);
                  }}
                >
                  <option value="">{t("education.funnel.allEvents", isEn ? "All Events" : "جميع الأحداث")}</option>
                  {(Object.entries(eventLabels) as [string, string][]).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  className="bg-background border border-input rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  value={statusFilter}
                  onChange={(e) => {
                    const st = e.target.value as "all" | "success" | "failed";
                    setStatusFilter(st);
                    handleLogsFilterChange(logLimit, eventFilter, st, phoneSearch);
                  }}
                >
                  <option value="all">{t("education.funnel.allStatuses", isEn ? "All Statuses" : "كل الحالات")}</option>
                  <option value="success">{t("education.funnel.statusSuccess", isEn ? "Success only" : "تم بنجاح فقط")}</option>
                  <option value="failed">{t("education.funnel.statusFailed", isEn ? "Failed only" : "الفاشلة فقط")}</option>
                </select>

                {/* Limit selector */}
                <select
                  className="bg-background border border-input rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono tabular-nums"
                  value={logLimit}
                  onChange={(e) => {
                    const lim = Number(e.target.value);
                    setLogLimit(lim);
                    handleLogsFilterChange(lim, eventFilter, statusFilter, phoneSearch);
                  }}
                >
                  <option value={20}>20 {t("education.funnel.recordsUnit", isEn ? "logs" : "سجل")}</option>
                  <option value={50}>50 {t("education.funnel.recordsUnit", isEn ? "logs" : "سجل")}</option>
                  <option value={100}>100 {t("education.funnel.recordsUnit", isEn ? "logs" : "سجل")}</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className={`w-full text-xs ${isEn ? "text-left" : "text-right"}`}>
                <thead>
                  <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground">
                    <th className="py-2.5 px-4 font-semibold">{t("education.funnel.colEventType", isEn ? "Event Type" : "نوع الحدث")}</th>
                    <th className="py-2.5 px-4 font-semibold">{t("education.funnel.colRecipientPhone", isEn ? "Recipient Phone" : "رقم المستلم (محمي)")}</th>
                    <th className="py-2.5 px-4 font-semibold">{t("education.common.status", isEn ? "Status" : "الحالة")}</th>
                    <th className="py-2.5 px-4 font-semibold">{t("education.funnel.colDateTime", isEn ? "Date & Time" : "التاريخ والتوقيت")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {activeLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 px-4 text-center text-xs text-muted-foreground">
                        {t("education.funnel.noLogsMatching", isEn ? "No notifications match search criteria" : "لا توجد إشعارات تطابق معايير البحث")}
                      </td>
                    </tr>
                  ) : (
                    activeLogs.map((log: any, i: number) => (
                      <tr key={log.id || i} className="hover:bg-muted/20 transition-colors">
                        <td className={`py-2.5 px-4 font-medium ${EVENT_COLORS[log.eventType] || "text-foreground"}`}>
                          {eventLabels[log.eventType] || log.eventType}
                        </td>
                        <td className="py-2.5 px-4 font-mono tabular-nums text-muted-foreground" dir="ltr">
                          {log.recipientPhone || "—"}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium border ${
                              log.success
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                            }`}
                          >
                            {log.success ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                {t("education.funnel.success", isEn ? "Success" : "تم بنجاح")}
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3" />
                                {t("education.funnel.failed", isEn ? "Failed" : "فشل")} {log.reason || log.failureReason ? `(${log.reason || log.failureReason})` : ""}
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground font-mono tabular-nums">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString(isEn ? "en-US" : "ar-EG") : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
