import { useState, useEffect, useCallback } from "react";
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
  Filter,
  Calendar,
} from "lucide-react";

const getCompanyId = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}").companyId || null;
  } catch {
    return null;
  }
};

const getAuthHeaders = () => {
  const headers = tokenManager.createAuthHeaders({ "Content-Type": "application/json" });
  const cid = getCompanyId();
  if (cid) headers["X-Company-Id"] = cid;
  return headers;
};

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

const EVENT_LABELS: Record<string, string> = {
  education_enrollment_created: "تسجيل جديد",
  education_session_scheduled: "حصة مجدولة",
  education_session_confirmed: "حصة مؤكدة",
  education_session_cancelled: "حصة ملغية",
  education_session_reminder: "تذكير بحصة",
  education_enrollment_low_hours: "رصيد منخفض",
  education_enrollment_expiring: "باقة على وشك الانتهاء",
};

const EVENT_COLORS: Record<string, string> = {
  education_enrollment_created: "text-blue-600 dark:text-blue-400",
  education_session_scheduled: "text-amber-600 dark:text-amber-400",
  education_session_confirmed: "text-emerald-600 dark:text-emerald-400",
  education_session_cancelled: "text-red-600 dark:text-red-400",
  education_session_reminder: "text-purple-600 dark:text-purple-400",
  education_enrollment_low_hours: "text-orange-600 dark:text-orange-400",
  education_enrollment_expiring: "text-rose-600 dark:text-rose-400",
};

const PERIOD_LABELS: Record<string, string> = {
  all: "الكل (تراكمي)",
  "30d": "آخر 30 يوم",
  "7d": "آخر 7 أيام",
  today: "اليوم",
};

const asNumber = (value: any): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const asPercent = (value: any): string => {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? `${n}%` : "—";
};

