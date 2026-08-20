import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  BadgePercent,
  Gift,
  PackageCheck,
  RefreshCcw,
  Save,
  Sparkles,
  Truck,
  Wand2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import {
  SettingsLoadingState,
  SettingsPageHero,
  SettingsPageShell,
  SettingsSection,
  SettingsStatusAlert,
} from "./components/SettingsPagePrimitives";
import {
  getApiErrorMessage,
  getNumericValue,
} from "./components/settingsPageUtils";
import { apiClient } from "../../services/apiClient";
import { storefrontSettingsService } from "../../services/storefrontSettingsService";

type PromotionMessageState = {
  type: "success" | "error";
  text: string;
};

type PromotionTabValue =
  | "promotion"
  | "volume-discounts"
  | "delivery-options"
  | "recommendations";

type FreeShippingSettings = {
  freeShippingEnabled: boolean;
  freeShippingThreshold: number;
  freeShippingMessage: string;
};

type FlatShippingSettings = {
  flatShippingEnabled: boolean;
  flatShippingFee: number;
};

const PROMOTION_ROUTE_MAP: Record<PromotionTabValue, string | null> = {
  promotion: null,
  "volume-discounts": "/settings/volume-discounts",
  "delivery-options": "/settings/delivery-options",
  recommendations: "/settings/recommendations",
};

