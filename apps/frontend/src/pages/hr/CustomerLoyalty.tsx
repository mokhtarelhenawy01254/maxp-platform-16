import React from "react";
import {
  useCustomerLoyaltyController,
  CustomerLoyaltyHeader,
  CustomerLoyaltyStats,
  CustomerLoyaltyTabsBar,
  LoyaltyProgramsTab,
  LoyaltyCustomersTab,
  LoyaltyTiersTab,
  LoyaltyAnalyticsTab,
  LoyaltyCashbackTab,
} from "./customer-loyalty/index";

export const CustomerLoyalty: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    programs,
    customers,
    rawCustomersCount,
    tiers,
    isLoading,
    searchQuery,
    setSearchQuery,
    setShowCreateForm,
    cashbackSettings,
    cashbackDraft,
    isSavingCashback,
    walletStats,
    fetchLoyaltyData,
    saveCashbackSettings,
    updateCashbackField,
    updateTierOverride,
  } = useCustomerLoyaltyController();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[350px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-8" dir="rtl">
      {/* Header */}
      <CustomerLoyaltyHeader
        onRefresh={fetchLoyaltyData}
        onCreateProgram={() => setShowCreateForm(true)}
      />

      {/* KPI Stats Grid */}
      <CustomerLoyaltyStats
        programs={programs}
        customers={customers}
        tiers={tiers}
      />

      {/* Unified Tabs Container */}
      <div className="rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden">
        <CustomerLoyaltyTabsBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <div className="p-6">
          {activeTab === "programs" && (
            <LoyaltyProgramsTab
              programs={programs}
              onCreateProgram={() => setShowCreateForm(true)}
            />
          )}

          {activeTab === "customers" && (
            <LoyaltyCustomersTab
              customers={customers}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              rawCustomersCount={rawCustomersCount}
            />
          )}

          {activeTab === "tiers" && <LoyaltyTiersTab tiers={tiers} />}

          {activeTab === "analytics" && (
            <LoyaltyAnalyticsTab
              programs={programs}
              walletStats={walletStats}
            />
          )}

          {activeTab === "cashback" && (
            <LoyaltyCashbackTab
              cashbackSettings={cashbackSettings}
              cashbackDraft={cashbackDraft}
              tiers={tiers}
              isSaving={isSavingCashback}
              onSave={saveCashbackSettings}
              onUpdateField={updateCashbackField}
              onUpdateTierOverride={updateTierOverride}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerLoyalty;