export default function EducationFunnelPage() {
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

  const fetchFunnelData = useCallback(async (selectedPeriod: string) => {
    try {
      const res = await fetch(api(`funnel?period=${selectedPeriod}`), { headers: getAuthHeaders() });
      const d = await res.json();
      if (!d.success) throw new Error(d.error || d.message || "فشل جلب بيانات الفانل");
      return d.data;
    } catch (err: any) {
      console.error("Funnel fetch error:", err);
      throw err;
    }
  }, []);

  const fetchLogsData = useCallback(
    async (limit: number, event: string, status: string, search: string) => {
      try {
        let query = `logs?limit=${limit}`;
        if (event) query += `&eventType=${encodeURIComponent(event)}`;
        if (status !== "all") query += `&status=${status}`;
        if (search.trim()) query += `&search=${encodeURIComponent(search.trim())}`;

        const res = await fetch(api(query), { headers: getAuthHeaders() });
        const d = await res.json();
        if (!d.success) throw new Error(d.error || d.message || "فشل جلب السجلات");
        return Array.isArray(d.data) ? d.data : [];
      } catch (err: any) {
        console.error("Logs fetch error:", err);
        return [];
      }
    },
    []
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
        setFunnel(funnelData || null);
        setLogs(logsData || []);
      } catch (err: any) {
        setFetchError(err.message || "تعذر تحميل البيانات. تحقق من الاتصال بالشبكة.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [period, logLimit, eventFilter, statusFilter, phoneSearch, fetchFunnelData, fetchLogsData]
  );

  useEffect(() => {
    loadAll(true);
  }, []); // Initial mount

  // Reload when period changes
  const handlePeriodChange = async (newPeriod: "all" | "30d" | "7d" | "today") => {
    setPeriod(newPeriod);
    setRefreshing(true);
    try {
      const data = await fetchFunnelData(newPeriod);
      setFunnel(data || null);
    } catch (err: any) {
      setFetchError(err.message || "فشل تحديث الفانل");
    } finally {
      setRefreshing(false);
    }
  };

  // Reload logs when log filters change
  const handleLogsFilterChange = async (
    limit = logLimit,
    event = eventFilter,
    status = statusFilter,
    search = phoneSearch
  ) => {
    const data = await fetchLogsData(limit, event, status, search);
    setLogs(data);
  };

  // Debounced search for phone number to prevent race conditions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loading) {
        fetchLogsData(logLimit, eventFilter, statusFilter, phoneSearch).then(setLogs);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [phoneSearch, logLimit, eventFilter, statusFilter, fetchLogsData, loading]);

  const sendTest = async () => {
    const cleanDigits = testPhone.replace(/\D/g, "");
    if (!cleanDigits || cleanDigits.length < 8) {
      setTestStatus("error");
      setTestMessage("يرجى إدخال رقم هاتف صحيح لا يقل عن 8 أرقام");
      return;
    }
    if (!testEvent) {
      setTestStatus("error");
      setTestMessage("يرجى اختيار نوع الإشعار");
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
        setTestMessage("تم إرسال الإشعار التجريبي بنجاح");
        // Automatically refresh logs so user sees the newly created entry
        const updatedLogs = await fetchLogsData(logLimit, eventFilter, statusFilter, phoneSearch);
        setLogs(updatedLogs);
      } else {
        setTestStatus("error");
        setTestMessage(d.error || "فشل إرسال الإشعار التجريبي");
      }
    } catch {
      setTestStatus("error");
      setTestMessage("تعذر الاتصال بالسيرفر لإرسال الإشعار. يرجى المحاولة لاحقاً");
    } finally {
      setSending(false);
    }
  };

  const activeFunnel = funnel;
  const activeLogs = logs;

  return (
    <div className="w-full max-w-[1600px] mx-auto p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 rtl font-sans" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <TrendingUp className="w-3.5 h-3.5" />
              مسار التحويل الذكي
            </span>
            <span className="text-xs text-muted-foreground font-mono tabular-nums">
              فانل الأكاديمية والرسائل المؤتمتة
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            فانل التحويل وقوالب الإشعارات
          </h1>
          <p className="text-xs text-muted-foreground">
            متابعة مراحل تحويل الطلاب مع أتمتة إشعارات الحصص التلقائية وتتبع سجلات التسليم
          </p>
        </div>

        {/* Global Controls: Period selector + Refresh button */}
        <div className="flex items-center gap-2 flex-wrap">
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
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          <button
            onClick={() => loadAll(false)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/80 bg-background text-foreground text-xs font-medium hover:bg-muted/50 transition-colors disabled:opacity-50 shadow-xs"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </button>
        </div>
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
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
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
          <div className="h-48 bg-muted/40 rounded-xl border border-border/60" />
        </div>
      ) : (
        <>
          {/* Telemetry Ribbon (Funnel Stages) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-card border border-border/80 rounded-xl p-3.5 flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">إجمالي العملاء</div>
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
                <div className="text-xs text-muted-foreground">الطلاب المسجلين</div>
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
                <div className="text-xs text-muted-foreground">الباقات والتسجيلات</div>
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
                <div className="text-xs text-muted-foreground">حصص مجدولة</div>
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
                <div className="text-xs text-muted-foreground">حصص مؤكدة</div>
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
                نسب التحويل بين المراحل
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="bg-muted/30 border border-border/60 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                    {asPercent(activeFunnel?.conversion?.customersToStudents)}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">العملاء إلى طلاب</div>
                </div>
                <div className="bg-muted/30 border border-border/60 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-purple-600 dark:text-purple-400 font-mono tabular-nums">
                    {asPercent(activeFunnel?.conversion?.studentsToEnrollments)}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">الطلاب لتسجيلات</div>
                </div>
                <div className="bg-muted/30 border border-border/60 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                    {asPercent(activeFunnel?.conversion?.completionRate)}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">إنجاز الحصص</div>
                </div>
              </div>
            </div>

            {/* Repeat & Retention */}
            <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Repeat className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                تكرار الشراء والولاء
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-muted/30 border border-border/60 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                    {asNumber(activeFunnel?.repeat?.studentsWithMultipleEnrollments)}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">طلاب باشتراكات متعددة</div>
                </div>
                <div className="bg-muted/30 border border-border/60 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                    {asNumber(activeFunnel?.repeat?.totalEnrolledStudents)}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">إجمالي الطلاب المسجلين</div>
                </div>
              </div>
            </div>

            {/* Send Test Notification */}
            <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-primary" />
                  اختبار إرسال إشعار فوري
                </div>
                <span className="text-[10px] text-muted-foreground">حد أقصى 5 رسائل/دقيقة</span>
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
                    <option value="">نوع الإشعار...</option>
                    {(Object.entries(EVENT_LABELS) as [string, string][]).map(([k, v]) => (
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
                    {sending ? "جاري الإرسال..." : "إرسال تجريبي"}
                  </button>
                  {testStatus === "success" && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {testMessage}
                    </span>
                  )}
                  {testStatus === "error" && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {testMessage}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Templates & Notification Engine */}
          <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
            <div className="p-3.5 border-b border-border/80 bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">قوالب الإشعارات التلقائية</h2>
              </div>
              <span className="text-xs text-muted-foreground font-mono tabular-nums">
                {(activeFunnel?.templates || []).length} قوالب مجهزة
              </span>
            </div>

            <div className="divide-y divide-border/60">
              {(activeFunnel?.templates || []).length === 0 ? (
                <div className="py-10 text-center text-xs text-muted-foreground">لا توجد قوالب إشعارات بعد</div>
              ) : (
                (activeFunnel?.templates || []).map((tpl: any) => (
                  <div
                    key={tpl.event}
                    className="p-3.5 hover:bg-muted/20 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-foreground">
                          {EVENT_LABELS[tpl.event] || tpl.event}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {tpl.event}
                        </span>
                      </div>
                      {tpl.parent && (
                        <p className="text-xs text-muted-foreground truncate max-w-xl">
                          {tpl.parent}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 self-start sm:self-center">
                      {tpl.hasTeacher && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          <GraduationCap className="w-3 h-3" />
                          + إشعار للمعلم
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground border border-border/60">
                        <Users className="w-3 h-3" />
                        ولي الأمر
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Notification Activity Logs with Search & Filters */}
          <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs space-y-0">
            <div className="p-3.5 border-b border-border/80 bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">سجل آخر الإشعارات المرسلة</h2>
              </div>

              {/* Logs Controls (Search, Filters, Limit) */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {/* Search by Phone */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    className="bg-background border border-input rounded-lg pr-8 pl-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-36 sm:w-44 font-mono tabular-nums"
                    placeholder="بحث برقم الهاتف..."
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
                  <option value="">جميع الأحداث</option>
                  {(Object.entries(EVENT_LABELS) as [string, string][]).map(([k, v]) => (
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
                  <option value="all">كل الحالات</option>
                  <option value="success">تم بنجاح فقط</option>
                  <option value="failed">الفاشلة فقط</option>
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
                  <option value={20}>20 سجل</option>
                  <option value={50}>50 سجل</option>
                  <option value={100}>100 سجل</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground">
                    <th className="text-right py-2.5 px-4 font-semibold">نوع الحدث</th>
                    <th className="text-right py-2.5 px-4 font-semibold">رقم المستلم (محمي)</th>
                    <th className="text-right py-2.5 px-4 font-semibold">الحالة</th>
                    <th className="text-right py-2.5 px-4 font-semibold">التاريخ والتوقيت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {activeLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 px-4 text-center text-xs text-muted-foreground">
                        لا توجد إشعارات تطابق معايير البحث
                      </td>
                    </tr>
                  ) : (
                    activeLogs.map((log: any, i: number) => (
                      <tr key={log.id || i} className="hover:bg-muted/20 transition-colors">
                        <td className={`py-2.5 px-4 font-medium ${EVENT_COLORS[log.eventType] || "text-foreground"}`}>
                          {EVENT_LABELS[log.eventType] || log.eventType}
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
                                تم بنجاح
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3" />
                                فشل {log.reason || log.failureReason ? `(${log.reason || log.failureReason})` : ""}
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground font-mono tabular-nums">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString("ar-EG") : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
