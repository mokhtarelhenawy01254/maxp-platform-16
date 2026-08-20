import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
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
      toast.success("تم حفظ إعدادات الرسائل");
      loadStatus();
    } catch {
      toast.error("فشل حفظ إعدادات الرسائل");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-gray-900">
        رسائل TikTok
      </h2>
      <p className="mb-4 text-sm text-gray-500">
        إدارة الرسائل المباشرة من TikTok
      </p>

      {loading ? (
        <p className="text-sm text-gray-400">جارِ التحميل...</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div
              className={`h-3 w-3 rounded-full ${
                status?.connected ? "bg-green-500" : "bg-gray-300"
              }`}
            />
            <span className="text-sm text-gray-700">
              {status?.connected
                ? `متصل بحساب ${status.tiktokUsername || "TikTok"}`
                : "غير متصل"}
            </span>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            تفعيل استقبال الرسائل من TikTok
          </label>

          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-black px-5 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? "جارِ الحفظ..." : "حفظ الإعدادات"}
          </button>
        </div>
      )}
    </section>
  );
};

export default TikTokMessagingSettingsCard;
