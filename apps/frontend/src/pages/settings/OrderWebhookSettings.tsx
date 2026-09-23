import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { apiClient } from "../../services/api";
import {
  Webhook,
  Plus,
  Play,
  Copy,
  Check,
  Eye,
  EyeOff,
  Trash2,
  Edit2,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Code2,
  ExternalLink,
  ShieldCheck,
  Activity,
} from "lucide-react";

interface WebhookConfig {
  id: string;
  name: string | null;
  url: string;
  secret: string;
  isActive: boolean;
  events: string;
  lastTriggeredAt: string | null;
  lastStatusCode: number | null;
  lastError: string | null;
  successCount: number;
  failureCount: number;
  createdAt: string;
}

interface WebhookLog {
  id: string;
  event: string;
  orderNumber: string | null;
  responseStatus: number | null;
  durationMs: number | null;
  isSuccess: boolean;
  error: string | null;
  createdAt: string;
}

interface TestResult {
  deliveryId: string;
  isSuccess: boolean;
  responseStatus: number | null;
  durationMs: number | null;
  errorMessage: string | null;
  signature: string;
}

const OrderWebhookSettings: React.FC = () => {
  const { t } = useTranslation();
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSecretMap, setShowSecretMap] = useState<Record<string, boolean>>({});
  const [copiedSecretId, setCopiedSecretId] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null);
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formSecret, setFormSecret] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Test & Logs modal states
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [logsModalWebhook, setLogsModalWebhook] = useState<WebhookConfig | null>(null);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState<"node" | "python" | "php">("node");

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/order-webhooks");
      if (res.data?.success) {
        setWebhooks(res.data.data || []);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "فشل تحميل إعدادات الويب هوك");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = async () => {
    setEditingWebhook(null);
    setFormName("");
    setFormUrl("");
    setFormIsActive(true);
    try {
      const res = await apiClient.post("/order-webhooks/generate-secret");
      setFormSecret(res.data?.data?.secret || "");
    } catch {
      setFormSecret("whsec_" + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2));
    }
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (webhook: WebhookConfig) => {
    setEditingWebhook(webhook);
    setFormName(webhook.name || "");
    setFormUrl(webhook.url);
    setFormSecret(webhook.secret);
    setFormIsActive(webhook.isActive);
    setIsModalOpen(true);
  };

  const handleGenerateNewSecret = async () => {
    try {
      const res = await apiClient.post("/order-webhooks/generate-secret");
      setFormSecret(res.data?.data?.secret || "");
      toast.success("تم توليد سيكريت أمان جديد بنجاح");
    } catch {
      toast.error("فشل توليد السيكريت");
    }
  };

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUrl.trim().startsWith("http://") && !formUrl.trim().startsWith("https://")) {
      toast.error("الرابط يجب أن يبدأ بـ http:// أو https://");
      return;
    }

    try {
      setSaving(true);
      if (editingWebhook) {
        await apiClient.put(`/order-webhooks/${editingWebhook.id}`, {
          name: formName.trim() || "Webhook Endpoint",
          url: formUrl.trim(),
          secret: formSecret.trim(),
          isActive: formIsActive,
          events: "order.created",
        });
        toast.success("تم تحديث الويب هوك بنجاح");
      } else {
        await apiClient.post("/order-webhooks", {
          name: formName.trim() || "Webhook Endpoint",
          url: formUrl.trim(),
          secret: formSecret.trim(),
          isActive: formIsActive,
          events: "order.created",
        });
        toast.success("تم إنشاء الويب هوك بنجاح");
      }
      setIsModalOpen(false);
      fetchWebhooks();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "حدث خطأ أثناء حفظ الويب هوك");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الويب هوك؟")) return;
    try {
      await apiClient.delete(`/order-webhooks/${id}`);
      toast.success("تم حذف الويب هوك");
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    } catch (err: any) {
      toast.error(err.response?.data?.error || "فشل حذف الويب هوك");
    }
  };

  const handleToggleActive = async (webhook: WebhookConfig) => {
    try {
      const nextActive = !webhook.isActive;
      await apiClient.put(`/order-webhooks/${webhook.id}`, { isActive: nextActive });
      setWebhooks((prev) =>
        prev.map((w) => (w.id === webhook.id ? { ...w, isActive: nextActive } : w))
      );
      toast.success(nextActive ? "تم تفعيل الويب هوك" : "تم تعطيل الويب هوك");
    } catch {
      toast.error("فشل تغيير حالة الويب هوك");
    }
  };

  const handleTestWebhook = async (webhook: WebhookConfig) => {
    try {
      setTestingId(webhook.id);
      setTestResult(null);
      const res = await apiClient.post(`/order-webhooks/${webhook.id}/test`);
      const data: TestResult = res.data?.data;
      setTestResult(data);
      if (data.isSuccess) {
        toast.success(`نجح الاختبار! استجابة ${data.responseStatus} في ${data.durationMs}ms`);
      } else {
        toast.error(`فشل الاختبار: ${data.errorMessage || "خطأ غير معروف"}`);
      }
      fetchWebhooks();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "فشل إرسال اختبار الويب هوك");
    } finally {
      setTestingId(null);
    }
  };

  const handleViewLogs = async (webhook: WebhookConfig) => {
    setLogsModalWebhook(webhook);
    try {
      setLoadingLogs(true);
      const res = await apiClient.get(`/order-webhooks/${webhook.id}/logs?limit=30`);
      setLogs(res.data?.data || []);
    } catch {
      toast.error("فشل تحميل السجلات");
    } finally {
      setLoadingLogs(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSecretId(id);
    toast.success("تم نسخ السيكريت إلى الحافظة");
    setTimeout(() => setCopiedSecretId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-4 sm:p-5 rounded-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Webhook className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold text-foreground">الويب هوك للطلبات (Outgoing Webhooks)</h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            استقبل بيانات الطلبات لحظة بلحظة على سيرفرك أو أدواتك (Google Sheets، Zapier، ERP) مع توقيع أمان مشفر (HMAC-SHA256).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDocs(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground transition"
          >
            <Code2 className="w-4 h-4 text-muted-foreground" />
            <span>دليل التحقق</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة ويب هوك</span>
          </button>
        </div>
      </div>

      {/* Webhooks List */}
      {loading ? (
        <div className="flex items-center justify-center p-12 bg-card border border-border rounded-xl">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : webhooks.length === 0 ? (
        <div className="text-center py-12 px-4 bg-card border border-dashed border-border rounded-xl space-y-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
            <Webhook className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">لا توجد روابط ويب هوك مضافة بعد</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            أضف رابط الويب هوك الخاص بك لبدء استقبال كافة تفاصيل الطلبات الجديدة (الاسم، الهواتف، العناوين، المنتجات والمتغيرات، الماليات، الـ IP و UTM) فور وصولها.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة ويب هوك جديد</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map((wh) => {
            const isVisible = showSecretMap[wh.id] || false;
            const isTesting = testingId === wh.id;

            return (
              <div
                key={wh.id}
                className="bg-card border border-border rounded-xl p-4 sm:p-5 space-y-4 transition hover:border-primary/40"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        wh.isActive ? "bg-emerald-500 ring-4 ring-emerald-500/20" : "bg-zinc-400"
                      }`}
                    />
                    <div>
                      <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                        {wh.name || "Webhook Endpoint"}
                        <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {wh.events}
                        </span>
                      </h4>
                      <p className="text-xs font-mono text-muted-foreground break-all mt-0.5">
                        {wh.url}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleToggleActive(wh)}
                      className={`text-xs px-2.5 py-1 rounded-md font-medium border transition ${
                        wh.isActive
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted border-border text-muted-foreground"
                      }`}
                    >
                      {wh.isActive ? "نشط" : "معطل"}
                    </button>
                    <button
                      onClick={() => handleTestWebhook(wh)}
                      disabled={isTesting}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-medium bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 transition disabled:opacity-50"
                      title="إرسال طلب تجريبي"
                    >
                      {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                      <span>اختبار</span>
                    </button>
                    <button
                      onClick={() => handleViewLogs(wh)}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-medium bg-muted hover:bg-muted/80 border border-border text-foreground transition"
                      title="عرض سجلات الإرسال"
                    >
                      <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>السجلات</span>
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(wh)}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition"
                      title="تعديل"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteWebhook(wh.id)}
                      className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Secret and Telemetry Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Secret Display */}
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/50 border border-border/80">
                    <div className="flex items-center gap-2 min-w-0">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span className="text-muted-foreground flex-shrink-0">Secret:</span>
                      <span className="font-mono text-foreground truncate select-all">
                        {isVisible ? wh.secret : `${wh.secret.slice(0, 10)}••••••••••••${wh.secret.slice(-4)}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() =>
                          setShowSecretMap((p) => ({ ...p, [wh.id]: !p[wh.id] }))
                        }
                        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition"
                        title={isVisible ? "إخفاء" : "إظهار"}
                      >
                        {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(wh.secret, wh.id)}
                        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition"
                        title="نسخ السيكريت"
                      >
                        {copiedSecretId === wh.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Telemetry Stats */}
                  <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-muted/50 border border-border/80 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <span>
                        آخر إرسال:{" "}
                        <span className="text-foreground font-medium">
                          {wh.lastTriggeredAt
                            ? new Date(wh.lastTriggeredAt).toLocaleTimeString("ar-EG", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })
                            : "لم يُرسل بعد"}
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {wh.lastStatusCode && (
                        <span
                          className={`font-mono px-2 py-0.5 rounded font-bold ${
                            wh.lastStatusCode >= 200 && wh.lastStatusCode < 300
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          HTTP {wh.lastStatusCode}
                        </span>
                      )}
                      <span className="tabular-nums text-foreground font-semibold">
                        {wh.successCount} نجاح / {wh.failureCount} فشل
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Test Result Card / Callout */}
      {testResult && (
        <div
          className={`border rounded-xl p-4 space-y-2 text-xs transition animate-in fade-in ${
            testResult.isSuccess
              ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-950 dark:text-emerald-200"
              : "bg-destructive/5 border-destructive/30 text-destructive"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold">
              {testResult.isSuccess ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <XCircle className="w-4 h-4 text-destructive" />
              )}
              <span>نتيجة فحص الاتصال: HTTP {testResult.responseStatus || "Error"}</span>
              <span className="font-normal text-muted-foreground">
                (استغرق {testResult.durationMs}ms)
              </span>
            </div>
            <button
              onClick={() => setTestResult(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          </div>
          {testResult.errorMessage && (
            <p className="font-mono text-destructive">{testResult.errorMessage}</p>
          )}
          <div className="font-mono text-[11px] bg-background/80 p-2 rounded border border-border text-foreground truncate select-all">
            X-Webhook-Signature: sha256={testResult.signature}
          </div>
        </div>
      )}

      {/* Add / Edit Webhook Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">
                {editingWebhook ? "تعديل الويب هوك" : "إضافة ويب هوك جديد"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-lg leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveWebhook} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">الاسم التعريفي (اختياري)</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="مثال: الربط مع شيت جوجل أو المحاسبة"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">رابط الويب هوك (Endpoint URL) *</label>
                <input
                  type="url"
                  required
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://example.com/api/webhooks/orders"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-foreground">مفتاح التشفير (Secret Key) *</label>
                  <button
                    type="button"
                    onClick={handleGenerateNewSecret}
                    className="text-primary hover:underline text-[11px]"
                  >
                    توليد سيكريت جديد
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formSecret}
                    onChange={(e) => setFormSecret(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none font-mono text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(formSecret, "form_secret")}
                    className="absolute left-2.5 top-2 text-muted-foreground hover:text-foreground"
                    title="نسخ"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  يُستخدم هذا المفتاح في التحقق من صحة التوقيع عبر رأس <code>X-Webhook-Signature</code>.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="active_toggle"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="active_toggle" className="font-medium text-foreground cursor-pointer">
                  تفعيل استقبال الأحداث فوراً
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border hover:bg-muted text-foreground transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition disabled:opacity-50"
                >
                  {saving ? "جاري الحفظ..." : "حفظ الويب هوك"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {logsModalWebhook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl w-full max-w-2xl p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  سجلات إرسال الويب هوك ({logsModalWebhook.name || "Endpoint"})
                </h3>
                <p className="text-xs text-muted-foreground truncate">{logsModalWebhook.url}</p>
              </div>
              <button
                onClick={() => setLogsModalWebhook(null)}
                className="text-muted-foreground hover:text-foreground text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
              {loadingLogs ? (
                <div className="text-center py-8 text-muted-foreground">جاري تحميل السجلات...</div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">لا توجد سجلات إرسال سابقة بعد.</div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-lg border border-border bg-muted/40 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-mono">
                        <span
                          className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                            log.isSuccess
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {log.responseStatus ? `HTTP ${log.responseStatus}` : "FAILED"}
                        </span>
                        <span className="font-semibold text-foreground">
                          {log.orderNumber || "طلب بدون رقم"}
                        </span>
                        <span className="text-muted-foreground text-[10px]">{log.event}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {log.durationMs ? `${log.durationMs}ms` : "—"} |{" "}
                        {new Date(log.createdAt).toLocaleString("ar-EG")}
                      </span>
                    </div>
                    {log.error && (
                      <p className="font-mono text-destructive text-[11px] break-all">{log.error}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Developer Signature Verification Modal */}
      {showDocs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl w-full max-w-2xl p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-bold text-foreground">دليل المطور: التحقق من أمان الـ Webhook</h3>
              </div>
              <button
                onClick={() => setShowDocs(false)}
                className="text-muted-foreground hover:text-foreground text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-muted-foreground flex-1 overflow-y-auto pr-1">
              <p>
                يتم إرسال توقيع HMAC-SHA256 المشفر في رأس الطلب <code>X-Webhook-Signature</code> بصيغة{" "}
                <code>sha256=HEX_SIGNATURE</code> وأيضاً <code>X-MaxP-Signature</code>. للتحقق من هوية المرسل:
              </p>

              <div className="flex gap-2 border-b border-border pb-2">
                {(["node", "python", "php"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveCodeTab(tab)}
                    className={`px-3 py-1 rounded text-xs font-mono font-semibold transition ${
                      activeCodeTab === tab
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.toUpperCase()}
                  </button>
                ))}
              </div>

              {activeCodeTab === "node" && (
                <pre className="p-3 rounded-lg bg-zinc-950 text-zinc-100 font-mono text-[11px] overflow-x-auto select-all">
{`const crypto = require('crypto');

function verifyMaxPWebhook(rawBody, signatureHeader, secret) {
  const cleanSecret = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  const signature = signatureHeader.replace('sha256=', '');
  const computed = crypto.createHmac('sha256', cleanSecret).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computed));
}`}
                </pre>
              )}

              {activeCodeTab === "python" && (
                <pre className="p-3 rounded-lg bg-zinc-950 text-zinc-100 font-mono text-[11px] overflow-x-auto select-all">
{`import hmac
import hashlib

def verify_maxp_webhook(raw_body_bytes, signature_header, secret):
    clean_secret = secret.replace("whsec_", "")
    signature = signature_header.replace("sha256=", "")
    computed = hmac.new(clean_secret.encode('utf-8'), raw_body_bytes, hashlib.sha256).hexdigest()
    return hmac.compare_digest(signature, computed)`}
                </pre>
              )}

              {activeCodeTab === "php" && (
                <pre className="p-3 rounded-lg bg-zinc-950 text-zinc-100 font-mono text-[11px] overflow-x-auto select-all">
{`function verifyMaxPWebhook($rawBody, $signatureHeader, $secret) {
    $cleanSecret = str_replace('whsec_', '', $secret);
    $signature = str_replace('sha256=', '', $signatureHeader);
    $computed = hash_hmac('sha256', $rawBody, $cleanSecret);
    return hash_equals($signature, $computed);
}`}
                </pre>
              )}

              <p className="text-[11px] text-muted-foreground/80">
                * ملاحظة: يجب قراءة الـ Raw Body كما هو قبل أي معالجة JSON لتطابق التوقيع بدقة 100%.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderWebhookSettings;
