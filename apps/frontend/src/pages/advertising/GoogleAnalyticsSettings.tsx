import React from "react";
import {
  BarChart3,
  Activity,
  ShoppingCart,
  ShieldCheck,
  CheckCircle2,
  Info,
  Layers,
} from "lucide-react";
import { SettingsPageLayout } from "../../components/settings/SettingsPageLayout";
import { SettingsSection } from "../../components/settings/SettingsSection";
import { InputSetting, ToggleSetting } from "../../components/settings/SettingControls";
import { useStorefrontSettings } from "../../hooks/useStorefrontSettings";

const GoogleAnalyticsSettings: React.FC = () => {
  const { settings, loading, saving, updateSetting, handleSave, handleReset } =
    useStorefrontSettings();

  if (!settings) {
    return null;
  }

  const analyticsEnabled = settings.googleAnalyticsEnabled ?? false;
  const adsEnabled = settings.googleAdsEnabled ?? false;

  return (
    <SettingsPageLayout
      title="Google Analytics 4 & Google Ads"
      description="ربط تحليلات GA4 وحملات Google Ads لتتبع الزيارات، سلوك المتسوقين، والتحويلات المكتملة"
      loading={loading}
      saving={saving}
      onSave={() => handleSave()}
      onReset={handleReset}
    >
      {/* 1. GA4 Configuration */}
      <SettingsSection
        title="إعدادات Google Analytics 4 (GA4)"
        icon={BarChart3}
        enabled={analyticsEnabled}
        onToggle={(value) => updateSetting("googleAnalyticsEnabled", value)}
        helperText="أدخل معرّف القياس Measurement ID الخاص بمتجرك"
      >
        <div className="space-y-4">
          <InputSetting
            label="معرّف القياس (GA4 Measurement ID)"
            value={settings.googleAnalyticsMeasurementId || ""}
            onChange={(value) => updateSetting("googleAnalyticsMeasurementId", value)}
            placeholder="مثال: G-XXXXXXXXXX"
          />

          <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <Info className="h-3.5 w-3.5 text-primary" />
              <span>أين أجد معرّف القياس؟</span>
            </div>
            <p className="leading-relaxed">
              داخل Google Analytics، انتقل إلى <strong className="text-foreground font-medium">المسؤول ← تدفقات البيانات (Data Streams) ← الويب</strong>، ثم انسخ معرّف القياس الذي يبدأ بحرف <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-[11px] text-foreground">G-</code>.
            </p>
          </div>
        </div>
      </SettingsSection>

      {/* 2. E-Commerce Standard Events */}
      <SettingsSection
        title="أحداث التجارة الإلكترونية (Standard Events)"
        icon={Activity}
        enabled={analyticsEnabled}
        onToggle={(value) => updateSetting("googleAnalyticsEnabled", value)}
        helperText="حدد الأحداث السلوكية التي ترغب في إرسالها إلى لوحة تحليلات جوجل"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <ToggleSetting
            label="تتبع مشاهدة الصفحات (page_view)"
            value={settings.googleAnalyticsTrackPageView ?? true}
            onChange={(value) => updateSetting("googleAnalyticsTrackPageView", value)}
          />
          <ToggleSetting
            label="مشاهدة تفاصيل المنتج (view_item)"
            value={settings.googleAnalyticsTrackViewContent ?? true}
            onChange={(value) => updateSetting("googleAnalyticsTrackViewContent", value)}
          />
          <ToggleSetting
            label="إضافة المنتج للسلة (add_to_cart)"
            value={settings.googleAnalyticsTrackAddToCart ?? true}
            onChange={(value) => updateSetting("googleAnalyticsTrackAddToCart", value)}
          />
          <ToggleSetting
            label="بدء إجراءات الدفع (begin_checkout)"
            value={settings.googleAnalyticsTrackInitiateCheckout ?? true}
            onChange={(value) => updateSetting("googleAnalyticsTrackInitiateCheckout", value)}
          />
          <ToggleSetting
            label="إتمام عملية الشراء (purchase)"
            value={settings.googleAnalyticsTrackPurchase ?? true}
            onChange={(value) => updateSetting("googleAnalyticsTrackPurchase", value)}
          />
          <ToggleSetting
            label="عمليات البحث بالمتجر (search)"
            value={settings.googleAnalyticsTrackSearch ?? true}
            onChange={(value) => updateSetting("googleAnalyticsTrackSearch", value)}
          />
        </div>
      </SettingsSection>

      {/* 3. Google Ads Conversion Tracking */}
      <SettingsSection
        title="تتبع تحويلات Google Ads"
        icon={ShoppingCart}
        enabled={adsEnabled}
        onToggle={(value) => updateSetting("googleAdsEnabled", value)}
        helperText="ربط معرّف التحويل الخاص بحملات Google Ads"
      >
        <div className="space-y-4">
          <InputSetting
            label="معرّف التحويل (Google Ads Conversion ID)"
            value={settings.googleAdsConversionId || ""}
            onChange={(value) => updateSetting("googleAdsConversionId", value)}
            placeholder="مثال: AW-XXXXXXXXXX"
          />

          <p className="text-xs text-muted-foreground leading-relaxed">
            يسمح لك هذا المعرّف برصد الإيرادات المحققة من حملات البحث، الشبكة الإعلانية، وحملات Performance Max مباشرة بدقة متناهية.
          </p>
        </div>
      </SettingsSection>

      {/* 4. GTM Coexistence Notice */}
      <SettingsSection
        title="التنسيق الذكي مع Google Tag Manager"
        icon={ShieldCheck}
        helperText="إرشادات تفادي ازدواجية الإشارات بين الربط المباشر وحاوية GTM"
      >
        <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <Layers className="h-3.5 w-3.5 text-primary" />
            <span>نظام منع الازدواجية التلقائي</span>
          </div>
          <p className="leading-relaxed">
            في حال تفعيل خيار <strong className="text-foreground font-medium">"إيقاف البكسلات المدمجة عند تفعيل GTM"</strong> في صفحة Google Tag Manager، سيقوم المتجر بتعطيل هذه الأكواد المباشرة تلقائياً والاعتماد على الحاوية لتجنب تكرار احتساب الزيارات.
          </p>
        </div>
      </SettingsSection>
    </SettingsPageLayout>
  );
};

export default GoogleAnalyticsSettings;
