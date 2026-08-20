import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getDisplaySettings,
  saveDisplaySettings,
  type TikTokDisplaySettings,
} from "../../services/tiktokDisplayService";
import TikTokEventsSettingsCard from "../../components/tiktok/TikTokEventsSettingsCard";
import TikTokMessagingSettingsCard from "../../components/tiktok/TikTokMessagingSettingsCard";

const TikTokSettings: React.FC = () => {
  const [username, setUsername] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getDisplaySettings()
      .then((settings: TikTokDisplaySettings) => {
        if (!active) return;
        setUsername(settings.storefrontUsername || "");
        setEnabled(Boolean(settings.storefrontEnabled));
      })
      .catch(() => {
        if (active) toast.error("تعذر تحميل إعدادات TikTok");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await saveDisplaySettings({
        storefrontUsername: username.trim() || null,
        storefrontEnabled: enabled,
      });
      setUsername(saved.storefrontUsername || "");
      setEnabled(Boolean(saved.storefrontEnabled));
      toast.success("تم حفظ الإعدادات بنجاح");
    } catch {
      toast.error("فشل حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div dir="rtl" className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">إعدادات TikTok</h1>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">
          عرض فيديوهات TikTok في المتجر
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          حدد اسم حساب TikTok ليظهر محتواه في متجرك الإلكتروني
        </p>

        {loading ? (
          <p className="text-sm text-gray-400">جارِ التحميل...</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                اسم المستخدم على TikTok
              </label>
              <input
                type="text"
                dir="ltr"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="مثال: maxp_store"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              تفعيل عرض المحتوى في المتجر
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

      <TikTokMessagingSettingsCard />

      <TikTokEventsSettingsCard />
    </div>
  );
};

export default TikTokSettings;
