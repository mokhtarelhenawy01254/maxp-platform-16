import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Sliders,
  Video,
  CheckCircle2,
  AlertTriangle,
  Save,
  Globe,
  Settings2,
} from "lucide-react";
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
      toast.success("تم حفظ إعدادات العرض بنجاح");
    } catch {
      toast.error("فشل حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-card text-foreground font-sans rtl">
      {/* Telemetry Status Ribbon */}
      <div className="border-b border-border/70 bg-muted/20 px-4 sm:px-6 py-2">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
              <span className={`inline-block w-2 h-2 rounded-full ${enabled ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`} />
              {enabled ? "عرض الفيديوهات بالمتجر مفعل" : "عرض الفيديوهات معطل"}
            </span>
            <span className="text-border">|</span>
            <span className="text-muted-foreground font-mono">
              USER: {username ? `@${username}` : "UNCONFIGURED"}
            </span>
          </div>
          <div className="flex items-center gap-4 font-mono tabular-nums text-muted-foreground">
            <span>التكامل: <strong className="text-foreground">TIKTOK_V2</strong></span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-muted/40 text-foreground border border-border/70">
                <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
                تهيئة تكاملات تيك توك
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                tiktok.settings.v2
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              إعدادات وبكسل TikTok
            </h1>
            <p className="text-xs text-muted-foreground">
              التحكم في عرض خلاصات الفيديو في واجهة المتجر وتتبع الأحداث والرسائل المباشرة
            </p>
          </div>
        </div>

        {/* Storefront Display Section */}
        <section className="rounded-lg border border-border/70 bg-card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-border/70 pb-3">
            <Video className="w-4 h-4 text-primary" />
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                عرض مقاطع وفيديوهات TikTok في المتجر الإلكتروني
              </h2>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            حدد اسم حساب TikTok الرسمي ليتم استيراد وعرض مقاطع الفيديو المباشرة في واجهة المتجر تلقائياً
          </p>

          {loading ? (
            <p className="text-xs text-muted-foreground font-mono py-2">جارِ فحص إعدادات العرض...</p>
          ) : (
            <div className="space-y-4">
              <div className="max-w-md">
                <label className="mb-1 block text-xs font-medium text-foreground">
                  اسم المستخدم على TikTok (بدون @)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. maxp_store"
                  className="w-full rounded-md border border-border/80 bg-background px-3 py-1.5 text-xs text-foreground placeholder-muted-foreground font-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-border/80 text-primary focus:ring-primary"
                />
                <span className="font-medium">تفعيل شريط فيديوهات تيك توك التفاعلي في الصفحة الرئيسية للمتجر</span>
              </label>

              <div className="pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? "جارِ الحفظ..." : "حفظ إعدادات العرض"}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Messaging Settings Card */}
        <TikTokMessagingSettingsCard />

        {/* Events & Pixel Settings Card */}
        <TikTokEventsSettingsCard />
      </div>
    </div>
  );
};

export default TikTokSettings;
