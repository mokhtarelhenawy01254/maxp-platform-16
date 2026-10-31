import React from "react";
import {
  useOrderConfirmationSettingsController,
  OrderConfirmationRulesSection,
  OrderConfirmationDistributionSection,
  OrderConfirmationEligibleUsersCard,
  OrderConfirmationCustomRulesSection,
  OrderConfirmationCallCycleCard,
  OrderConfirmationVoiceCard,
  OrderConfirmationSaveBar,
} from "./order-confirmation";

const OrderConfirmationSettings: React.FC = () => {
  const {
    loading,
    saving,
    settings,
    setSettings,
    eligibleUsers,
    products,
    eligibleUserSearch,
    setEligibleUserSearch,
    regionRules,
    productRules,
    orderValueRules,
    toggleArrayValue,
    toggleEligibleUser,
    selectFilteredEligibleUsers,
    allowAllEligibleUsers,
    removeHiddenEligibleUsers,
    handleSave,
    updateRegionRule,
    removeRegionRule,
    addRegionRule,
    updateProductRule,
    removeProductRule,
    addProductRule,
    updateValueRule,
    removeValueRule,
    addValueRule,
    hiddenEligibleUserIds,
    selectedDistributionUsers,
    isRestrictedToSpecificUsers,
    filteredEligibleUsers,
    visuallyIncludedUserIds,
    userOptions,
    regionOptions,
    productOptions,
  } = useOrderConfirmationSettingsController();

  if (loading) {
    return <div className="p-6 text-sm text-slate-500">جاري التحميل...</div>;
  }

  if (!settings) {
    return <div className="p-6 text-sm text-slate-500">تعذر تحميل الإعدادات</div>;
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">إعدادات التأكيد والتوزيع</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          تحكم في قواعد التأكيد الآلي وتوزيع الطلبات على الفريق.
        </p>
      </div>

      <OrderConfirmationRulesSection
        enabled={settings.enabled}
        requireSourceTypes={settings.requireSourceTypes}
        requireStatuses={settings.requireStatuses}
        requireMatchMode={settings.requireMatchMode || "any"}
        confirmStatus={settings.confirmStatus}
        onToggleEnabled={() => setSettings({ ...settings, enabled: !settings.enabled })}
        onToggleArrayValue={(key, val) => toggleArrayValue(key, val)}
        onChangeMatchMode={(mode) => setSettings({ ...settings, requireMatchMode: mode })}
        onChangeConfirmStatus={(status) => setSettings({ ...settings, confirmStatus: status })}
      />

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 space-y-4">
        <OrderConfirmationDistributionSection
          distributionEnabled={settings.distributionEnabled}
          distributionStrategy={settings.distributionStrategy}
          eligibleRoles={settings.eligibleRoles}
          onToggleDistributionEnabled={() =>
            setSettings({ ...settings, distributionEnabled: !settings.distributionEnabled })
          }
          onChangeStrategy={(strategy) =>
            setSettings({ ...settings, distributionStrategy: strategy })
          }
          onToggleRole={(role) => toggleArrayValue("eligibleRoles", role)}
        />

        <OrderConfirmationEligibleUsersCard
          distributionEnabled={settings.distributionEnabled}
          eligibleUsers={eligibleUsers}
          isRestrictedToSpecificUsers={isRestrictedToSpecificUsers}
          eligibleUserSearch={eligibleUserSearch}
          setEligibleUserSearch={setEligibleUserSearch}
          onAllowAllEligibleUsers={allowAllEligibleUsers}
          onRestrictToSpecificUsers={() => {
            if (!isRestrictedToSpecificUsers && eligibleUsers.length) {
              toggleEligibleUser(eligibleUsers[0].id);
            }
          }}
          onSelectFilteredEligibleUsers={selectFilteredEligibleUsers}
          onRemoveHiddenEligibleUsers={removeHiddenEligibleUsers}
          hiddenEligibleUserIdsCount={hiddenEligibleUserIds.length}
          selectedDistributionUsers={selectedDistributionUsers}
          filteredEligibleUsers={filteredEligibleUsers}
          visuallyIncludedUserIds={visuallyIncludedUserIds}
          onToggleEligibleUser={toggleEligibleUser}
        />

        <OrderConfirmationCustomRulesSection
          regionRules={regionRules}
          regionOptions={regionOptions}
          userOptions={userOptions}
          onUpdateRegionRule={updateRegionRule}
          onRemoveRegionRule={removeRegionRule}
          onAddRegionRule={addRegionRule}
          productRules={productRules}
          productOptions={productOptions}
          hasProducts={products.length > 0}
          onUpdateProductRule={updateProductRule}
          onRemoveProductRule={removeProductRule}
          onAddProductRule={addProductRule}
          orderValueRules={orderValueRules}
          onUpdateValueRule={updateValueRule}
          onRemoveValueRule={removeValueRule}
          onAddValueRule={addValueRule}
        />
      </div>

      <OrderConfirmationCallCycleCard
        maxCallsNoAnswer={settings.maxCallsNoAnswer ?? 3}
        intervalMinutes={settings.intervalMinutes ?? 30}
        onChangeMaxCalls={(val) => setSettings({ ...settings, maxCallsNoAnswer: val })}
        onChangeIntervalMinutes={(val) => setSettings({ ...settings, intervalMinutes: val })}
      />

      <OrderConfirmationVoiceCard />

      <OrderConfirmationSaveBar saving={saving} onSave={handleSave} />
    </div>
  );
};

export default OrderConfirmationSettings;