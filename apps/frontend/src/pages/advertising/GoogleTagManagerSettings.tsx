import React from "react";
import {
  ChartBarIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
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

  return (
    <SettingsPageLayout
      title="Google Tag Manager"
      description="ربط GTM لإدارة كل أدوات التتبع من مكان واحد"
      loading={loading}
      saving={saving}
      onSave={() => handleSave()}
      onReset={handleReset}
    >
      <SettingsSection
        title="إعدادات الحاوية"
        icon={ChartBarIcon}
        enabled={settings.gtmEnabled ?? false}
        onToggle={(value) => updateSetting("gtmEnabled", value)}
        helperText="فعّل GTM وأدخل Container ID الخاص بك"
      >
        <InputSetting
          label="GTM Container ID"
          value={settings.gtmContainerId || ""}
          onChange={(value) => updateSetting("gtmContainerId", value)}
          placeholder="مثال: GTM-XXXXXXX"
        />
      </SettingsSection>

      <SettingsSection
        title="الأحداث و Data Layer"
        icon={RocketLaunchIcon}
        enabled={settings.gtmEnabled ?? false}
        onToggle={(value) => updateSetting("gtmEnabled", value)}
        helperText="تحكم في إرسال الأحداث إلى GTM"
      >
        <ToggleSetting
          label="تفعيل Data Layer للأحداث"
          value={settings.gtmDataLayerEnabled ?? true}
          onChange={(value) => updateSetting("gtmDataLayerEnabled", value)}
        />
        <ToggleSetting
          label="تتبع PageView في SPA"
          value={settings.gtmTrackPageView ?? true}
          onChange={(value) => updateSetting("gtmTrackPageView", value)}
        />
      </SettingsSection>

      <SettingsSection
        title="منع التكرار"
        icon={ShieldCheckIcon}
        enabled={settings.gtmEnabled ?? false}
        onToggle={(value) => updateSetting("gtmEnabled", value)}
        helperText="فعّل هذا الخيار إذا كنت تطلق أحداث البكسل من GTM"
      >
        <ToggleSetting
          label="إيقاف البكسلات المدمجة عند تشغيل GTM"
          value={settings.gtmSuppressPixels ?? false}
          onChange={(value) => updateSetting("gtmSuppressPixels", value)}
        />
      </SettingsSection>
    </SettingsPageLayout>
  );
};

export default GoogleTagManagerSettings;
