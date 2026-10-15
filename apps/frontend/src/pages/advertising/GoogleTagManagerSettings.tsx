import React from "react";
import {
  Tag,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Info,
  ExternalLink,
  HelpCircle,
} from "lucide-react";
import { SettingsPageLayout } from "../../components/settings/SettingsPageLayout";
import { SettingsSection } from "../../components/settings/SettingsSection";
import { InputSetting, ToggleSetting } from "../../components/settings/SettingControls";
import { useStorefrontSettings } from "../../hooks/useStorefrontSettings";

const GoogleTagManagerSettings: React.FC = () => {
  const { settings, loading, saving, updateSetting, handleSave, handleReset } =
    useStorefrontSettings();

  if (!settings) {
    return null;
  }

  const gtmEnabled = settings.gtmEnabled ?? false;

  return (
    <SettingsPageLayout
      title="Google Tag Manager (GTM)"
      description="إدارة حاويات التتبع، الـ Data Layer، وتوجيه أكواد التحليلات مركزياً"
      loading={loading}
      saving={saving}
      onSave={() => handleSave()}
      onReset={handleReset}
    >
      {/* 1. Container Configuration */}
      <SettingsSection
        title="إعدادات الحاوية (GTM Container)"
        icon={Tag}
        enabled={gtmEnabled}
        onToggle={(value) => updateSetting("gtmEnabled", value)}
        helperText="أدخل معرّف الحاوية الخاص بك لتضمين أكواد GTM تلقائياً في المتجر"
      >
        <div className="space-y-4">
          <InputSetting
            label="معرّف الحاوية (Container ID)"
            value={settings.gtmContainerId || ""}
            onChange={(value) => updateSetting("gtmContainerId", value)}
            placeholder="مثال: GTM-XXXXXXX"
          />

          <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 text-xs text-muted-foreground space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <Info className="h-3.5 w-3.5 text-primary" />
              <span>كيفية الحصول على المعرّف</span>
            </div>
            <p className="leading-relaxed">
              يمكنك العثور على معرّف الحاوية في الزاوية العلوية اليمنى داخل لوحة تحكم Google Tag Manager ويبدأ بالرمز{" "}
              <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-[11px] text-foreground">GTM-</code>.
            </p>
          </div>
        </div>
      </SettingsSection>

      {/* 2. Data Layer & SPA Events */}
      <SettingsSection
        title="أحداث وتدفقات Data Layer"
        icon={Layers}
        enabled={gtmEnabled}
        onToggle={(value) => updateSetting("gtmEnabled", value)}
        helperText="بث الأحداث التفاعلية كـ e-commerce dataLayer متوافقة مع معايير GA4"
      >
        <div className="space-y-2">
          <ToggleSetting
            label="تفعيل طبقة البيانات (window.dataLayer)"
            value={settings.gtmDataLayerEnabled ?? true}
            onChange={(value) => updateSetting("gtmDataLayerEnabled", value)}
          />
          <ToggleSetting
            label="تتبع تبديل الصفحات في تطبيقات SPA (PageView Tracking)"
            value={settings.gtmTrackPageView ?? true}
            onChange={(value) => updateSetting("gtmTrackPageView", value)}
          />
        </div>
      </SettingsSection>

      {/* 3. Deduplication Guard */}
      <SettingsSection
        title="منع تكرار الإشارات والأحداث (Deduplication Guard)"
        icon={ShieldCheck}
        enabled={gtmEnabled}
        onToggle={(value) => updateSetting("gtmEnabled", value)}
        helperText="إيقاف إطلاق البكسلات المدمجة تلقائياً لتفادي تسجيل التحويلات المزدوجة"
      >
        <div className="space-y-3">
          <ToggleSetting
            label="إيقاف البكسلات المدمجة عند تفعيل GTM"
            value={settings.gtmSuppressPixels ?? false}
            onChange={(value) => updateSetting("gtmSuppressPixels", value)}
          />
          <p className="text-xs text-muted-foreground leading-relaxed">
            عند تفعيل هذا الخيار، سيتم كتم أكواد التتبع المباشرة (مثل Facebook Pixel و TikTok Pixel) والاعتماد حصراً على إشارات GTM لتفادي أي تضارب أو احتساب مكرر في منصات الإعلانات.
          </p>
        </div>
      </SettingsSection>
    </SettingsPageLayout>
  );
};

export default GoogleTagManagerSettings;
