import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { MessageSquare, Check, Loader2, RefreshCw } from "lucide-react";
import { apiClient } from "../../services/apiClient";

interface TikTokMessagingStatus {
  enabled: boolean;
  connected: boolean;
  tiktokUsername: string | null;
}

const TikTokMessagingSettingsCard: React.FC = () => {
  const [status, setStatus] = useState<TikTokMessagingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/tiktok/messaging/status");
      const data = res.data?.data || res.data || {};
      setStatus(data);
      setEnabled(Boolean(data.enabled));
    } catch {
      // Messaging endpoint may not exist yet
      setStatus({ enabled: false, connected: false, tiktokUsername: null });
      setEnabled(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put("/tiktok/messaging/status", { enabled });
      toast.success("تم حفظ إعدادات رسائل TikTok بنجاح");
      loadStatus();
    } catch {
      toast.error("فشل حفظ إعدادات الرسائل");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-border/70 bg-card p-5 text-foreground shadow-none">
      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <MessageSquare className="size-4.5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">رسائل TikTok المباشرة</h2>
            <p className="text-xs text-muted-foreground">إدارة وتوجيه المحادثات المباشرة الواردة من TikTok</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadStatus()}
          disabled={loading}
          aria-label="تحديث الحالة"
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground active:scale-[0.97]"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          <span>جارِ تحميل إعدادات الحساب...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Connection status badge */}
          <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/30 px-3.5 py-2.5 text-xs">
            <span className="text-muted-foreground">حالة الاتصال بالمنصة:</span>
            <div className="flex items-center gap-2">
              <span className="relative flex size-2">
                {status?.connected && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex size-2 rounded-full ${
                    status?.connected ? "bg-emerald-500" : "bg-muted-foreground/40"
                  }`}
                />
              </span>
              <span className="font-medium text-foreground">
                {status?.connected
                  ? `متصل بحساب @${status.tiktokUsername || "TikTok"}`
                  : "غير متصل"}
              </span>
            </div>
          </div>

          {/* Toggle option */}
          <label className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-3.5 cursor-pointer transition-colors hover:bg-muted/20">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-foreground">تفعيل استقبال الرسائل</div>
              <div className="text-[11px] text-muted-foreground">
                استقبال رسائل العملاء ومزامنتها تلقائياً داخل صندوق الوارد
              </div>
            </div>
            <div className="relative inline-flex items-center">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="peer sr-only"
              />
              <div className="h-5 w-9 rounded-full bg-muted transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary" />
              <div className="absolute left-0.5 top-0.5 size-4 rounded-full bg-background shadow-xs transition-transform peer-checked:translate-x-4" />
            </div>
          </label>

          {/* Save Action */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-xs transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>جارِ الحفظ...</span>
                </>
              ) : (
                <>
                  <Check className="size-3.5" />
                  <span>حفظ الإعدادات</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default TikTokMessagingSettingsCard;
