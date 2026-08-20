import React from "react";
import {
  ChartBarIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
} from "@heroicons/react/24/outline";
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
      title="Google Analytics & Ads"
      description="ربط Google Analytics و Google Ads لتتبع الزيارات والتحويلات"
      loading={loading}
      saving={saving}
      onSave={() => handleSave()}
      onReset={handleReset}
    >
      <SettingsSection
        title="Google Analytics (GA4)"
        icon={ChartBarIcon}
        enabled={analyticsEnabled}
        onToggle={(value) => updateSetting("googleAnalyticsEnabled", value)}
        helperText="فعّل GA4 وأدخل Measurement ID لتتبع الزيارات والأحداث"
      >
        <InputSetting
          label="GA4 Measurement ID"
          value={settings.googleAnalyticsMeasurementId || ""}
          onChange={(value) => updateSetting("googleAnalyticsMeasurementId", value)}
          placeholder="مثال: G-XXXXXXX"
        />
      </SettingsSection>

      <SettingsSection
        title="أحداث Google Analytics"
        icon={RocketLaunchIcon}
        enabled={analyticsEnabled}
        onToggle={(value) => updateSetting("googleAnalyticsEnabled", value)}
        helperText="تحكم في الأحداث المرسلة إلى Google Analytics"
      >
        <ToggleSetting
          label="تتبع PageView"
          value={settings.googleAnalyticsTrackPageView ?? true}
          onChange={(value) => updateSetting("googleAnalyticsTrackPageView", value)}
        />
        <ToggleSetting
          label="تتبع مشاهدة المنتج (ViewContent)"
          value={settings.googleAnalyticsTrackViewContent ?? true}
          onChange={(value) => updateSetting("googleAnalyticsTrackViewContent", value)}
        />
        <ToggleSetting
          label="تتبع إضافة للسلة (AddToCart)"
          value={settings.googleAnalyticsTrackAddToCart ?? true}
          onChange={(value) => updateSetting("googleAnalyticsTrackAddToCart", value)}
        />
        <ToggleSetting
          label="تتبع بدء الدفع (InitiateCheckout)"
          value={settings.googleAnalyticsTrackInitiateCheckout ?? true}
          onChange={(value) => updateSetting("googleAnalyticsTrackInitiateCheckout", value)}
        />
        <ToggleSetting
          label="تتبع الشراء (Purchase)"
          value={settings.googleAnalyticsTrackPurchase ?? true}
          onChange={(value) => updateSetting("googleAnalyticsTrackPurchase", value)}
        />
        <ToggleSetting
          label="تتبع البحث (Search)"
          value={settings.googleAnalyticsTrackSearch ?? true}
          onChange={(value) => updateSetting("googleAnalyticsTrackSearch", value)}
        />
      </SettingsSection>

      <SettingsSection
        title="Google Ads"
        icon={ShoppingCartIcon}
        enabled={adsEnabled}
        onToggle={(value) => updateSetting("googleAdsEnabled", value)}
        helperText="فعّل Google Ads وأدخل Conversion ID لتتبع حملاتك"
      >
        <InputSetting
          label="Google Ads Conversion ID"
          value={settings.googleAdsConversionId || ""}
          onChange={(value) => updateSetting("googleAdsConversionId", value)}
          placeholder="مثال: AW-XXXXXXX"
        />
      </SettingsSection>

      <SettingsSection
        title="منع التكرار مع GTM"
        icon={ShieldCheckIcon}
        helperText="إذا كنت تطلق أكواد جوجل من Google Tag Manager، فعّل خيار إيقاف البكسلات المدمجة في صفحة GTM"
      >
        <p className="text-sm text-muted-foreground">
          عند تفعيل "إيقاف البكسلات المدمجة عند تشغيل GTM" من صفحة Google Tag Manager،
          لن يتم تحميل أكواد جوجل مباشرة لتجنب التكرار.
        </p>
      </SettingsSection>
    </SettingsPageLayout>
  );
};

export default GoogleAnalyticsSettings;
