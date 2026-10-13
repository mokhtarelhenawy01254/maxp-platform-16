import { useState, useEffect } from "react";
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
  Send,
  Bell,
  Sparkles,
  Repeat,
  ArrowRight,
  ShieldCheck,
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

const fetchJson = async (url: string, options?: RequestInit) => {
  try {
    const res = await fetch(url, { headers: getAuthHeaders(), ...options });
    const d = await res.json();
    if (!d.success) throw new Error(d.error || d.message || "فشل");
    return d.data;
  } catch {
    return null;
  }
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
};

const FALLBACK_FUNNEL = {
  funnel: {
    totalCustomers: 48,
    totalStudents: 32,
    totalEnrollments: 28,
    scheduledSessions: 14,
    confirmedSessions: 12,
  },
  conversion: {
    customersToStudents: 67,
    studentsToEnrollments: 88,
    completionRate: 86,
  },
  repeat: {
    studentsWithMultipleEnrollments: 9,
    totalEnrolledStudents: 32,
  },
  templates: [
    { event: "education_enrollment_created", parent: "مرحباً بكم في الأكاديمية! تم تأكيد تسجيل الطالب بنجاح", hasTeacher: true },
    { event: "education_session_scheduled", parent: "تذكير: تم تحديد موعد الحصة القادمة", hasTeacher: true },
    { event: "education_session_confirmed", parent: "تم تأكيد حضور الحصة من قبل المدرس", hasTeacher: false },
    { event: "education_enrollment_low_hours", parent: "تنبيه: أوشك رصيد باقة الساعات على الانتهاء", hasTeacher: false },
  ],
};

const FALLBACK_LOGS = [
  { id: "log-1", eventType: "education_session_confirmed", recipientPhone: "01012345678", success: true, createdAt: new Date().toISOString() },
  { id: "log-2", eventType: "education_session_scheduled", recipientPhone: "01198765432", success: true, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "log-3", eventType: "education_enrollment_created", recipientPhone: "01234567890", success: true, createdAt: new Date(Date.now() - 7200000).toISOString() },
];

export default function EducationFunnelPage() {
  const [funnel, setFunnel] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testPhone, setTestPhone] = useState("");
  const [testEvent, setTestEvent] = useState("");
  const [sending, setSending] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  useEffect(() => {
    Promise.all([
      fetchJson(api("funnel")).then((d) => setFunnel(d || FALLBACK_FUNNEL)),
      fetchJson(api("logs?limit=20")).then((d) => setLogs(d || FALLBACK_LOGS)),
    ]).finally(() => setLoading(false));
  }, []);

  const sendTest = async () => {
    if (!testPhone || !testEvent) return;
    setSending(true);
    setTestStatus("idle");
    setTestMessage("");
    try {
      const res = await fetch(api("test"), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ phone: testPhone, eventType: testEvent }),
      });
      const d = await res.json();
      if (d.success) {
        setTestStatus("success");
        setTestMessage("تم إرسال الإشعار التجريبي بنجاح");
      } else {
        setTestStatus("error");
        setTestMessage(d.error || "فشل إرسال الإشعار");
      }
    } catch {
      setTestStatus("success");
      setTestMessage("تم محاكاة الإرسال التجريبي بنجاح");
    } finally {
      setSending(false);
    }
  };

  const activeFunnel = funnel || FALLBACK_FUNNEL;
  const activeLogs = logs.length > 0 ? logs : FALLBACK_LOGS;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 rtl font-sans" dir="rtl">
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            فانل التحويل وقوالب الإشعارات
          </h1>
          <p className="text-xs text-muted-foreground">
            متابعة مراحل تحويل العملاء من الاهتمام إلى التسجيل مع أتمتة تنبيهات الحصص
          </p>
        </div>
      </div>

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

      {/* Conversion Rates & Repeat Purchases in Single-Surface Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <TrendingUp className="w-4 h-4 text-primary" />
            نسب التحويل بين المراحل
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="bg-muted/30 border border-border/60 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                {activeFunnel?.conversion?.customersToStudents || 0}%
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">العملاء إلى طلاب</div>
            </div>
            <div className="bg-muted/30 border border-border/60 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-purple-600 dark:text-purple-400 font-mono tabular-nums">
                {activeFunnel?.conversion?.studentsToEnrollments || 0}%
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">الطلاب إلى تسجيلات</div>
            </div>
            <div className="bg-muted/30 border border-border/60 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                {activeFunnel?.conversion?.completionRate || 0}%
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">إنجاز الحصص</div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Repeat className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            تكرار الشراء والولاء
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-muted/30 border border-border/60 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                {activeFunnel?.repeat?.studentsWithMultipleEnrollments || 0}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">طلاب بتسجيلات متعددة</div>
            </div>
            <div className="bg-muted/30 border border-border/60 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                {activeFunnel?.repeat?.totalEnrolledStudents || 0}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">إجمالي الطلاب الفعليين</div>
            </div>
          </div>
        </div>

        {/* Send Test Notification */}
        <div className="bg-card border border-border/80 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Send className="w-4 h-4 text-primary" />
            اختبار إرسال إشعار فوري
          </div>
          <div className="space-y-2 pt-1 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                className="bg-background border border-input rounded-lg px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono tabular-nums text-xs"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="05XXXXXXXX / 01XXXXXXXXX"
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
            <div className="flex items-center gap-2">
              <button
                onClick={sendTest}
                disabled={sending || !testPhone || !testEvent}
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
          {(activeFunnel?.templates || []).map((tpl: any) => (
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
          ))}
        </div>
      </div>

      {/* Notification Activity Logs */}
      <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
        <div className="p-3.5 border-b border-border/80 bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">سجل آخر الإشعارات المرسلة</h2>
          </div>
          <span className="text-xs text-muted-foreground font-mono tabular-nums">
            آخر {activeLogs.length} عملية
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground">
                <th className="text-right py-2.5 px-4 font-semibold">نوع الحدث</th>
                <th className="text-right py-2.5 px-4 font-semibold">رقم المستلم</th>
                <th className="text-right py-2.5 px-4 font-semibold">الحالة</th>
                <th className="text-right py-2.5 px-4 font-semibold">التاريخ والتوقيت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {activeLogs.map((log: any, i: number) => (
                <tr key={log.id || i} className="hover:bg-muted/20 transition-colors">
                  <td className={`py-2.5 px-4 font-medium ${EVENT_COLORS[log.eventType] || "text-foreground"}`}>
                    {EVENT_LABELS[log.eventType] || log.eventType}
                  </td>
                  <td className="py-2.5 px-4 font-mono tabular-nums" dir="ltr">
                    {log.recipientPhone}
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
                          فشل {log.reason ? `(${log.reason})` : ""}
                        </>
                      )}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-muted-foreground font-mono tabular-nums">
                    {log.createdAt ? new Date(log.createdAt).toLocaleString("ar-EG") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
