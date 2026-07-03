import { useState, useEffect } from "react";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";

const getCompanyId = () => {
  try { return JSON.parse(localStorage.getItem("user") || "{}").companyId || null; } catch { return null; }
};
const getAuthHeaders = () => {
  const headers = tokenManager.createAuthHeaders({ "Content-Type": "application/json" });
  const cid = getCompanyId(); if (cid) headers["X-Company-Id"] = cid; return headers;
};
const api = (path: string) => {
  const base = buildApiUrl(`education/notifications/${path}`);
  let url: URL;
  try { url = new URL(base); } catch { url = new URL(base, window.location.origin); }
  const cid = getCompanyId(); if (cid) url.searchParams.set("companyId", cid); return url.toString();
};
const fetchJson = async (url: string, options?: RequestInit, retries = 2) => {
  for (let a = 0; a <= retries; a++) {
    try {
      const res = await fetch(url, { headers: getAuthHeaders(), ...options });
      if (res.status >= 500) { if (a < retries) { await new Promise(r => setTimeout(r, 1000 * (a + 1))); continue; } }
      const d = await res.json(); if (!d.success) throw new Error(d.error || d.message || "فشل");
      return d.data;
    } catch (e: any) {
      if (a < retries && (e.message?.includes("50") || e.message?.includes("fetch"))) { await new Promise(r => setTimeout(r, 1000 * (a + 1))); continue; }
      throw e;
    }
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
  education_enrollment_created: "text-blue-600",
  education_session_scheduled: "text-amber-600",
  education_session_confirmed: "text-green-600",
  education_session_cancelled: "text-red-600",
};

export default function EducationFunnelPage() {
  const [funnel, setFunnel] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testPhone, setTestPhone] = useState("");
  const [testEvent, setTestEvent] = useState("");
  const [sending, setSending] = useState(false);
  const [testResult, setTestResult] = useState("");

  useEffect(() => {
    Promise.all([
      fetchJson(api("funnel")).then(setFunnel).catch(() => {}),
      fetchJson(api("logs?limit=20")).then(setLogs).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const sendTest = async () => {
    if (!testPhone || !testEvent) return;
    setSending(true); setTestResult("");
    try {
      const res = await fetch(api("test"), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ phone: testPhone, eventType: testEvent }),
      });
      const d = await res.json();
      setTestResult(d.success ? "✓ تم الإرسال" : `✗ ${d.error || 'فشل'}`);
    } catch { setTestResult("✗ خطأ في الاتصال"); }
    finally { setSending(false); }
  };

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  const INPUT = "border rounded-lg px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 w-full";

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">الإشعارات والفانل</h1>

      {/* Funnel Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="إجمالي العملاء" value={funnel?.funnel?.totalCustomers ?? 0} color="bg-blue-500" />
        <StatCard title="الطلاب المسجلين" value={funnel?.funnel?.totalStudents ?? 0} color="bg-indigo-500" />
        <StatCard title="التسجيلات" value={funnel?.funnel?.totalEnrollments ?? 0} color="bg-purple-500" />
        <StatCard title="حصص مجدولة" value={funnel?.funnel?.scheduledSessions ?? 0} color="bg-amber-500" />
        <StatCard title="حصص مؤكدة" value={funnel?.funnel?.confirmedSessions ?? 0} color="bg-green-500" />
      </div>

      {/* Conversion Rates */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{funnel?.conversion?.customersToStudents || 0}%</div>
          <div className="text-sm text-gray-500 mt-1">العملاء → طلاب</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{funnel?.conversion?.studentsToEnrollments || 0}%</div>
          <div className="text-sm text-gray-500 mt-1">الطلاب → تسجيلات</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{funnel?.conversion?.completionRate || 0}%</div>
          <div className="text-sm text-gray-500 mt-1">نسبة الإنجاز</div>
        </div>
      </div>

      {/* Repeat Purchases */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4">
        <h2 className="text-lg font-semibold mb-3">تكرار الشراء</h2>
        <div className="flex gap-6">
          <div>
            <span className="text-2xl font-bold text-emerald-600">{funnel?.repeat?.studentsWithMultipleEnrollments || 0}</span>
            <span className="text-sm text-gray-500 mr-2">طالب مع أكثر من تسجيل</span>
          </div>
          <div>
            <span className="text-2xl font-bold text-amber-600">{funnel?.repeat?.totalEnrolledStudents || 0}</span>
            <span className="text-sm text-gray-500 mr-2">إجمالي الطلاب المسجلين</span>
          </div>
        </div>
      </div>

      {/* Templates */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow">
        <div className="p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold">قوالب الإشعارات</h2>
        </div>
        <div className="divide-y dark:divide-gray-700">
          {(funnel?.templates || []).map((tpl: any) => (
            <div key={tpl.event} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{EVENT_LABELS[tpl.event] || tpl.event}</span>
                  <span className="text-xs text-gray-400 mr-3">{tpl.event}</span>
                </div>
                <div className="flex gap-2">
                  {tpl.hasTeacher ? <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded">+ معلم</span> : null}
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">ولي أمر</span>
                </div>
              </div>
              {tpl.parent ? <p className="text-sm text-gray-500 mt-1 truncate">{tpl.parent}...</p> : null}
            </div>
          ))}
        </div>
      </div>

      {/* Send Test */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4">
        <h2 className="text-lg font-semibold mb-3">إرسال إشعار تجريبي</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm text-gray-500 mb-1">رقم الهاتف</label>
            <input className={INPUT} value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="05XXXXXXXX" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm text-gray-500 mb-1">نوع الإشعار</label>
            <select className={INPUT} value={testEvent} onChange={e => setTestEvent(e.target.value)}>
              <option value="">اختر...</option>
              {(Object.entries(EVENT_LABELS) as [string, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <button onClick={sendTest} disabled={sending || !testPhone || !testEvent}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors">
            {sending ? "..." : "إرسال"}
          </button>
        </div>
        {testResult && <div className="mt-2 text-sm">{testResult}</div>}
      </div>

      {/* Logs */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow">
        <div className="p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold">آخر الإشعارات</h2>
        </div>
        {logs.length === 0 ? (
          <p className="p-4 text-gray-400 text-center">لا توجد إشعارات بعد</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="text-right py-2 px-4">النوع</th>
                  <th className="text-right py-2 px-4">الرقم</th>
                  <th className="text-right py-2 px-4">الحالة</th>
                  <th className="text-right py-2 px-4">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {logs.map((log: any, i: number) => (
                  <tr key={log.id || i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className={`py-2 px-4 ${EVENT_COLORS[log.eventType] || ''}`}>
                      {EVENT_LABELS[log.eventType] || log.eventType}
                    </td>
                    <td className="py-2 px-4 ltr:text-left rtl:text-right" dir="ltr">{log.recipientPhone}</td>
                    <td className="py-2 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded ${log.success ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>
                        {log.success ? 'تم' : `فشل${log.reason ? ` - ${log.reason}` : ''}`}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-gray-500 text-xs">{log.createdAt ? new Date(log.createdAt).toLocaleString('ar-EG') : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 flex items-center gap-4">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
        <div className="text-sm text-gray-500">{title}</div>
      </div>
    </div>
  );
}