const PromotionSettings: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState<PromotionTabValue>("promotion");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<PromotionMessageState | null>(null);

  const DEFAULT_FREE_SHIPPING_MESSAGE = t("promotionSettings.defaultFreeMessage");

  const PROMOTION_TABS: Array<{
    value: PromotionTabValue;
    label: string;
    description: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  }> = [
    {
      value: "promotion",
      label: t("promotionSettings.tabFreeShipping"),
      description: t("promotionSettings.tabFreeShippingDesc"),
      icon: Truck,
    },
    {
      value: "volume-discounts",
      label: t("promotionSettings.tabVolumeDiscounts"),
      description: t("promotionSettings.tabVolumeDiscountsDesc"),
      icon: BadgePercent,
    },
    {
      value: "delivery-options",
      label: t("promotionSettings.tabDeliveryOptions"),
      description: t("promotionSettings.tabDeliveryOptionsDesc"),
      icon: PackageCheck,
    },
    {
      value: "recommendations",
      label: t("promotionSettings.tabRecommendations"),
      description: t("promotionSettings.tabRecommendationsDesc"),
      icon: Wand2,
    },
  ];

  const [freeShippingSettings, setFreeShippingSettings] =
    useState<FreeShippingSettings>({
      freeShippingEnabled: false,
      freeShippingThreshold: 0,
      freeShippingMessage: DEFAULT_FREE_SHIPPING_MESSAGE,
    });

  const [flatShippingSettings, setFlatShippingSettings] =
    useState<FlatShippingSettings>({
      flatShippingEnabled: false,
      flatShippingFee: 0,
    });

  const [hideUtilityBar, setHideUtilityBar] = useState(false);
  const [utilityBarSaving, setUtilityBarSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/promotion-settings");

      if (response.data.success) {
        const data = response.data.data || {};
        setFreeShippingSettings({
          freeShippingEnabled: Boolean(data.freeShippingEnabled),
          freeShippingThreshold: getNumericValue(data.freeShippingThreshold),
          freeShippingMessage:
            typeof data.freeShippingMessage === "string" &&
            data.freeShippingMessage.trim()
              ? data.freeShippingMessage
              : t("promotionSettings.defaultFreeMessage"),
        });
        setFlatShippingSettings({
          flatShippingEnabled: Boolean(data.flatShippingEnabled),
          flatShippingFee: getNumericValue(data.flatShippingFee),
        });
      }

      try {
        const sfRes = await storefrontSettingsService.getSettings(undefined, { allowFallback: false });
        setHideUtilityBar(sfRes.data.hideUtilityBar === true);
      } catch {
        // non-blocking
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      setMessage({
        type: "error",
        text: getApiErrorMessage(error, t("promotionSettings.loadFailed")),
      });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const previewMessage = useMemo(
    () =>
      freeShippingSettings.freeShippingMessage.replace(
        "{amount}",
        String(freeShippingSettings.freeShippingThreshold || 0),
      ),
    [
      freeShippingSettings.freeShippingMessage,
      freeShippingSettings.freeShippingThreshold,
    ],
  );

  const handleTabChange = useCallback(
    (nextTab: string) => {
      const normalizedTab = nextTab as PromotionTabValue;
      const destination = PROMOTION_ROUTE_MAP[normalizedTab];

      setCurrentTab(normalizedTab);

      if (destination) {
        navigate(destination);
      }
    },
    [navigate],
  );

  const handleSavePromotionSettings = useCallback(async () => {
    try {
      setSaving(true);
      setMessage(null);

      const response = await apiClient.post("/promotion-settings", {
        ...freeShippingSettings,
        ...flatShippingSettings,
      });

      if (response.data.success) {
        setMessage({
          type: "success",
          text: t("promotionSettings.settingsSaved"),
        });
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage({
        type: "error",
        text: getApiErrorMessage(error, t("promotionSettings.settingsSaveFailed")),
      });
    } finally {
      setSaving(false);
    }
  }, [flatShippingSettings, freeShippingSettings, t]);

  const handleResetSettings = useCallback(async () => {
    if (
      !window.confirm(t("promotionSettings.resetConfirm"))
    ) {
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const response = await apiClient.post("/promotion-settings/reset", {});

      if (response.data.success) {
        await loadSettings();
        setMessage({
          type: "success",
          text: t("promotionSettings.settingsReset"),
        });
      }
    } catch (error) {
      console.error("Error resetting settings:", error);
      setMessage({
        type: "error",
        text: getApiErrorMessage(error, t("promotionSettings.settingsResetFailed")),
      });
    } finally {
      setSaving(false);
    }
  }, [loadSettings, t]);

  const handleToggleUtilityBar = useCallback(async (value: boolean) => {
    setHideUtilityBar(value);
    setUtilityBarSaving(true);
    try {
      await storefrontSettingsService.updateSettings({ hideUtilityBar: value });
    } catch {
      setHideUtilityBar(!value);
    } finally {
      setUtilityBarSaving(false);
    }
  }, []);

  if (loading) {
    return (
      <SettingsLoadingState
        title={t("promotionSettings.loadingTitle")}
        description={t("promotionSettings.loadingDescription")}
      />
    );
  }

  return (
    <SettingsPageShell>
      <SettingsPageHero
        badgeIcon={Sparkles}
        badgeLabel={t("promotionSettings.badgeLabel")}
        title={t("promotionSettings.pageTitle")}
        description={t("promotionSettings.pageDescription")}
        summaryItems={[
          {
            label: t("promotionSettings.freeShipping"),
            value: freeShippingSettings.freeShippingEnabled
              ? t("promotionSettings.freeShippingActive")
              : t("promotionSettings.freeShippingInactive"),
          },
          {
            label: t("promotionSettings.flatShippingTitle"),
            value: flatShippingSettings.flatShippingEnabled
              ? `${flatShippingSettings.flatShippingFee} ${t("promotionSettings.freeShippingThreshold").includes("EGP") ? "EGP" : "ج.م"}`
              : t("promotionSettings.freeShippingInactive"),
          },
        ]}
      />

      <div className="space-y-6 px-6 py-6">
        <SettingsStatusAlert
          message={message}
          onDismiss={() => setMessage(null)}
        />

        <Tabs
          value={currentTab}
          onValueChange={handleTabChange}
          className="gap-5"
        >
          <TabsList
            variant="line"
            className="h-auto w-full !grid grid-cols-1 gap-2 rounded-none border-b border-slate-200/70 bg-transparent p-0 pb-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            {PROMOTION_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.value;

              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    "group min-h-[74px] w-full rounded-2xl border px-4 py-3 text-right text-sm font-semibold transition-colors",
                    isActive
                      ? "!border-slate-900 !bg-slate-900 !text-white shadow-sm"
                      : "!border-transparent !bg-slate-50/65 !text-slate-500 hover:!border-slate-200 hover:!bg-slate-50",
                  )}
                >
                  <div className="flex w-full items-start gap-3">
                    <div
                      className={cn(
                        "mt-0.5 rounded-xl p-2 ring-1 transition",
                        isActive
                          ? "bg-white/10 text-white ring-white/15"
                          : "bg-white/90 text-slate-700 ring-slate-200/80",
                      )}
                    >
                      <Icon className="size-4.5" />
                    </div>
                    <div className="min-w-0 text-right">
                      <div className="font-bold">{tab.label}</div>
                      <div
                        className={cn(
                          "mt-1 text-xs font-medium leading-5",
                          isActive ? "text-slate-200" : "text-slate-400",
                        )}
                      >
                        {tab.description}
                      </div>
                    </div>
                  </div>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="promotion" className="space-y-5 pt-0">
            <SettingsSection
              icon={Gift}
              title={t("promotionSettings.freeShipping")}
              description={t("promotionSettings.freeShippingDesc")}
              accentClassName="bg-emerald-50 text-emerald-700 ring-emerald-200/70"
            >
                <div
                  className={cn(
                    "rounded-[22px] border p-4 transition-colors",
                    freeShippingSettings.freeShippingEnabled
                      ? "border-emerald-200 bg-emerald-50/70"
                      : "border-slate-200 bg-slate-50/70",
                  )}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-950">
                          {t("promotionSettings.freeShippingTitle")}
                        </h3>
                        <span
                          className={cn(
                            "rounded-full px-2 py-1 text-[11px] font-bold",
                            freeShippingSettings.freeShippingEnabled
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-600",
                          )}
                        >
                          {freeShippingSettings.freeShippingEnabled
                            ? t("promotionSettings.freeShippingActive")
                            : t("promotionSettings.freeShippingInactive")}
                        </span>
                      </div>
                      <p className="text-sm leading-6 text-slate-500">
                        {t("promotionSettings.freeShippingDesc")}
                      </p>
                    </div>
                    <Switch
                      aria-label={t("promotionSettings.freeShippingTitle")}
                      checked={freeShippingSettings.freeShippingEnabled}
                      onCheckedChange={(checked) =>
                        setFreeShippingSettings((currentSettings) => ({
                          ...currentSettings,
                          freeShippingEnabled: checked,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
                  <div className="space-y-2">
                    <Label htmlFor="freeShippingThreshold">
                      {t("promotionSettings.freeShippingThreshold")}
                    </Label>
                    <Input
                      id="freeShippingThreshold"
                      type="number"
                      min={0}
                      max={100000}
                      step={10}
                      value={freeShippingSettings.freeShippingThreshold}
                      onChange={(event) =>
                        setFreeShippingSettings((currentSettings) => ({
                          ...currentSettings,
                          freeShippingThreshold:
                            getNumericValue(event.target.value),
                        }))
                      }
                      readOnly={!freeShippingSettings.freeShippingEnabled}
                      className={cn(
                        "h-11 rounded-xl bg-white/90",
                        !freeShippingSettings.freeShippingEnabled &&
                          "bg-slate-50/50 cursor-not-allowed",
                      )}
                    />
                    <p className="text-xs leading-5 text-slate-500">
                      {t("promotionSettings.freeShippingThresholdDesc")}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="freeShippingMessage">
                      {t("promotionSettings.freeShippingMessage")}
                    </Label>
                    <Textarea
                      id="freeShippingMessage"
                      rows={4}
                      value={freeShippingSettings.freeShippingMessage}
                      onChange={(event) =>
                        setFreeShippingSettings((currentSettings) => ({
                          ...currentSettings,
                          freeShippingMessage: event.target.value,
                        }))
                      }
                      readOnly={!freeShippingSettings.freeShippingEnabled}
                      className={cn(
                        "min-h-[132px] rounded-xl border-slate-200 bg-white/90 text-sm text-slate-950",
                        !freeShippingSettings.freeShippingEnabled &&
                          "bg-slate-50/50 cursor-not-allowed",
                      )}
                    />
                    <p className="text-xs leading-5 text-slate-500">
                      {t("promotionSettings.freeShippingMessageDesc")}
                    </p>
                  </div>
                </div>

                <div
                  className={cn(
                    "rounded-[22px] border border-dashed p-4",
                    freeShippingSettings.freeShippingEnabled
                      ? "border-emerald-300 bg-emerald-50/80"
                      : "border-slate-200 bg-slate-50/80",
                  )}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {t("promotionSettings.freeShippingPreview")}
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-7 text-slate-900">
                    {previewMessage}
                  </p>
                  {!freeShippingSettings.freeShippingEnabled && (
                    <p className="mt-2 text-xs text-slate-500">
                      {t("promotionSettings.freeShippingPreviewInactive")}
                    </p>
                  )}
                </div>
            </SettingsSection>

            <SettingsSection
              icon={Sparkles}
              title={t("promotionSettings.hideTopBarTitle")}
              description={t("promotionSettings.hideTopBarDesc")}
              accentClassName="bg-amber-50 text-amber-700 ring-amber-200/70"
            >
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-950">
                      {t("promotionSettings.hideTopBarTitle")}
                    </h3>
                    <p className="text-sm leading-6 text-slate-500">
                      {t("promotionSettings.hideTopBarDesc")}
                    </p>
                  </div>
                  <Switch
                    aria-label={t("promotionSettings.hideTopBarTitle")}
                    checked={hideUtilityBar}
                    disabled={utilityBarSaving}
                    onCheckedChange={(checked) => { void handleToggleUtilityBar(checked); }}
                  />
                </div>
              </div>
            </SettingsSection>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-dashed border-slate-200/60" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-slate-50/65 text-slate-400 font-medium">
                  {t("promotionSettings.pricingSettings")}
                </span>
              </div>
            </div>

            <SettingsSection
              icon={Truck}
              title={t("promotionSettings.flatShippingTitle")}
              description={t("promotionSettings.flatShippingDesc")}
              accentClassName="bg-sky-50 text-sky-700 ring-sky-200/70"
            >
                <div
                  className={cn(
                    "rounded-[22px] border p-4 transition-colors",
                    flatShippingSettings.flatShippingEnabled
                      ? "border-sky-200 bg-sky-50/70"
                      : "border-slate-200 bg-slate-50/70",
                  )}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-950">
                          {t("promotionSettings.flatShippingEnabled")}
                        </h3>
                        <span
                          className={cn(
                            "rounded-full px-2 py-1 text-[11px] font-bold",
                            flatShippingSettings.flatShippingEnabled
                              ? "bg-sky-100 text-sky-700"
                              : "bg-slate-200 text-slate-600",
                          )}
                        >
                          {flatShippingSettings.flatShippingEnabled
                            ? t("promotionSettings.flatShippingPricing")
                            : t("promotionSettings.flatShippingRegional")}
                        </span>
                      </div>
                      <p className="text-sm leading-6 text-slate-500">
                        {t("promotionSettings.flatShippingEnabledDesc")}
                      </p>
                    </div>
                    <Switch
                      aria-label={t("promotionSettings.flatShippingEnabled")}
                      checked={flatShippingSettings.flatShippingEnabled}
                      onCheckedChange={(checked) =>
                        setFlatShippingSettings((currentSettings) => ({
                          ...currentSettings,
                          flatShippingEnabled: checked,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
                  <div className="space-y-2">
                    <Label htmlFor="flatShippingFee">
                      {t("promotionSettings.flatShippingFee")}
                    </Label>
                    <Input
                      id="flatShippingFee"
                      type="number"
                      min={0}
                      max={10000}
                      step={5}
                      value={flatShippingSettings.flatShippingFee}
                      onChange={(event) =>
                        setFlatShippingSettings((currentSettings) => ({
                          ...currentSettings,
                          flatShippingFee: getNumericValue(event.target.value),
                        }))
                      }
                      readOnly={!flatShippingSettings.flatShippingEnabled}
                      className={cn(
                        "h-11 rounded-xl bg-white/90",
                        !flatShippingSettings.flatShippingEnabled &&
                          "bg-slate-50/50 cursor-not-allowed",
                      )}
                    />
                    <p className="text-xs leading-5 text-slate-500">
                      {t("promotionSettings.flatShippingFeeDesc")}
                    </p>
                  </div>

                  <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-white p-2 text-slate-700 ring-1 ring-slate-200/70">
                        <PackageCheck className="size-5" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-bold text-slate-950">
                          {t("promotionSettings.flatShippingWhenToUse")}
                        </h4>
                        <ul className="space-y-1 text-sm leading-6 text-slate-500">
                          <li>
                            {t("promotionSettings.flatShippingUseCase1")}
                          </li>
                          <li>
                            {t("promotionSettings.flatShippingUseCase2")}
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
            </SettingsSection>

            <Separator />

            <div className="flex flex-col gap-4 rounded-[24px] border border-slate-200/70 bg-slate-50/65 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-950">
                  {t("promotionSettings.saveApply")}
                </h3>
                <p className="text-sm leading-6 text-slate-500">
                  {t("promotionSettings.saveApplyDesc")}
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    void handleResetSettings();
                  }}
                  disabled={saving}
                  className="rounded-2xl"
                >
                  <RefreshCcw className="size-4" />
                  {t("promotionSettings.resetSettings")}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  onClick={() => {
                    void handleSavePromotionSettings();
                  }}
                  disabled={saving}
                  className="rounded-2xl bg-slate-950 text-white hover:bg-slate-800"
                >
                  <Save className={cn("size-4", saving && "animate-pulse")} />
                  {saving ? t("promotionSettings.savingSettings") : t("promotionSettings.saveSettings")}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </SettingsPageShell>
  );
};

export default PromotionSettings;
