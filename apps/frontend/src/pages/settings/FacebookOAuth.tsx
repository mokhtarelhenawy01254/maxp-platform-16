import React from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { getDirection } from "../../i18n";
import {
  useFacebookOAuthController,
  FacebookOAuthHeader,
  FacebookOAuthKPIs,
  FacebookOAuthAlerts,
  FacebookOAuthPagesToolbar,
  FacebookOAuthPagesList,
  FacebookOAuthConnectCard,
  FacebookSystemUserTokenCard,
} from "./facebook-oauth";

const FacebookOAuth: React.FC = () => {
  const { t } = useTranslation();
  const {
    user,
    isAuthenticated,
    loading,
    error,
    setError,
    success,
    setSuccess,
    oauthStatus,
    pages,
    skippedPages,
    forceDisconnecting,
    noPageGrants,
    affectedCompanies,
    reconsenting,
    selectedPageIds,
    connectedPagesCount,
    disconnectedPagesCount,
    allPagesSelected,
    selectedConnectedPageIds,
    selectedReconnectablePageIds,
    accountGroups,
    loadOAuthStatus,
    resolveSkippedPages,
    forceDisconnectPage,
    handleConnectFacebook,
    handleFullReconsent,
    handleDisconnectPages,
    handleHardDeletePages,
    handleReconnectPages,
    handleTogglePageSelection,
    handleToggleSelectAll,
  } = useFacebookOAuthController();

  if (!isAuthenticated) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
          <p className="text-sm text-muted-foreground">
            {t("facebookOAuth.mustLogin", "يجب تسجيل الدخول أولاً")}
          </p>
        </div>
      </div>
    );
  }

  const hasPages = pages.length > 0;

  return (
    <div
      className="mx-auto w-full max-w-7xl space-y-4 p-3 sm:space-y-6 sm:p-6"
      dir={getDirection()}
    >
      {/* 1. Unified Cockpit Header */}
      <FacebookOAuthHeader
        loading={loading}
        hasConnectedPages={hasPages}
        onConnect={handleConnectFacebook}
        onRefresh={() => void loadOAuthStatus()}
      />

      {/* 2. Telemetry Strip KPIs */}
      <FacebookOAuthKPIs
        connectedPagesCount={connectedPagesCount}
        disconnectedPagesCount={disconnectedPagesCount}
        accountsCount={oauthStatus?.accounts?.length || 0}
        facebookUser={oauthStatus?.facebookUser}
      />

      {/* 3. Actionable Feedback & Status Alerts */}
      <FacebookOAuthAlerts
        success={success}
        error={error}
        skippedPages={skippedPages}
        noPageGrants={noPageGrants}
        affectedCompanies={affectedCompanies}
        reconsenting={reconsenting}
        forceDisconnecting={forceDisconnecting}
        userRole={user?.role}
        onDismissSuccess={() => setSuccess(null)}
        onDismissError={() => setError(null)}
        onResolveSkipped={() => void resolveSkippedPages()}
        onForceDisconnectPage={(pageId) => void forceDisconnectPage(pageId)}
        onFullReconsent={() => void handleFullReconsent()}
      />

      {/* 4. Active Workspace Body */}
      {hasPages ? (
        <div className="space-y-3">
          <FacebookOAuthPagesToolbar
            totalCount={pages.length}
            selectedCount={selectedPageIds.length}
            allPagesSelected={allPagesSelected}
            selectedReconnectableCount={selectedReconnectablePageIds.length}
            selectedConnectedCount={selectedConnectedPageIds.length}
            loading={loading}
            onToggleSelectAll={handleToggleSelectAll}
            onReconnectSelected={() =>
              void handleReconnectPages(selectedReconnectablePageIds)
            }
            onDisconnectSelected={() =>
              void handleDisconnectPages(selectedConnectedPageIds)
            }
            onHardDeleteSelected={() =>
              void handleHardDeletePages(selectedPageIds)
            }
          />

          <FacebookOAuthPagesList
            accountGroups={accountGroups}
            selectedPageIds={selectedPageIds}
            loading={loading}
            onToggleSelect={handleTogglePageSelection}
            onReconnect={(pageId) => void handleReconnectPages([pageId])}
            onDisconnect={(pageId) => void handleDisconnectPages([pageId])}
            onHardDelete={(pageId) => void handleHardDeletePages([pageId])}
          />
        </div>
      ) : (
        <FacebookOAuthConnectCard
          loading={loading}
          hasCompanyId={Boolean(user?.companyId)}
          onConnect={handleConnectFacebook}
        />
      )}

      {/* 5. System User Token (advanced, collapsed by default) */}
      <FacebookSystemUserTokenCard companyId={user?.companyId} userRole={user?.role} />
    </div>
  );
};

export default FacebookOAuth;
