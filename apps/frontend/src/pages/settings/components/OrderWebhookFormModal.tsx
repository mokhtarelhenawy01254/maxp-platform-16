import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { apiClient } from "../../../services/api";
import { Copy, X, Webhook, RefreshCw, CheckCircle2, ShieldCheck, Link2 } from "lucide-react";

export interface WebhookConfig {
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

interface OrderWebhookFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingWebhook: WebhookConfig | null;
  onSuccess: () => void;
}

export const OrderWebhookFormModal: React.FC<OrderWebhookFormModalProps> = ({
  isOpen,
  onClose,
  editingWebhook,
  onSuccess,
}) => {
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formSecret, setFormSecret] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [subscribeCreated, setSubscribeCreated] = useState(true);
  const [subscribeStatusUpdated, setSubscribeStatusUpdated] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (editingWebhook) {
      setFormName(editingWebhook.name || "");
      setFormUrl(editingWebhook.url);
      setFormSecret(editingWebhook.secret);
      setFormIsActive(editingWebhook.isActive);
      const evts = (editingWebhook.events || "").toLowerCase();
      setSubscribeCreated(
        evts.includes("order.created") || evts.includes("*") || evts.includes("all")
      );
      setSubscribeStatusUpdated(
        evts.includes("order.status_updated") || evts.includes("*") || evts.includes("all")
      );
    } else {
      setFormName("");
      setFormUrl("");
      setFormIsActive(true);
      setSubscribeCreated(true);
      setSubscribeStatusUpdated(true);
      apiClient
        .post("/order-webhooks/generate-secret")
        .then((res) => {
          setFormSecret(res.data?.data?.secret || "");
        })
        .catch(() => {
          setFormSecret(
            "whsec_" + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
          );
        });
    }
  }, [isOpen, editingWebhook]);

  if (!isOpen) return null;

  const handleGenerateNewSecret = async () => {
    try {
      const res = await apiClient.post("/order-webhooks/generate-secret");
      setFormSecret(res.data?.data?.secret || "");
      toast.success("تم توليد سيكريت أمان جديد بنجاح");
    } catch {
      toast.error("فشل توليد السيكريت");
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(formSecret);
    toast.success("تم نسخ السيكريت إلى الحافظة");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUrl.trim().startsWith("http://") && !formUrl.trim().startsWith("https://")) {
      toast.error("الرابط يجب أن يبدأ بـ http:// أو https://");
      return;
    }

    const selectedEvents: string[] = [];
    if (subscribeCreated) selectedEvents.push("order.created");
    if (subscribeStatusUpdated) selectedEvents.push("order.status_updated");

    if (selectedEvents.length === 0) {
      toast.error("يرجى اختيار حدث واحد على الأقل للاشتراك به");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: formName.trim() || "Webhook Endpoint",
        url: formUrl.trim(),
        secret: formSecret.trim(),
        isActive: formIsActive,
        events: selectedEvents.join(","),
      };

      if (editingWebhook) {
        await apiClient.put(`/order-webhooks/${editingWebhook.id}`, payload);
        toast.success("تم تحديث الويب هوك بنجاح");
      } else {
        await apiClient.post("/order-webhooks", payload);
        toast.success("تم إنشاء الويب هوك بنجاح");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "حدث خطأ أثناء حفظ الويب هوك");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card border border-border/80 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 text-xs font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Webhook className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {editingWebhook ? "تعديل الويب هوك" : "إضافة نقطة ويب هوك جديدة"}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                تكوين معرّف ورابط الاستقبال ومفتاح التحقق المشفر
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground block">
              الاسم التعريفي (اختياري)
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="مثال: الربط مع شيت جوجل أو برنامج المحاسبة"
              className="w-full px-3 py-2 rounded-xl border border-border/70 bg-card text-foreground focus:ring-1 focus:ring-primary/40 focus:border-primary/50 focus:outline-none shadow-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-foreground flex items-center gap-1">
              <Link2 className="w-3.5 h-3.5 text-primary" />
              <span>رابط الويب هوك (Endpoint URL) *</span>
            </label>
            <input
              type="url"
              required
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              placeholder="https://api.example.com/webhooks/orders"
              dir="ltr"
              className="w-full px-3 py-2 rounded-xl border border-border/70 bg-card text-foreground focus:ring-1 focus:ring-primary/40 focus:border-primary/50 focus:outline-none font-mono text-xs shadow-xs"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-foreground flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span>مفتاح التوقيع المشفر (Secret Key) *</span>
              </label>
              <button
                type="button"
                onClick={handleGenerateNewSecret}
                className="text-primary hover:underline text-[11px] inline-flex items-center gap-1 font-medium"
              >
                <RefreshCw className="w-3 h-3" />
                <span>توليد مفتاح جديد</span>
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                required
                value={formSecret}
                onChange={(e) => setFormSecret(e.target.value)}
                dir="ltr"
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-border/70 bg-card text-foreground focus:ring-1 focus:ring-primary/40 focus:border-primary/50 focus:outline-none font-mono text-[11px] shadow-xs"
              />
              <button
                type="button"
                onClick={handleCopySecret}
                className="absolute left-2.5 top-2 text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                title="نسخ"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              يُستخدم هذا المفتاح للتحقق من صحة التوقيع عبر رأس <code>X-Webhook-Signature</code>.
            </p>
          </div>

          {/* Event Subscription Checkboxes */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <label className="font-semibold text-foreground block">
              الأحداث المشترك بها:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label
                className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition select-none ${
                  subscribeCreated
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "border-border/70 bg-card text-muted-foreground hover:bg-muted/40"
                }`}
              >
                <input
                  type="checkbox"
                  checked={subscribeCreated}
                  onChange={(e) => setSubscribeCreated(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary/40 accent-primary"
                />
                <div className="min-w-0">
                  <span className="font-medium text-foreground block text-xs">
                    طلب جديد
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono block truncate">
                    order.created
                  </span>
                </div>
              </label>

              <label
                className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition select-none ${
                  subscribeStatusUpdated
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "border-border/70 bg-card text-muted-foreground hover:bg-muted/40"
                }`}
              >
                <input
                  type="checkbox"
                  checked={subscribeStatusUpdated}
                  onChange={(e) => setSubscribeStatusUpdated(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary/40 accent-primary"
                />
                <div className="min-w-0">
                  <span className="font-medium text-foreground block text-xs">
                    تحديث حالة الطلب
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono block truncate">
                    order.status_updated
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Active status checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                id="modal_active_toggle"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary/40 accent-primary"
              />
              <span className="font-medium text-foreground">
                تفعيل استقبال وبث الأحداث فوراً
              </span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2.5 pt-3.5 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border/70 bg-card hover:bg-muted/60 text-foreground font-medium transition shadow-xs"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition disabled:opacity-50 shadow-sm"
            >
              {saving ? "جاري الحفظ..." : "حفظ الويب هوك"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
