import React from "react";
import {
  UserIcon,
  MapPinIcon,
  PlusIcon,
  SparklesIcon,
  Squares2X2Icon,
  CheckBadgeIcon
} from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { getDirection } from "../../i18n";
import { CheckoutFormSettings } from "../../services/checkoutFormSettingsService";
import { SelectSetting, ToggleSetting } from "../settings/SettingControls";
import {
  PDP_QUICK_ORDER_PLACEMENT_OPTIONS,
  PdpQuickOrderFieldKey,
  PdpQuickOrderSettings,
  PDP_QUICK_ORDER_SURFACE_MODE_OPTIONS,
} from "../../storefront/utils/pdpQuickOrderSettings";

interface CheckoutFormSectionProps {
  settings: Partial<CheckoutFormSettings>;
  onChange: (settings: Partial<CheckoutFormSettings>) => void;
  onSave: () => void;
  onReset: () => void;
  loading?: boolean;
  showLocalSave?: boolean;
  productPageCheckoutEnabled?: boolean;
  onProductPageCheckoutToggle?: (enabled: boolean) => void;
  pdpQuickOrderSettings?: PdpQuickOrderSettings;
  onPdpQuickOrderSettingsChange?: (settings: PdpQuickOrderSettings) => void;
}

export const CheckoutFormSection: React.FC<CheckoutFormSectionProps> = ({
  settings,
  onChange,
  onSave,
  onReset,
  loading = false,
  showLocalSave = true,
  productPageCheckoutEnabled,
  onProductPageCheckoutToggle,
  pdpQuickOrderSettings,
  onPdpQuickOrderSettingsChange,
}) => {
  const { t } = useTranslation();
  const handleToggle = (field: keyof CheckoutFormSettings, value: boolean) => {
    onChange({ ...settings, [field]: value });
  };

  const handleQuickOrderFieldToggle = (
    fieldKey: PdpQuickOrderFieldKey,
    settingKey: "enabled" | "required",
    value: boolean,
  ) => {
    if (!pdpQuickOrderSettings || !onPdpQuickOrderSettingsChange) {
      return;
    }

    const currentField = pdpQuickOrderSettings.fields[fieldKey];
    const nextField = {
      ...currentField,
      [settingKey]: value,
    };

    if (settingKey === "enabled" && !value) {
      nextField.required = false;
    }

    onPdpQuickOrderSettingsChange({
      ...pdpQuickOrderSettings,
      fields: {
        ...pdpQuickOrderSettings.fields,
        [fieldKey]: nextField,
      },
    });
  };

  const SectionHeader = ({ icon: Icon, title, description }: { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>, title: string, description: string }) => (
    <div className="flex items-center gap-4 mb-6">
      <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-500/20">
        <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div>
        <h4 className="text-base font-bold text-gray-900 dark:text-white leading-tight">{title}</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
      </div>
    </div>
  );

  const QuickOrderSettingRow = ({
    label,
    fieldKey,
    description,
  }: {
    label: string;
    fieldKey: PdpQuickOrderFieldKey;
    description: string;
  }) => {
    if (!pdpQuickOrderSettings) {
      return null;
    }

    const fieldSettings = pdpQuickOrderSettings.fields[fieldKey];

    return (
      <div className="group bg-white dark:bg-gray-800/50 rounded-2xl p-5 border border-gray-100 dark:border-gray-700/50 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900 dark:text-white">{label}</span>
              {fieldSettings.enabled && fieldSettings.required ? (
                <span className="px-1.5 py-0.5 text-[10px] bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md font-bold uppercase tracking-wider">{t("storeCheckout.required")}</span>
              ) : null}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
          </div>

          <div className="flex items-center gap-6 bg-gray-50 dark:bg-gray-900/40 p-2 px-4 rounded-xl shrink-0">
            <ToggleSetting
              label={t("storeCheckout.enable")}
              value={fieldSettings.enabled}
              onChange={(value) =>
                handleQuickOrderFieldToggle(fieldKey, "enabled", value)
              }
              disabled={loading}
            />

            {fieldSettings.enabled ? (
              <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-2" />
            ) : null}

            {fieldSettings.enabled ? (
              <ToggleSetting
                label={t("storeCheckout.mandatory")}
                value={fieldSettings.required}
                onChange={(value) =>
                  handleQuickOrderFieldToggle(fieldKey, "required", value)
                }
                disabled={loading}
              />
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  const SettingRow = ({ label, showKey, requireKey, description }: { label: string, showKey: keyof CheckoutFormSettings, requireKey?: keyof CheckoutFormSettings, description: string }) => (
    <div className="group bg-white dark:bg-gray-800/50 rounded-2xl p-5 border border-gray-100 dark:border-gray-700/50 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900 dark:text-white">{label}</span>
            {settings[showKey] && settings[requireKey!] && (
                <span className="px-1.5 py-0.5 text-[10px] bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md font-bold uppercase tracking-wider">{t("storeCheckout.required")}</span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
        </div>

        <div className="flex items-center gap-6 bg-gray-50 dark:bg-gray-900/40 p-2 px-4 rounded-xl shrink-0">
          <ToggleSetting
            label={t("storeCheckout.enable")}
            value={settings[showKey] as boolean}
            onChange={(val) => handleToggle(showKey, val)}
          />

          {requireKey && settings[showKey] && (
            <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-2" />
          )}

          {requireKey && settings[showKey] && (
            <ToggleSetting
              label={t("storeCheckout.mandatory")}
              value={settings[requireKey] as boolean}
              onChange={(val) => handleToggle(requireKey, val)}
            />
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-10" dir={getDirection()}>
      {typeof productPageCheckoutEnabled === "boolean" &&
      onProductPageCheckoutToggle ? (
        <section>
          <SectionHeader
            icon={SparklesIcon}
            title={t("storeCheckout.integrationTitle")}
            description={t("storeCheckout.integrationDesc")}
          />
          <div className="group bg-white dark:bg-gray-800/50 rounded-2xl p-5 border border-gray-100 dark:border-gray-700/50 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {t("storeCheckout.enableCheckoutFormLabel")}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t("storeCheckout.enableCheckoutFormHelp")}
                </p>
              </div>

              <div className="flex items-center gap-6 bg-gray-50 dark:bg-gray-900/40 p-2 px-4 rounded-xl shrink-0">
                <ToggleSetting
                  label={t("storeCheckout.enable")}
                  value={productPageCheckoutEnabled}
                  onChange={onProductPageCheckoutToggle}
                  disabled={loading}
                />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {pdpQuickOrderSettings && onPdpQuickOrderSettingsChange ? (
        <>
          <section>
            <SectionHeader
              icon={Squares2X2Icon}
              title={t("storeCheckout.formOrderTitle")}
              description={t("storeCheckout.formOrderDesc")}
            />
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="group bg-white dark:bg-gray-800/50 rounded-2xl p-5 border border-gray-100 dark:border-gray-700/50 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all duration-300">
                <SelectSetting
                  label={t("storeCheckout.formOrderPlacement")}
                  value={pdpQuickOrderSettings.placement}
                  onChange={(value) =>
                    onPdpQuickOrderSettingsChange({
                      ...pdpQuickOrderSettings,
                      placement:
                        value === "before-description"
                          ? "before-description"
                          : "after-description",
                    })
                  }
                  options={PDP_QUICK_ORDER_PLACEMENT_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  disabled={loading}
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {t("storeCheckout.formOrderPlacementDesc")}
                </p>
              </div>

              <div className="group bg-white dark:bg-gray-800/50 rounded-2xl p-5 border border-gray-100 dark:border-gray-700/50 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all duration-300">
                <SelectSetting
                  label={t("storeCheckout.formOrderSurfaceMode")}
                  value={pdpQuickOrderSettings.surfaceMode}
                  onChange={(value) =>
                    onPdpQuickOrderSettingsChange({
                      ...pdpQuickOrderSettings,
                      surfaceMode:
                        value === "merged-buybox"
                          ? "merged-buybox"
                          : "standalone",
                    })
                  }
                  options={PDP_QUICK_ORDER_SURFACE_MODE_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  disabled={loading}
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {t("storeCheckout.formOrderSurfaceModeDesc")}
                </p>
              </div>

              <div className="group bg-white dark:bg-gray-800/50 rounded-2xl p-5 border border-gray-100 dark:border-gray-700/50 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all duration-300 space-y-4">
                <ToggleSetting
                  label={t("storeCheckout.showQuantity")}
                  value={pdpQuickOrderSettings.showQuantity}
                  onChange={(value) =>
                    onPdpQuickOrderSettingsChange({
                      ...pdpQuickOrderSettings,
                      showQuantity: value,
                    })
                  }
                  disabled={loading}
                />
                <ToggleSetting
                  label={t("storeCheckout.showOrderSummary")}
                  value={pdpQuickOrderSettings.showOrderSummary}
                  onChange={(value) =>
                    onPdpQuickOrderSettingsChange({
                      ...pdpQuickOrderSettings,
                      showOrderSummary: value,
                    })
                  }
                  disabled={loading}
                />
              </div>
            </div>
          </section>

          <section>
            <SectionHeader
              icon={SparklesIcon}
              title={t("storeCheckout.formFieldsTitle")}
              description={t("storeCheckout.formFieldsDesc")}
            />
            <div className="grid gap-4">
              <QuickOrderSettingRow
                label={t("storeCheckout.pdpFullName")}
                fieldKey="fullName"
                description={t("storeCheckout.pdpFullNameDesc")}
              />
              <QuickOrderSettingRow
                label={t("storeCheckout.pdpPhone")}
                fieldKey="phone"
                description={t("storeCheckout.pdpPhoneDesc")}
              />
              <QuickOrderSettingRow
                label={t("storeCheckout.pdpGovernorate")}
                fieldKey="governorate"
                description={t("storeCheckout.pdpGovernorateDesc")}
              />
              <QuickOrderSettingRow
                label={t("storeCheckout.pdpAddress")}
                fieldKey="address"
                description={t("storeCheckout.pdpAddressDesc")}
              />
              <QuickOrderSettingRow
                label={t("storeCheckout.pdpAlternatePhone")}
                fieldKey="alternatePhone"
                description={t("storeCheckout.pdpAlternatePhoneDesc")}
              />
            </div>
          </section>
        </>
      ) : null}

      {/* Customer Info Section */}
      <section>
        <SectionHeader
          icon={UserIcon}
          title={t("storeCheckout.checkoutFullFieldsTitle")}
          description={t("storeCheckout.checkoutFullFieldsDesc")}
        />
        <div className="grid gap-4">
          <SettingRow
            label={t("storeCheckout.fullName")}
            showKey="showGuestName"
            requireKey="requireGuestName"
            description={t("storeCheckout.fullNameDesc")}
          />
          <SettingRow
            label={t("storeCheckout.phoneNumber")}
            showKey="showGuestPhone"
            requireKey="requireGuestPhone"
            description={t("storeCheckout.phoneNumberDesc")}
          />
          <SettingRow
            label={t("storeCheckout.email")}
            showKey="showGuestEmail"
            requireKey="requireGuestEmail"
            description={t("storeCheckout.emailDesc")}
          />
        </div>
      </section>

      {/* Shipping Address Section */}
      <section>
        <SectionHeader
          icon={MapPinIcon}
          title={t("storeCheckout.shippingTitle")}
          description={t("storeCheckout.shippingDesc")}
        />
        <div className="grid gap-4">
          <SettingRow
            label={t("storeCheckout.city")}
            showKey="showCity"
            requireKey="requireCity"
            description={t("storeCheckout.cityDesc")}
          />
          <SettingRow
            label={t("storeCheckout.address")}
            showKey="showShippingAddress"
            requireKey="requireShippingAddress"
            description={t("storeCheckout.addressDesc")}
          />
        </div>
      </section>

      {/* Additional Fields Section */}
      <section>
        <SectionHeader
          icon={PlusIcon}
          title={t("storeCheckout.additionalTitle")}
          description={t("storeCheckout.additionalDesc")}
        />
        <div className="grid gap-4">
          <SettingRow
            label={t("storeCheckout.paymentMethod")}
            showKey="showPaymentMethod"
            description={t("storeCheckout.paymentMethodDesc")}
          />
          <SettingRow
            label={t("storeCheckout.notes")}
            showKey="showNotes"
            description={t("storeCheckout.notesDesc")}
          />
        </div>
      </section>

      {showLocalSave && (
        <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-4 flex items-center justify-between border border-indigo-100 dark:border-indigo-500/10">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-sm">
                <CheckBadgeIcon className="h-5 w-5 text-white" />
              </div>
              <p className="text-sm font-medium text-indigo-900 dark:text-indigo-300">{t("storeCheckout.simplicityTip")}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onReset}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl border border-indigo-200 text-indigo-700 font-semibold hover:bg-white/70 transition-all disabled:opacity-50 dark:border-indigo-400/20 dark:text-indigo-200 dark:hover:bg-white/5"
              >
                {t("storeCheckout.reset")}
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={loading}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50"
              >
                {loading ? t("storeCheckout.saving") : t("storeCheckout.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
