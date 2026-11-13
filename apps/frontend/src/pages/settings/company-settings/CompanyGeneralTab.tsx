import React from "react";
import { CompanyInfoSection } from "./CompanyInfoSection";
import { CompanyInboxProfileSection } from "./CompanyInboxProfileSection";
import { CompanyLogoSection } from "./CompanyLogoSection";
import { CompanyCurrencySection } from "./CompanyCurrencySection";
import { CompanyTimezoneSection } from "./CompanyTimezoneSection";
import { CompanySettingsController } from "./useCompanySettingsController";

type CompanyGeneralTabProps = Pick<
  CompanySettingsController,
  | "company"
  | "user"
  | "editingName"
  | "setEditingName"
  | "companyName"
  | "setCompanyName"
  | "savingName"
  | "handleCompanyNameSave"
  | "editingSlug"
  | "setEditingSlug"
  | "slug"
  | "setSlug"
  | "savingSlug"
  | "handleSlugSave"
  | "editingDescription"
  | "setEditingDescription"
  | "companyDescription"
  | "setCompanyDescription"
  | "savingDescription"
  | "handleCompanyDescriptionSave"
  | "customerRegisterUrl"
  | "logoPreview"
  | "uploadingLogo"
  | "handleLogoUpload"
  | "selectedCurrency"
  | "savingCurrency"
  | "handleCurrencyChange"
  | "currentTime"
  | "dateFormat"
  | "setDateFormat"
  | "dateFormatLoading"
  | "dateFormatError"
  | "formatDate"
  | "handleTimezoneChange"
  | "inboxVerticalProfile"
  | "savingInboxProfile"
  | "handleInboxProfileChange"
  | "businessSpecialtyId"
  | "savingSpecialty"
  | "handleSpecialtyChange"
>;

export const CompanyGeneralTab: React.FC<CompanyGeneralTabProps> = ({
  company,
  user,
  editingName,
  setEditingName,
  companyName,
  setCompanyName,
  savingName,
  handleCompanyNameSave,
  editingSlug,
  setEditingSlug,
  slug,
  setSlug,
  savingSlug,
  handleSlugSave,
  editingDescription,
  setEditingDescription,
  companyDescription,
  setCompanyDescription,
  savingDescription,
  handleCompanyDescriptionSave,
  customerRegisterUrl,
  logoPreview,
  uploadingLogo,
  handleLogoUpload,
  selectedCurrency,
  savingCurrency,
  handleCurrencyChange,
  currentTime,
  dateFormat,
  setDateFormat,
  dateFormatLoading,
  dateFormatError,
  formatDate,
  handleTimezoneChange,
  inboxVerticalProfile,
  savingInboxProfile,
  handleInboxProfileChange,
  businessSpecialtyId,
  savingSpecialty,
  handleSpecialtyChange,
}) => {
  return (
    <div className="space-y-6">
      <CompanyInfoSection
        company={company}
        companyIdFallback={user?.companyId}
        editingName={editingName}
        setEditingName={setEditingName}
        companyName={companyName}
        setCompanyName={setCompanyName}
        savingName={savingName}
        handleCompanyNameSave={handleCompanyNameSave}
        editingSlug={editingSlug}
        setEditingSlug={setEditingSlug}
        slug={slug}
        setSlug={setSlug}
        savingSlug={savingSlug}
        handleSlugSave={handleSlugSave}
        editingDescription={editingDescription}
        setEditingDescription={setEditingDescription}
        companyDescription={companyDescription}
        setCompanyDescription={setCompanyDescription}
        savingDescription={savingDescription}
        handleCompanyDescriptionSave={handleCompanyDescriptionSave}
        customerRegisterUrl={customerRegisterUrl}
      />

      <CompanyInboxProfileSection
        inboxVerticalProfile={inboxVerticalProfile}
        savingInboxProfile={savingInboxProfile}
        handleInboxProfileChange={handleInboxProfileChange}
        businessSpecialtyId={businessSpecialtyId}
        savingSpecialty={savingSpecialty}
        handleSpecialtyChange={handleSpecialtyChange}
        currentSpecialtyName={company?.businessSpecialty?.nameAr}
      />

      <CompanyLogoSection
        logoPreview={logoPreview}
        uploadingLogo={uploadingLogo}
        handleLogoUpload={handleLogoUpload}
      />

      <CompanyCurrencySection
        selectedCurrency={selectedCurrency}
        savingCurrency={savingCurrency}
        handleCurrencyChange={handleCurrencyChange}
      />

      <CompanyTimezoneSection
        timezone={company?.timezone}
        handleTimezoneChange={handleTimezoneChange}
        currentTime={currentTime}
        dateFormat={dateFormat}
        setDateFormat={setDateFormat}
        dateFormatLoading={dateFormatLoading}
        dateFormatError={dateFormatError}
        formatDate={formatDate}
      />
    </div>
  );
};
