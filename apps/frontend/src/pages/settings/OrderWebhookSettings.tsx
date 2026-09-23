import React, { useEffect, useState } from "react";
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
  Share2,
} from "lucide-react";
import { OrderWebhookDocsModal, FULL_MARKDOWN_DOCS } from "./components/OrderWebhookDocsModal";
import { OrderWebhookFormModal, WebhookConfig } from "./components/OrderWebhookFormModal";
import { OrderWebhookLogsModal } from "./components/OrderWebhookLogsModal";

interface TestResult {
  deliveryId: string;
  isSuccess: boolean;
  responseStatus: number | null;
  durationMs: number | null;
  errorMessage: string | null;
  signature: string;
}

const OrderWebhookSettings: React.FC = () => {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSecretMap, setShowSecretMap] = useState<Record<string, boolean>>({});
  const [copiedSecretId, setCopiedSecretId] = useState<string | null>(null);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null);
  const [logsModalWebhook, setLogsModalWebhook] = useState<WebhookConfig | null>(null);
  const [showDocs, setShowDocs] = useState(false);

  // Test state
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

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

  const handleOpenAdd = () => {
    setEditingWebhook(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (webhook: WebhookConfig) => {
    setEditingWebhook(webhook);
    setIsFormModalOpen(true);
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
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة ويب هوك</span>
          </button>
        </div>
      </div>

      {/* 📘 Developer Quick Documentation Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
            <Share2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-foreground">هل تقوم بالربط مع مبرمج خارجي أو نظام CRM / ERP؟</h4>
            <p className="text-muted-foreground text-[11px] mt-0.5">
              يمكنك نسخ التوثيق التقني ونموذج الـ Payload الكامل لترسله لمطورك بضغطة واحدة، أو استعراض الأكواد.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => {
              navigator.clipboard.writeText(FULL_MARKDOWN_DOCS);
              toast.success("تم نسخ التوثيق كاملاً بصيغة Markdown لإرساله للمطور!");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition shadow-sm"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>نسخ التوثيق للمطور</span>
          </button>
          <button
            onClick={() => setShowDocs(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground transition font-medium"
          >
            <Code2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span>عرض التوثيق والـ Payload</span>
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
            أضف رابط الويب هوك الخاص بك لبدء استقبال كافة تفاصيل الطلبات الجديدة وتحديثات الحالات فور وصولها.
          </p>
          <button
            onClick={handleOpenAdd}
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
                      onClick={() => setLogsModalWebhook(wh)}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-medium bg-muted hover:bg-muted/80 border border-border text-foreground transition"
                      title="عرض سجلات الإرسال"
                    >
                      <span>السجلات</span>
                    </button>
                    <button
                      onClick={() => handleOpenEdit(wh)}
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

      {/* Test Result Card */}
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
              className="text-muted-foreground hover:text-foreground text-sm font-bold"
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

      {/* Modals */}
      <OrderWebhookFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        editingWebhook={editingWebhook}
        onSuccess={fetchWebhooks}
      />

      <OrderWebhookLogsModal
        webhook={logsModalWebhook}
        onClose={() => setLogsModalWebhook(null)}
      />

      <OrderWebhookDocsModal
        isOpen={showDocs}
        onClose={() => setShowDocs(false)}
      />
    </div>
  );
};

export default OrderWebhookSettings;
