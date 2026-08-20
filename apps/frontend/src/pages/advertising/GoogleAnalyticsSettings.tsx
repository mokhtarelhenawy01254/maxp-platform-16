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
      description="╪▒╪¿╪╖ Google Analytics ┘ê Google Ads ┘ä╪¬╪¬╪¿╪╣ ╪º┘ä╪▓┘è╪º╪▒╪º╪¬ ┘ê╪º┘ä╪¬╪¡┘ê┘è┘ä╪º╪¬"
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
        helperText="┘ü╪╣┘æ┘ä GA4 ┘ê╪ú╪»╪«┘ä Measurement ID ┘ä╪¬╪¬╪¿╪╣ ╪º┘ä╪▓┘è╪º╪▒╪º╪¬ ┘ê╪º┘ä╪ú╪¡╪»╪º╪½"
      >
        <InputSetting
          label="GA4 Measurement ID"
          value={settings.googleAnalyticsMeasurementId || ""}
          onChange={(value) => updateSetting("googleAnalyticsMeasurementId", value)}
          placeholder="┘à╪½╪º┘ä: G-XXXXXXX"
        />
      </SettingsSection>

      <SettingsSection
        title="╪ú╪¡╪»╪º╪½ Google Analytics"
        icon={RocketLaunchIcon}
        enabled={analyticsEnabled}
        onToggle={(value) => updateSetting("googleAnalyticsEnabled", value)}
        helperText="╪¬╪¡┘â┘à ┘ü┘è ╪º┘ä╪ú╪¡╪»╪º╪½ ╪º┘ä┘à╪▒╪│┘ä╪⌐ ╪Ñ┘ä┘ë Google Analytics"
      >
        <ToggleSetting
          label="╪¬╪¬╪¿╪╣ PageView"
          value={settings.googleAnalyticsTrackPageView ?? true}
          onChange={(value) => updateSetting("googleAnalyticsTrackPageView", value)}
        />
        <ToggleSetting
          label="╪¬╪¬╪¿╪╣ ┘à╪┤╪º┘ç╪»╪⌐ ╪º┘ä┘à┘å╪¬╪¼ (ViewContent)"
          value={settings.googleAnalyticsTrackViewContent ?? true}
          onChange={(value) => updateSetting("googleAnalyticsTrackViewContent", value)}
        />
        <ToggleSetting
          label="╪¬╪¬╪¿╪╣ ╪Ñ╪╢╪º┘ü╪⌐ ┘ä┘ä╪│┘ä╪⌐ (AddToCart)"
          value={settings.googleAnalyticsTrackAddToCart ?? true}
          onChange={(value) => updateSetting("googleAnalyticsTrackAddToCart", value)}
        />
        <ToggleSetting
          label="╪¬╪¬╪¿╪╣ ╪¿╪»╪í ╪º┘ä╪»┘ü╪╣ (InitiateCheckout)"
          value={settings.googleAnalyticsTrackInitiateCheckout ?? true}
          onChange={(value) => updateSetting("googleAnalyticsTrackInitiateCheckout", value)}
        />
        <ToggleSetting
          label="╪¬╪¬╪¿╪╣ ╪º┘ä╪┤╪▒╪º╪í (Purchase)"
          value={settings.googleAnalyticsTrackPurchase ?? true}
          onChange={(value) => updateSetting("googleAnalyticsTrackPurchase", value)}
        />
        <ToggleSetting
          label="╪¬╪¬╪¿╪╣ ╪º┘ä╪¿╪¡╪½ (Search)"
          value={settings.googleAnalyticsTrackSearch ?? true}
          onChange={(value) => updateSetting("googleAnalyticsTrackSearch", value)}
        />
      </SettingsSection>

      <SettingsSection
        title="Google Ads"
        icon={ShoppingCartIcon}
        enabled={adsEnabled}
        onToggle={(value) => updateSetting("googleAdsEnabled", value)}
        helperText="┘ü╪╣┘æ┘ä Google Ads ┘ê╪ú╪»╪«┘ä Conversion ID ┘ä╪¬╪¬╪¿╪╣ ╪¡┘à┘ä╪º╪¬┘â"
      >
        <InputSetting
          label="Google Ads Conversion ID"
          value={settings.googleAdsConversionId || ""}
          onChange={(value) => updateSetting("googleAdsConversionId", value)}
          placeholder="┘à╪½╪º┘ä: AW-XXXXXXX"
        />
      </SettingsSection>

      <SettingsSection
        title="┘à┘å╪╣ ╪º┘ä╪¬┘â╪▒╪º╪▒ ┘à╪╣ GTM"
        icon={ShieldCheckIcon}
        helperText="╪Ñ╪░╪º ┘â┘å╪¬ ╪¬╪╖┘ä┘é ╪ú┘â┘ê╪º╪» ╪¼┘ê╪¼┘ä ┘à┘å Google Tag Manager╪î ┘ü╪╣┘æ┘ä ╪«┘è╪º╪▒ ╪Ñ┘è┘é╪º┘ü ╪º┘ä╪¿┘â╪│┘ä╪º╪¬ ╪º┘ä┘à╪»┘à╪¼╪⌐ ┘ü┘è ╪╡┘ü╪¡╪⌐ GTM"
      >
        <p className="text-sm text-muted-foreground">
          ╪╣┘å╪» ╪¬┘ü╪╣┘è┘ä "╪Ñ┘è┘é╪º┘ü ╪º┘ä╪¿┘â╪│┘ä╪º╪¬ ╪º┘ä┘à╪»┘à╪¼╪⌐ ╪╣┘å╪» ╪¬╪┤╪║┘è┘ä GTM" ┘à┘å ╪╡┘ü╪¡╪⌐ Google Tag Manager╪î
          ┘ä┘å ┘è╪¬┘à ╪¬╪¡┘à┘è┘ä ╪ú┘â┘ê╪º╪» ╪¼┘ê╪¼┘ä ┘à╪¿╪º╪┤╪▒╪⌐ ┘ä╪¬╪¼┘å╪¿ ╪º┘ä╪¬┘â╪▒╪º╪▒.
        </p>
      </SettingsSection>
    </SettingsPageLayout>
  );
};

export default GoogleAnalyticsSettings;
