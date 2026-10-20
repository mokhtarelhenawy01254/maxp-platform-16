import { useTranslation } from "react-i18next";
import { Loader2, RefreshCw, Save, X as XMarkIcon, CheckCircle2 } from "lucide-react";
import DentalPoliciesSection from "./settings/DentalPoliciesSection";
import DentalFinancialPoliciesSection from "./settings/DentalFinancialPoliciesSection";
import { SettingsNavigation } from "./settings/components/SettingsNavigation";
import { GeneralSettingsSection } from "./settings/sections/GeneralSettingsSection";
import { StagesSettingsSection } from "./settings/sections/StagesSettingsSection";
import { WhatsappSettingsSection } from "./settings/sections/WhatsappSettingsSection";
import { CustomFieldsSettingsSection } from "./settings/sections/CustomFieldsSettingsSection";
import { WagesSettingsSection } from "./settings/sections/WagesSettingsSection";
import { DunningSettingsSection } from "./settings/sections/DunningSettingsSection";
import { BillingSettingsSection } from "./settings/sections/BillingSettingsSection";
import { useDentalLabSettings } from "./settings/hooks/useDentalLabSettings";
import { sectionCardCls } from "./settings/types/settingsTypes";

export default function DentalLabSettingsTab() {
  const { t } = useTranslation();
  const {
    loading,
    saving,
    error,
    setError,
    activeSection,
    setActiveSection,
    dirtyMap,
    activeDirty,
    isInstantSection,
    handleRefresh,
    saveActive,
    labName,
    setLabName,
    address,
    setAddress,
    phone,
    setPhone,
    stageTemplates,
    updateStage,
    addStage,
    removeStage,
    readyTemplate,
    setReadyTemplate,
    receivedTemplate,
    setReceivedTemplate,
    overdueTemplate,
    setOverdueTemplate,
    customFields,
    setCustomFields,
    billingPolicy,
    setBillingPolicy,
    guards,
    setGuards,
    wageDefault,
    setWageDefault,
    dunningEnabled,
    setDunningEnabled,
    dunningAgingDays,
    setDunningAgingDays,
  } = useDentalLabSettings();

  const saveDisabled = loading || saving || !activeDirty;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("dentalLab.tabs.settings")}</h2>
          {activeDirty && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              {t("dentalLab.settings.unsavedChanges")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {t("dentalLab.common.refresh")}
          </button>
          {isInstantSection ? (
            <span className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-400 dark:text-gray-500">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              {t("dentalLab.settings.savedInstantly")}
            </span>
          ) : (
            <button
              onClick={saveActive}
              disabled={saveDisabled}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? t("dentalLab.common.saving") : t("dentalLab.common.save")}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded transition-colors"
            aria-label="Dismiss error"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-6 items-start">
        <SettingsNavigation
          activeSection={activeSection}
          onSelectSection={setActiveSection}
          dirtyMap={dirtyMap}
          loading={loading}
        />

        <div className="min-w-0 space-y-6">
          {loading ? (
            <div className={`${sectionCardCls} space-y-4`}>
              <div className="h-5 w-44 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="h-10 bg-gray-100 dark:bg-gray-700/50 rounded-lg animate-pulse" />
                <div className="h-10 bg-gray-100 dark:bg-gray-700/50 rounded-lg animate-pulse" />
                <div className="h-10 bg-gray-100 dark:bg-gray-700/50 rounded-lg animate-pulse" />
              </div>
              <div className="h-24 bg-gray-100 dark:bg-gray-700/50 rounded-lg animate-pulse" />
              <div className="h-24 bg-gray-100 dark:bg-gray-700/50 rounded-lg animate-pulse" />
            </div>
          ) : (
            <>
              {activeSection === "general" && (
                <GeneralSettingsSection
                  labName={labName}
                  setLabName={setLabName}
                  address={address}
                  setAddress={setAddress}
                  phone={phone}
                  setPhone={setPhone}
                />
              )}

              {activeSection === "policies" && <DentalPoliciesSection />}

              {activeSection === "financial" && <DentalFinancialPoliciesSection />}

              {activeSection === "stages" && (
                <StagesSettingsSection
                  stageTemplates={stageTemplates}
                  updateStage={updateStage}
                  addStage={addStage}
                  removeStage={removeStage}
                />
              )}

              {activeSection === "whatsapp" && (
                <WhatsappSettingsSection
                  readyTemplate={readyTemplate}
                  setReadyTemplate={setReadyTemplate}
                  receivedTemplate={receivedTemplate}
                  setReceivedTemplate={setReceivedTemplate}
                  overdueTemplate={overdueTemplate}
                  setOverdueTemplate={setOverdueTemplate}
                />
              )}

              {activeSection === "fields" && (
                <CustomFieldsSettingsSection
                  customFields={customFields}
                  setCustomFields={setCustomFields}
                  setError={setError}
                />
              )}

              {activeSection === "wages" && (
                <WagesSettingsSection
                  wageDefault={wageDefault}
                  setWageDefault={setWageDefault}
                />
              )}

              {activeSection === "dunning" && (
                <DunningSettingsSection
                  dunningAgingDays={dunningAgingDays}
                  setDunningAgingDays={setDunningAgingDays}
                  dunningEnabled={dunningEnabled}
                  setDunningEnabled={setDunningEnabled}
                />
              )}

              {activeSection === "billing" && (
                <BillingSettingsSection
                  billingPolicy={billingPolicy}
                  setBillingPolicy={setBillingPolicy}
                  guards={guards}
                  setGuards={setGuards}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
