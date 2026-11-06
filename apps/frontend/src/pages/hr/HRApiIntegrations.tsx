import React from "react";
import {
  useHRApiIntegrationsController,
  HRApiHeaderAndTabs,
  HRApiKeysTab,
  HRApiWebhooksTab,
  HRApiDocsTab,
  HRApiCreateKeyModal,
} from "./hr-api-integrations/index";

export default function HRApiIntegrations() {
  const {
    activeTab,
    setActiveTab,
    keys,
    webhooks,
    loading,
    showCreateModal,
    newKeyName,
    setNewKeyName,
    selectedScopes,
    setSelectedScopes,
    newlyCreatedRawKey,
    copiedKey,
    newHookName,
    setNewHookName,
    newHookUrl,
    setNewHookUrl,
    isSubmittingHook,
    isDownloadingSpec,
    handleDownloadOpenApi,
    handleCreateKey,
    handleRevokeKey,
    handleCreateWebhook,
    copyToClipboard,
    openCreateModal,
    closeCreateModal,
  } = useHRApiIntegrationsController();

  return (
    <div className="space-y-6 w-full pb-8">
      <HRApiHeaderAndTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        keysCount={keys.length}
        onOpenCreateModal={openCreateModal}
      />

      {activeTab === "keys" && (
        <HRApiKeysTab loading={loading} keys={keys} onRevokeKey={handleRevokeKey} />
      )}

      {activeTab === "webhooks" && (
        <HRApiWebhooksTab
          webhooks={webhooks}
          newHookName={newHookName}
          onNewHookNameChange={setNewHookName}
          newHookUrl={newHookUrl}
          onNewHookUrlChange={setNewHookUrl}
          isSubmittingHook={isSubmittingHook}
          onCreateWebhook={handleCreateWebhook}
        />
      )}

      {activeTab === "docs" && (
        <HRApiDocsTab
          isDownloadingSpec={isDownloadingSpec}
          onDownloadOpenApi={handleDownloadOpenApi}
        />
      )}

      <HRApiCreateKeyModal
        open={showCreateModal}
        newKeyName={newKeyName}
        onNewKeyNameChange={setNewKeyName}
        selectedScopes={selectedScopes}
        onSelectedScopesChange={setSelectedScopes}
        newlyCreatedRawKey={newlyCreatedRawKey}
        copiedKey={copiedKey}
        onCopyToClipboard={copyToClipboard}
        onCreateKey={handleCreateKey}
        onClose={closeCreateModal}
      />
    </div>
  );
}
