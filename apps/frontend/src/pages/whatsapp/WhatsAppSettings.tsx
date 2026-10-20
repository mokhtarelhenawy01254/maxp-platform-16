import React, { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Clock,
  Copy,
  Database,
  Globe,
  Lock,
  Plus,
  RefreshCw,
  Settings,
  Smartphone,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { WhatsAppPageShell } from "./components/WhatsAppPageShell";
import { WindowPolicySettingsTab } from "./components/WindowPolicySettingsTab";
import {
  TabDefinition,
  TabId,
  WhatsAppSettingsProps,
  tabsRequiringScopedSession,
} from "./settings/types/whatsAppSettingsTypes";
import { useWhatsAppSettingsData } from "./settings/hooks/useWhatsAppSettingsData";
import { WhatsAppSettingsMetrics } from "./settings/components/WhatsAppSettingsMetrics";
import {
  WhatsAppDesktopSidebar,
  WhatsAppMobileNav,
} from "./settings/components/WhatsAppSettingsSidebar";
import { WhatsAppSessionsTab } from "./settings/components/WhatsAppSessionsTab";
import { WhatsAppGeneralTab } from "./settings/components/WhatsAppGeneralTab";
import { WhatsAppQuickRepliesTab } from "./settings/components/WhatsAppQuickRepliesTab";
import { WhatsAppBusinessTab } from "./settings/components/WhatsAppBusinessTab";
import { WhatsAppPrivacyTab } from "./settings/components/WhatsAppPrivacyTab";
import { WhatsAppLabelsTab } from "./settings/components/WhatsAppLabelsTab";
import { WhatsAppSettingsDialogs } from "./settings/components/WhatsAppSettingsDialogs";

const WhatsAppSettings: React.FC<WhatsAppSettingsProps> = ({
  companyId,
  companyName,
  superAdminMode = false,
}) => {
  const { t, i18n } = useTranslation();
  const ts = (key: string, opts?: Record<string, unknown>) =>
    (t(key, opts as any) as unknown) as string;
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = ((searchParams.get("tab") as TabId) || "sessions") as TabId;

  const data = useWhatsAppSettingsData({
    companyId,
    activeTab,
  });

  const pageTitle = companyName
    ? `${t("whatsappSettings.title")} · ${companyName}`
    : t("whatsappSettings.title");
  const workspaceHref =
    superAdminMode && companyId
      ? `/super-admin/whatsapp/companies/${companyId}`
      : undefined;
  const notificationsHref =
    superAdminMode && companyId
      ? `/super-admin/whatsapp/companies/${companyId}/notifications`
      : "/whatsapp/notifications";
  const eyebrow =
    superAdminMode && companyName
      ? i18n.language === "ar"
        ? `شركة: ${companyName}`
        : `Company: ${companyName}`
      : undefined;

  const tabs = useMemo<TabDefinition[]>(
    () => [
      {
        id: "sessions",
        label: t("whatsappSettings.sidebarTitle"),
        icon: Smartphone,
        description: t("whatsappSettings.description"),
      },
      {
        id: "general",
        label: t("whatsappSettings.generalSettings"),
        icon: Settings,
        description: t("whatsappSettings.generalSettings"),
      },
      {
        id: "window-policy",
        label: "نافذة 24 ساعة و SMS",
        icon: Clock,
        description: "سياسة المراسلة وبدائل القوالب والرسائل القصيرة",
      },
      {
        id: "quick-replies",
        label: t("whatsappSettings.quickReplies"),
        icon: Copy,
        description: t("whatsappSettings.quickReplies"),
      },
      {
        id: "business",
        label: t("whatsappSettings.businessProfile"),
        icon: Database,
        description: t("whatsappSettings.businessProfile"),
      },
      {
        id: "privacy",
        label: t("whatsappSettings.privacy"),
        icon: Lock,
        description: t("whatsappSettings.privacySettings"),
      },
      {
        id: "labels",
        label: t("whatsappSettings.labels"),
        icon: Tag,
        description: t("whatsappSettings.manageLabels"),
      },
    ],
    [t],
  );

  const handleTabChange = (tabId: TabId) => {
    setSearchParams({ tab: tabId });
    if (tabsRequiringScopedSession.has(tabId) && data.scopedSessionId) {
      void data.loadScopedTabData(tabId, data.scopedSessionId);
    }
  };

  const shellActions = (
    <>
      <Button
        variant="outline"
        className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] hover:bg-[color:var(--color-card)]"
        onClick={() => void data.handleRefresh()}
        disabled={data.refreshing}
      >
        <RefreshCw className={cn("size-4", data.refreshing && "animate-spin")} />
        {t("whatsappSettings.update")}
      </Button>
      {activeTab === "sessions" ? (
        <>
          <Button
            variant="outline"
            className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] hover:bg-[color:var(--color-muted)] text-xs font-medium gap-1.5"
            onClick={() => {
              const metaSession =
                data.sessions.find((s) => s.provider === "META_CLOUD") || null;
              data.setWebhookDetailsSession(metaSession);
              data.setWebhookDetailsOpen(true);
            }}
          >
            <Globe className="size-3.5 text-sky-600 dark:text-sky-400" />
            <span className="hidden sm:inline">بيانات Webhook</span>
          </Button>
          <Button
            className="rounded-full bg-[color:var(--business-success)] px-4 text-white hover:brightness-90"
            onClick={data.handleOpenCreateSessionDialog}
            disabled={data.sessions.length >= (data.settings?.maxSessions || 9999)}
          >
            <Plus className="size-4" />
            {t("whatsappSettings.addSession")}
          </Button>
        </>
      ) : null}
      {activeTab === "quick-replies" ? (
        <Button
          className="rounded-full bg-[color:var(--business-success)] px-4 text-white hover:brightness-90"
          onClick={data.openCreateQuickReplyDialog}
        >
          <Plus className="size-4" />
          {t("whatsappSettings.addQuickReply")}
        </Button>
      ) : null}
      {activeTab === "labels" ? (
        <Button
          className="rounded-full bg-[color:var(--business-success)] px-4 text-white hover:brightness-90"
          onClick={() => data.setLabelDialogOpen(true)}
          disabled={!data.scopedSessionId}
        >
          <Plus className="size-4" />
          {t("whatsappSettings.addLabel")}
        </Button>
      ) : null}
    </>
  );

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case "sessions":
        return (
          <WhatsAppSessionsTab
            sessions={data.sessions}
            settings={data.settings}
            connectingSessionId={data.connectingSessionId}
            onRefresh={() => void data.handleRefresh()}
            onOpenCreateSession={data.handleOpenCreateSessionDialog}
            onOpenWebhookDetails={(session) => {
              data.setWebhookDetailsSession(session);
              data.setWebhookDetailsOpen(true);
            }}
            onConnectSession={(session) => void data.handleConnectSession(session)}
            onDisconnectSession={(id) => void data.handleDisconnectSession(id)}
            onStartEditSession={data.handleStartEditSession}
            onDeleteSession={(session) => {
              let defaultKeep = true;
              const sessMeta = session.metadata;
              if (sessMeta) {
                try {
                  const meta = JSON.parse(sessMeta) as Record<string, unknown>;
                  if (typeof meta?.keepHistoryOnDelete === "boolean") {
                    defaultKeep = meta.keepHistoryOnDelete;
                  }
                } catch {
                  defaultKeep = true;
                }
              }
              data.setKeepHistory(defaultKeep);
              data.setDeleteState({ kind: "session", id: session.id });
            }}
          />
        );
      case "general":
        return (
          <WhatsAppGeneralTab
            settings={data.settings}
            setSettings={data.setSettings}
            saving={data.saving}
            onSaveSettings={() => void data.handleSaveSettings()}
            notificationsHref={notificationsHref}
          />
        );
      case "window-policy":
        return <WindowPolicySettingsTab />;
      case "quick-replies":
        return (
          <WhatsAppQuickRepliesTab
            quickReplies={data.quickReplies}
            onOpenCreate={data.openCreateQuickReplyDialog}
            onEdit={(reply) => {
              data.setEditingQuickReply(reply);
              data.setQuickReplyForm({
                title: reply.title,
                shortcut: reply.shortcut || "",
                content: reply.content,
                category: reply.category,
              });
              data.setQuickReplyDialogOpen(true);
            }}
            onDelete={(reply) =>
              data.setDeleteState({ kind: "quickReply", id: reply.id })
            }
          />
        );
      case "business":
        return (
          <WhatsAppBusinessTab
            connectedSessions={data.connectedSessions}
            scopedSessionId={data.scopedSessionId}
            onScopedSessionChange={data.handleScopedSessionChange}
            currentScopedSession={data.currentScopedSession}
            businessProfile={data.businessProfile}
            setBusinessProfile={data.setBusinessProfile}
            loadingBusiness={data.loadingBusiness}
            saving={data.saving}
            onSaveBusinessProfile={() => void data.handleSaveBusinessProfile()}
          />
        );
      case "privacy":
        return (
          <WhatsAppPrivacyTab
            connectedSessions={data.connectedSessions}
            scopedSessionId={data.scopedSessionId}
            onScopedSessionChange={data.handleScopedSessionChange}
            currentScopedSession={data.currentScopedSession}
            privacySettings={data.privacySettings}
            setPrivacySettings={data.setPrivacySettings}
            blocklist={data.blocklist}
            loadingPrivacy={data.loadingPrivacy}
            saving={data.saving}
            onSavePrivacy={() => void data.handleSavePrivacy()}
            onUnblock={(jid) => void data.handleUnblock(jid)}
          />
        );
      case "labels":
        return (
          <WhatsAppLabelsTab
            connectedSessions={data.connectedSessions}
            scopedSessionId={data.scopedSessionId}
            onScopedSessionChange={data.handleScopedSessionChange}
            labels={data.labels}
            loadingLabels={data.loadingLabels}
            restoringLabels={data.restoringLabels}
            onOpenCreateLabel={() => data.setLabelDialogOpen(true)}
            onRestoreDefaultLabels={() => void data.handleRestoreDefaultLabels()}
            onOpenLabelContacts={(label) => data.setLabelContactsLabel(label)}
            onDeleteLabel={(label) =>
              data.setDeleteState({ kind: "label", id: label.id })
            }
          />
        );
      default:
        return null;
    }
  };

  if (data.loading) {
    return (
      <WhatsAppPageShell
        title={pageTitle}
        description={ts("whatsappSettings.description")}
        icon={Smartphone}
        actions={shellActions}
        backHref={workspaceHref}
        backLabel={ts("common.back")}
        eyebrow={eyebrow}
      >
        <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-24 rounded-2xl sm:h-36 sm:rounded-3xl"
            />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-[17rem_minmax(0,1fr)]">
          <Skeleton className="h-[20rem] rounded-2xl sm:h-[34rem] sm:rounded-3xl" />
          <Skeleton className="h-[24rem] rounded-2xl sm:h-[40rem] sm:rounded-3xl" />
        </div>
      </WhatsAppPageShell>
    );
  }

  return (
    <WhatsAppPageShell
      title={pageTitle}
      description={ts("whatsappSettings.description")}
      icon={Smartphone}
      actions={shellActions}
      backHref={workspaceHref}
      backLabel={ts("common.back")}
      eyebrow={eyebrow}
    >
      <WhatsAppSettingsMetrics
        connectedCount={data.connectedSessions.length}
        contactsCount={data.linkedContactsCount}
        messagesCount={data.sessionMessagesCount}
        quickRepliesCount={data.quickReplies.length}
      />

      <WhatsAppMobileNav
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      <div className="grid gap-4 xl:grid-cols-[17rem_minmax(0,1fr)]">
        <WhatsAppDesktopSidebar
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
        <div className="min-w-0 space-y-4">{renderActiveTabContent()}</div>
      </div>

      <WhatsAppSettingsDialogs data={data} />
    </WhatsAppPageShell>
  );
};

export default WhatsAppSettings;
