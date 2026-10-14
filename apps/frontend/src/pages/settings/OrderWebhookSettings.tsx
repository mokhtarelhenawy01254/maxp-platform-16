import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiClient } from "../../services/api";
import {
  Webhook,
  Plus,
  Copy,
  RefreshCw,
  Code2,
  CheckCircle2,
  XCircle,
  Share2,
  Radio,
  Activity,
  Layers,
} from "lucide-react";
import { OrderWebhookDocsModal, FULL_MARKDOWN_DOCS } from "./components/OrderWebhookDocsModal";
import { OrderWebhookFormModal, WebhookConfig } from "./components/OrderWebhookFormModal";
import { OrderWebhookLogsModal } from "./components/OrderWebhookLogsModal";
import { OrderWebhookItemCard } from "./components/OrderWebhookItemCard";

interface TestResult {
  deliveryId: string;
  isSuccess: boolean;
  responseStatus: number | null;
  durationMs: number | null;
  errorMessage: string | null;
  signature: string;
}

export const OrderWebhookSettings: React.FC = () => {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
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
    void fetchWebhooks();
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
      toast.success("تم حذف الويب هوك بنجاح");
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
        toast.success(`نجح الاختبار: استجابة ${data.responseStatus} في ${data.durationMs}ms`);
      } else {
        toast.error(`فشل الاختبار: ${data.errorMessage || "خطأ غير معروف"}`);
      }
      void fetchWebhooks();
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

  const activeWebhooksCount = webhooks.filter((w) => w.isActive).length;
  const totalSuccessCount = webhooks.reduce((acc, curr) => acc + (curr.successCount || 0), 0);

  return (
    <div dir="rtl" className="space-y-4">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card border border-border/70 rounded-xl p-4 shadow-sm">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground border border-border/60">
              إعدادات الطلبات
            </span>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-xs font-semibold text-foreground">الويب هوك للطلبات</span>
          </div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Webhook className="w-4 h-4 text-primary" />
            الويب هوك الصادر للطلبات (Outgoing Webhooks)
          </h2>
          <p className="text-xs text-muted-foreground">
            بث لحظي لبيانات الطلبات وتحديثات الحالات إلى أنظمتك الخارجية وسيرفراتك بتوقيع أمان HMAC-SHA256
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(FULL_MARKDOWN_DOCS);
              toast.success("تم نسخ التوثيق كاملاً بصيغة Markdown لإرساله للمطور");
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted text-foreground text-xs font-medium transition-colors active:scale-[0.98]"
          >
            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
            <span>نسخ التوثيق للمطور</span>
          </button>
          <button
            type="button"
            onClick={() => setShowDocs(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted text-foreground text-xs font-medium transition-colors active:scale-[0.98]"
          >
            <Code2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span>دليل التحقق</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium shadow-xs transition-colors active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة ويب هوك</span>
          </button>
        </div>
      </div>

      {/* Telemetry ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>النقاط النشطة (Active Endpoints)</span>
            <Radio className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold font-mono text-foreground tabular-nums">
              {activeWebhooksCount} / {webhooks.length}
            </span>
            <span className="text-[11px] text-muted-foreground">قنوات متصلة</span>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>إجمالي الإرسال الناجح</span>
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold font-mono text-foreground tabular-nums">
              {totalSuccessCount}
            </span>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
              Delivered
            </span>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>بروتوكول الأمان والتشفير</span>
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold text-foreground">HMAC-SHA256</span>
            <span className="text-[10px] font-mono text-muted-foreground">Signed Payload</span>
          </div>
        </div>
      </div>

      {/* Webhooks List or Empty State */}
      {loading ? (
        <div className="flex items-center justify-center p-12 bg-card border border-border/70 rounded-xl text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="mr-2 text-xs font-medium">جاري فحص إعدادات الويب هوك...</span>
        </div>
      ) : webhooks.length === 0 ? (
        <div className="text-center py-12 px-4 bg-card border border-dashed border-border/80 rounded-xl space-y-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
            <Webhook className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-semibold text-foreground">لا توجد روابط ويب هوك مضافة بعد</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            أضف رابط الويب هوك الخاص بك لبدء استقبال كافة تفاصيل الطلبات الجديدة وتحديثات الحالات لحظياً.
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة ويب هوك جديد</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {webhooks.map((wh) => (
            <OrderWebhookItemCard
              key={wh.id}
              webhook={wh}
              isTesting={testingId === wh.id}
              onToggleActive={handleToggleActive}
              onTest={handleTestWebhook}
              onOpenLogs={setLogsModalWebhook}
              onEdit={handleOpenEdit}
              onDelete={handleDeleteWebhook}
              onCopySecret={copyToClipboard}
              isCopied={copiedSecretId === wh.id}
            />
          ))}
        </div>
      )}

      {/* Test Result Output Box */}
      {testResult && (
        <div
          className={`border rounded-xl p-3.5 space-y-1.5 text-xs transition animate-in fade-in ${
            testResult.isSuccess
              ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-950 dark:text-emerald-200"
              : "bg-destructive/5 border-destructive/30 text-destructive"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              {testResult.isSuccess ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <XCircle className="w-4 h-4 text-destructive" />
              )}
              <span>نتيجة فحص الاتصال: HTTP {testResult.responseStatus || "Error"}</span>
              <span className="font-mono text-muted-foreground text-[11px]">
                ({testResult.durationMs}ms)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setTestResult(null)}
              className="text-muted-foreground hover:text-foreground text-sm font-bold"
            >
              ×
            </button>
          </div>
          {testResult.errorMessage && (
            <p className="font-mono text-[11px] text-destructive">{testResult.errorMessage}</p>
          )}
          <div className="font-mono text-[10px] bg-background/80 p-2 rounded border border-border/70 text-foreground truncate select-all">
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
