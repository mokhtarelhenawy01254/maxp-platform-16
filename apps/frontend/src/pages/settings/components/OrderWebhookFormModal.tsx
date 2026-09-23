import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { apiClient } from "../../../services/api";
import { Copy } from "lucide-react";

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
      setSubscribeCreated(evts.includes("order.created") || evts.includes("*") || evts.includes("all"));
      setSubscribeStatusUpdated(evts.includes("order.status_updated") || evts.includes("*") || evts.includes("all"));
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
          setFormSecret("whsec_" + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2));
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg p-5 shadow-2xl space-y-4 animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-base font-bold text-foreground">
            {editingWebhook ? "تعديل الويب هوك" : "إضافة ويب هوك جديد"}
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-lg leading-none"
            aria-label="إغلاق"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
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
                onClick={handleCopySecret}
                className="absolute left-2.5 top-2 text-muted-foreground hover:text-foreground"
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
          <div className="space-y-2 pt-1 border-t border-border/60">
            <label className="font-semibold text-foreground block">الأحداث المشترك بها:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition">
                <input
                  type="checkbox"
                  checked={subscribeCreated}
                  onChange={(e) => setSubscribeCreated(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <div>
                  <span className="font-medium text-foreground block text-[11px]">طلب جديد</span>
                  <span className="text-[10px] text-muted-foreground font-mono">order.created</span>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition">
                <input
                  type="checkbox"
                  checked={subscribeStatusUpdated}
                  onChange={(e) => setSubscribeStatusUpdated(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <div>
                  <span className="font-medium text-foreground block text-[11px]">تحديث حالة الطلب</span>
                  <span className="text-[10px] text-muted-foreground font-mono">order.status_updated</span>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="modal_active_toggle"
              checked={formIsActive}
              onChange={(e) => setFormIsActive(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <label htmlFor="modal_active_toggle" className="font-medium text-foreground cursor-pointer">
              تفعيل استقبال الأحداث فوراً
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
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
  );
};
