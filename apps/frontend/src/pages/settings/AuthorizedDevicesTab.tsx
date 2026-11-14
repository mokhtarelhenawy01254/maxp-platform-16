import React from "react";
import {
  useAuthorizedDevicesController,
  AuthorizedDevicesHeader,
  AuthorizedDevicesRulesBanner,
  AuthorizedDevicesFilterToolbar,
  AuthorizedDevicesTable,
} from "./authorized-devices";
import { AppVersionSettingsCard } from "../../components/settings/AppVersionSettingsCard";

export const AuthorizedDevicesTab: React.FC = () => {
  const {
    devices,
    loading,
    search,
    setSearch,
    filterType,
    setFilterType,
    updatingId,
    copiedId,
    fetchDevices,
    handleToggleDeviceType,
    handleToggleApproval,
    handleDeleteDevice,
    handleCopyFingerprint,
  } = useAuthorizedDevicesController();

  return (
    <div className="space-y-6 max-w-6xl">
      <AuthorizedDevicesHeader loading={loading} onRefresh={fetchDevices} />
      <AuthorizedDevicesRulesBanner />
      <AuthorizedDevicesFilterToolbar
        search={search}
        onSearchChange={setSearch}
        filterType={filterType}
        onFilterChange={setFilterType}
      />
      <AuthorizedDevicesTable
        devices={devices}
        loading={loading}
        updatingId={updatingId}
        copiedId={copiedId}
        onToggleDeviceType={handleToggleDeviceType}
        onToggleApproval={handleToggleApproval}
        onDeleteDevice={handleDeleteDevice}
        onCopyFingerprint={handleCopyFingerprint}
      />
      <AppVersionSettingsCard />
    </div>
  );
};

export default AuthorizedDevicesTab;
