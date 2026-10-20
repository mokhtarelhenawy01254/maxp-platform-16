import React from "react";
import { useHRSettingsData } from "./settings/hooks/useHRSettingsData";
import { HRSettingsHeader } from "./settings/components/HRSettingsHeader";
import { HRSettingsSidebar } from "./settings/components/HRSettingsSidebar";
import { HRUnsavedDialog } from "./settings/components/HRUnsavedDialog";
import { HRWorkingHoursTab } from "./settings/components/HRWorkingHoursTab";
import { HRLeavesTab } from "./settings/components/HRLeavesTab";
import { HRPayrollTab } from "./settings/components/HRPayrollTab";
import { HRAllowancesTab } from "./settings/components/HRAllowancesTab";
import { HRAttendanceTab } from "./settings/components/HRAttendanceTab";
import { HRDisciplineTab } from "./settings/components/HRDisciplineTab";
import { HRProbationTab } from "./settings/components/HRProbationTab";
import { HREmploymentTab } from "./settings/components/HREmploymentTab";
import { HRRemoteWorkTab } from "./settings/components/HRRemoteWorkTab";
import { HRSecurityTab } from "./settings/components/HRSecurityTab";
import { HRNotificationsTab } from "./settings/components/HRNotificationsTab";

const HRSettings: React.FC = () => {
  const data = useHRSettingsData();

  if (data.loading) {
    return (
      <div
        className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center"
        dir="rtl"
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            جاري تحميل الإعدادات...
          </p>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (data.activeTab) {
      case "working-hours":
        return (
          <HRWorkingHoursTab
            settings={data.settings}
            errors={data.errors}
            onToggleWorkingDay={data.toggleWorkingDay}
          />
        );
      case "leaves":
        return (
          <HRLeavesTab
            settings={data.settings}
            setSettings={data.setSettings}
            errors={data.errors}
            setErrors={data.setErrors}
          />
        );
      case "payroll":
        return (
          <HRPayrollTab
            settings={data.settings}
            setSettings={data.setSettings}
            errors={data.errors}
            setErrors={data.setErrors}
          />
        );
      case "allowances":
        return (
          <HRAllowancesTab
            settings={data.settings}
            setSettings={data.setSettings}
          />
        );
      case "attendance":
        return (
          <HRAttendanceTab
            settings={data.settings}
            setSettings={data.setSettings}
            gettingLocation={data.gettingLocation}
            testingLocation={data.testingLocation}
            locationTestResult={data.locationTestResult}
            onGetCurrentLocation={data.getCurrentLocation}
            onTestCurrentLocation={data.testCurrentLocation}
            onOpenInGoogleMaps={data.openInGoogleMaps}
          />
        );
      case "discipline":
        return (
          <HRDisciplineTab
            settings={data.settings}
            setSettings={data.setSettings}
          />
        );
      case "probation":
        return (
          <HRProbationTab
            settings={data.settings}
            setSettings={data.setSettings}
            errors={data.errors}
            setErrors={data.setErrors}
          />
        );
      case "employment":
        return (
          <HREmploymentTab
            settings={data.settings}
            setSettings={data.setSettings}
          />
        );
      case "remote":
        return (
          <HRRemoteWorkTab
            settings={data.settings}
            setSettings={data.setSettings}
          />
        );
      case "security":
        return (
          <HRSecurityTab
            settings={data.settings}
            setSettings={data.setSettings}
          />
        );
      case "notifications":
        return (
          <HRNotificationsTab
            settings={data.settings}
            setSettings={data.setSettings}
            errors={data.errors}
            notificationHealth={data.notificationHealth}
            availableRecipientEmployees={data.availableRecipientEmployees}
            loadingRecipientEmployees={data.loadingRecipientEmployees}
            selectedRecipientEmployeeId={data.selectedRecipientEmployeeId}
            setSelectedRecipientEmployeeId={data.setSelectedRecipientEmployeeId}
            onAddSelectedRecipientEmployee={data.addSelectedRecipientEmployee}
            connectedSessionCount={data.connectedSessionCount}
            hasConnectedSession={data.hasConnectedSession}
            activeNotificationIssues={data.activeNotificationIssues}
            readyRecipientsCount={data.readyRecipientsCount}
            configuredAdditionalRecipientsCount={data.configuredAdditionalRecipientsCount}
            isWhatsAppDeliveryReady={data.isWhatsAppDeliveryReady}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
      <HRUnsavedDialog
        open={data.showUnsavedDialog}
        onCancel={data.cancelNavigation}
        onSaveFirst={data.handleSave}
        onConfirmWithoutSave={data.confirmNavigation}
      />

      <HRSettingsHeader
        loading={data.loading}
        saving={data.saving}
        hasUnsavedChanges={data.hasUnsavedChangesValue}
        errors={data.errors}
        onClearErrors={() => data.setErrors({})}
        onRefresh={data.fetchSettings}
        onSave={data.handleSave}
      />

      <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          <HRSettingsSidebar
            activeTab={data.activeTab}
            onTabChange={data.handleTabChange}
            searchQuery={data.searchQuery}
            onSearchChange={data.setSearchQuery}
          />
          <div className="flex-1 min-w-0">{renderTabContent()}</div>
        </div>
      </div>
    </div>
  );
};

export default HRSettings;
