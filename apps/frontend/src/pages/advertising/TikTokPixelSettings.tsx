import { Activity as ChartBarIcon, Circle as RocketLaunchIcon, ShieldCheck as ShieldCheckIcon } from 'lucide-react';
import React from "react";
;
import { SettingsPageLayout } from "../../components/settings/SettingsPageLayout";
import { SettingsSection } from "../../components/settings/SettingsSection";
import {
  InputSetting,
  ToggleSetting,
} from "../../components/settings/SettingControls";
import { useStorefrontSettings } from "../../hooks/useStorefrontSettings";

const TikTokPixelSettings: React.FC = () => {
  const { settings, loading, saving, updateSetting, handleSave, handleReset } =
    useStorefrontSettings();

  if (!settings) {
    return null;
  }

  return (
    <SettingsPageLayout
      title="TikTok Pixel"
      description="ربط Pixel وتفعيل أحداث التحويل الخاصة بمتجرك على TikTok"
      loading={loading}
      saving={saving}
      onSave={() => handleSave()}
      onReset={handleReset}
    >
      <SettingsSection
        title="إعدادات Pixel"
        icon={ChartBarIcon}
        enabled={settings.tiktokPixelEnabled ?? false}
        onToggle={(value) => updateSetting("tiktokPixelEnabled", value)}
        helperText="فعّل Pixel وأدخل المعرف الخاص بك"
      >
        <InputSetting
          label="Pixel ID"
          value={settings.tiktokPixelId || ""}
          onChange={(value) => updateSetting("tiktokPixelId", value)}
          placeholder="مثال: C0XXXXXXX"
        />
        <ToggleSetting
          label="تتبع مشاهدة الصفحة (PageView)"
          value={settings.tiktokTrackPageView ?? true}
          onChange={(value) => updateSetting("tiktokTrackPageView", value)}
        />
      </SettingsSection>

      <SettingsSection
        title="الأحداث القياسية"
        icon={RocketLaunchIcon}
        enabled={settings.tiktokPixelEnabled ?? false}
        onToggle={(value) => updateSetting("tiktokPixelEnabled", value)}
        helperText="اختر الأحداث التي سيتم إرسالها إلى TikTok"
      >
        <ToggleSetting
          label="عرض منتج (ViewContent)"
          value={settings.tiktokTrackViewContent ?? true}
          onChange={(value) => updateSetting("tiktokTrackViewContent", value)}
        />
        <ToggleSetting
          label="إضافة للسلة (AddToCart)"
          value={settings.tiktokTrackAddToCart ?? true}
          onChange={(value) => updateSetting("tiktokTrackAddToCart", value)}
        />
        <ToggleSetting
          label="بدء إتمام الطلب (InitiateCheckout)"
          value={settings.tiktokTrackInitiateCheckout ?? true}
          onChange={(value) =>
            updateSetting("tiktokTrackInitiateCheckout", value)
          }
        />
        <ToggleSetting
          label="إتمام الدفع (CompletePayment)"
          value={settings.tiktokTrackPurchase ?? true}
          onChange={(value) => updateSetting("tiktokTrackPurchase", value)}
        />
        <ToggleSetting
          label="بحث (Search)"
          value={settings.tiktokTrackSearch ?? true}
          onChange={(value) => updateSetting("tiktokTrackSearch", value)}
        />
        <ToggleSetting
          label="إضافة للمفضلة (AddToWishlist)"
          value={settings.tiktokTrackAddToWishlist ?? false}
          onChange={(value) => updateSetting("tiktokTrackAddToWishlist", value)}
        />
      </SettingsSection>

      <SettingsSection
        title="Events API"
        icon={ShieldCheckIcon}
        enabled={settings.tiktokEventsApiEnabled ?? false}
        onToggle={(value) => updateSetting("tiktokEventsApiEnabled", value)}
        helperText="إعدادات إرسال الأحداث من الخادم (اختياري)"
      >
        <InputSetting
          label="Access Token"
          value={settings.tiktokEventsApiToken || ""}
          onChange={(value) => updateSetting("tiktokEventsApiToken", value)}
          placeholder="أدخل Access Token"
        />
        <InputSetting
          label="Test Event Code"
          value={settings.tiktokEventsApiTestCode || ""}
          onChange={(value) => updateSetting("tiktokEventsApiTestCode", value)}
          placeholder="اختياري"
        />
      </SettingsSection>
    </SettingsPageLayout>
  );
};

export default TikTokPixelSettings;
