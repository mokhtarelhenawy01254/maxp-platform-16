import React from "react";
import {
  CompanyAppearanceTab,
  CompanyGeneralTab,
  CompanyOwnershipTab,
  CompanySettingsHeader,
  CompanyUsageTab,
  useCompanySettingsController,
} from "./company-settings";

const CompanySettings: React.FC = () => {
  const ctrl = useCompanySettingsController();

  if (ctrl.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <CompanySettingsHeader
        activeTab={ctrl.activeTab}
        onTabChange={ctrl.setActiveTab}
        isOwner={ctrl.user?.role === "OWNER"}
      />

      {ctrl.activeTab === "general" && (
        <CompanyGeneralTab
          company={ctrl.company}
          user={ctrl.user}
          editingName={ctrl.editingName}
          setEditingName={ctrl.setEditingName}
          companyName={ctrl.companyName}
          setCompanyName={ctrl.setCompanyName}
          savingName={ctrl.savingName}
          handleCompanyNameSave={ctrl.handleCompanyNameSave}
          editingSlug={ctrl.editingSlug}
          setEditingSlug={ctrl.setEditingSlug}
          slug={ctrl.slug}
          setSlug={ctrl.setSlug}
          savingSlug={ctrl.savingSlug}
          handleSlugSave={ctrl.handleSlugSave}
          editingDescription={ctrl.editingDescription}
          setEditingDescription={ctrl.setEditingDescription}
          companyDescription={ctrl.companyDescription}
          setCompanyDescription={ctrl.setCompanyDescription}
          savingDescription={ctrl.savingDescription}
          handleCompanyDescriptionSave={ctrl.handleCompanyDescriptionSave}
          customerRegisterUrl={ctrl.customerRegisterUrl}
          logoPreview={ctrl.logoPreview}
          uploadingLogo={ctrl.uploadingLogo}
          handleLogoUpload={ctrl.handleLogoUpload}
          selectedCurrency={ctrl.selectedCurrency}
          savingCurrency={ctrl.savingCurrency}
          handleCurrencyChange={ctrl.handleCurrencyChange}
          currentTime={ctrl.currentTime}
          dateFormat={ctrl.dateFormat}
          setDateFormat={ctrl.setDateFormat}
          dateFormatLoading={ctrl.dateFormatLoading}
          dateFormatError={ctrl.dateFormatError}
          formatDate={ctrl.formatDate}
          handleTimezoneChange={ctrl.handleTimezoneChange}
          inboxVerticalProfile={ctrl.inboxVerticalProfile}
          savingInboxProfile={ctrl.savingInboxProfile}
          handleInboxProfileChange={ctrl.handleInboxProfileChange}
          businessSpecialtyId={ctrl.businessSpecialtyId}
          savingSpecialty={ctrl.savingSpecialty}
          handleSpecialtyChange={ctrl.handleSpecialtyChange}
        />
      )}

      {ctrl.activeTab === "appearance" && (
        <CompanyAppearanceTab
          sidebarLayout={ctrl.sidebarLayout}
          savingLayout={ctrl.savingLayout}
          handleLayoutChange={ctrl.handleLayoutChange}
        />
      )}

      {ctrl.activeTab === "usage" && (
        <CompanyUsageTab usage={ctrl.usage} />
      )}

      {ctrl.activeTab === "ownership" && ctrl.user?.role === "OWNER" && (
        <CompanyOwnershipTab
          users={ctrl.users}
          selectedNewOwner={ctrl.selectedNewOwner}
          setSelectedNewOwner={ctrl.setSelectedNewOwner}
          showTransferConfirm={ctrl.showTransferConfirm}
          setShowTransferConfirm={ctrl.setShowTransferConfirm}
          transferring={ctrl.transferring}
          handleTransferOwnership={ctrl.handleTransferOwnership}
        />
      )}
    </div>
  );
};

export default CompanySettings;
