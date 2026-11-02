import React from "react";
import { toast } from "sonner";
import { AlertCircle, Plus, Menu } from "lucide-react";
import AgentProfileHeader from "./AgentProfileHeader";
import AgentSettingsTab from "./AgentSettingsTab";
import AgentSkillsTab from "./AgentSkillsTab";
import AgentToolsTab from "./AgentToolsTab";
import CreateAgentDialog from "./CreateAgentDialog";
import AgentGuardrailsTab from "./AgentGuardrailsTab";
import { AgentAutomationTab } from "./AgentAutomationTab";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAgentProfilesState } from "./useAgentProfilesState";
import { AgentProfilesSidebar } from "./AgentProfilesSidebar";
import { AgentProfilesTabsBar } from "./AgentProfilesTabsBar";
import { AgentArchivedCard } from "./AgentArchivedCard";
import { AgentActionConfirmModals } from "./AgentActionConfirmModals";
import { AgentProfilesEmptyState } from "./AgentProfilesEmptyState";

export default function AgentProfilesPage() {
  const {
    t,
    isMobile,
    mobileDrawerOpen,
    setMobileDrawerOpen,
    companyId,
    agents,
    agentsLoading,
    selectedId,
    setSelectedId,
    searchQuery,
    setSearchQuery,
    agentsListTab,
    setAgentsListTab,
    tab,
    setTab,
    profile,
    setProfile,
    profileLoading,
    profileError,
    setProfileError,
    statusSaving,
    actionConfirm,
    setActionConfirm,
    deleting,
    editing,
    setEditing,
    draftName,
    setDraftName,
    draftIcon,
    setDraftIcon,
    draftDescription,
    setDraftDescription,
    draftFiles,
    setDraftFiles,
    draftConfig,
    setDraftConfig,
    profileSaving,
    createOpen,
    setCreateOpen,
    templates,
    templatesLoading,
    hasUnsavedChanges,
    selectedAgent,
    channels,
    filteredAgents,
    loadAgents,
    loadProfileData,
    toggleStatus,
    saveProfile,
    discardChanges,
    handleArchiveAgent,
    handleDeleteAgent,
    setSearchParams,
  } = useAgentProfilesState();

  const handleSelectAgent = (id: string) => {
    setSelectedId(id);
    setSearchParams({ agent: id }, { replace: true });
    setMobileDrawerOpen(false);
  };

  return (
    <div className="flex h-full w-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* ── Mobile Drawer ── */}
      {isMobile && (
        <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
          <SheetContent
            side="right"
            className="w-[85vw] max-w-[340px] p-0 flex flex-col h-full bg-card"
          >
            <AgentProfilesSidebar
              isDrawer
              agents={agents}
              filteredAgents={filteredAgents}
              agentsLoading={agentsLoading}
              selectedId={selectedId}
              onSelectAgent={handleSelectAgent}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              agentsListTab={agentsListTab}
              onTabChange={setAgentsListTab}
              onOpenCreate={() => setCreateOpen(true)}
              setTab={setTab}
              onCloseDrawer={() => setMobileDrawerOpen(false)}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* ── Desktop Static Sidebar ── */}
      {!isMobile && (
        <AgentProfilesSidebar
          agents={agents}
          filteredAgents={filteredAgents}
          agentsLoading={agentsLoading}
          selectedId={selectedId}
          onSelectAgent={handleSelectAgent}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          agentsListTab={agentsListTab}
          onTabChange={setAgentsListTab}
          onOpenCreate={() => setCreateOpen(true)}
          setTab={setTab}
        />
      )}

      {/* ── Main Panel ── */}
      <main className="flex-1 flex flex-col overflow-hidden min-h-0 min-w-0">
        <div className="px-3 sm:px-5 pt-3">
          <h1 className="text-lg font-bold">{t("agentProfiles.page.title", "فريق الايجنت")}</h1>
          <p className="text-xs text-muted-foreground">{t("agentProfiles.page.subtitle", "ملفات الوكلاء وأدواتهم وقنواتهم")}</p>
        </div>

        {/* Mobile Fallback Bar (Only when no agent profile is loaded) */}
        {isMobile && !(selectedAgent && profile) && (
          <div className="flex items-center justify-between gap-2 p-2.5 border-b border-border/50 lg:hidden bg-card/60">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMobileDrawerOpen(true)}
              className="gap-2 text-xs h-8"
            >
              <Menu className="size-4" />
              <span>{t("agentProfiles.page.title", "فريق الايجنت")}</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="gap-1.5 text-xs h-8"
            >
              <Plus className="size-4" />
              <span>{t("agentProfiles.sidebar.addTitle", "إضافة")}</span>
            </Button>
          </div>
        )}

        {selectedAgent && profile ? (
          <>
            {/* Header */}
            <AgentProfileHeader
              agentId={selectedAgent.id}
              agentRole={selectedAgent.role}
              agentStatus={profile.agent.status}
              templateSlug={profile.agent.templateSlug}
              channels={channels}
              editing={editing}
              setEditing={setEditing}
              draftName={draftName}
              setDraftName={setDraftName}
              draftIcon={draftIcon}
              setDraftIcon={setDraftIcon}
              hasUnsavedChanges={hasUnsavedChanges}
              statusSaving={statusSaving}
              profileSaving={profileSaving}
              onToggleStatus={toggleStatus}
              onSave={saveProfile}
              onDiscard={discardChanges}
              onArchive={() => setActionConfirm("archive")}
              onDelete={() => setActionConfirm("delete")}
              onRefresh={loadAgents}
              refreshLoading={agentsLoading}
              onOpenDrawer={() => setMobileDrawerOpen(true)}
              onCreateAgent={() => setCreateOpen(true)}
            />

            {/* Tabs Bar */}
            <AgentProfilesTabsBar
              activeTab={tab}
              onSelectTab={setTab}
              profile={profile}
            />

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 lg:p-6 pb-24 sm:pb-8 min-h-0 min-w-0">
              {profileError && (
                <div
                  role="alert"
                  className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl max-w-2xl mb-5 text-destructive text-xs"
                >
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span className="flex-1">{profileError}</span>
                  <button
                    onClick={() => setProfileError(null)}
                    className="font-bold"
                  >
                    &times;
                  </button>
                </div>
              )}

              {profile.agent.status?.toUpperCase() === "ARCHIVED" ? (
                <AgentArchivedCard
                  agentId={selectedAgent.id}
                  draftIcon={draftIcon}
                  draftName={draftName}
                  role={profile.agent.role}
                  setProfile={setProfile}
                  onRestoreSuccess={() => {
                    if (agentsListTab === "active") {
                      loadAgents();
                    } else {
                      setAgentsListTab("active");
                    }
                  }}
                  onOpenDeleteConfirm={() => setActionConfirm("delete")}
                />
              ) : (
                <>
                  {tab === "settings" && (
                    <AgentSettingsTab
                      editing={editing}
                      draftName={draftName}
                      setDraftName={setDraftName}
                      draftDescription={draftDescription}
                      setDraftDescription={setDraftDescription}
                      draftConfig={draftConfig}
                      setDraftConfig={setDraftConfig}
                      draftFiles={draftFiles}
                      setDraftFiles={setDraftFiles}
                    />
                  )}

                  {tab === "skills" && (
                    <AgentSkillsTab
                      skills={profile.skills || []}
                      agentId={selectedAgent.id}
                      agentName={selectedAgent.name}
                      onRefresh={loadAgents}
                    />
                  )}

                  {tab === "tools" && (
                    <AgentToolsTab
                      allowedTools={profile.allowedTools || []}
                      agentId={selectedAgent.id}
                      agentName={selectedAgent.name}
                      companyId={companyId}
                      onRefresh={loadAgents}
                    />
                  )}

                  {tab === "guardrails" && (
                    <AgentGuardrailsTab
                      agentId={selectedAgent.id}
                      companyId={companyId}
                      agentModel={profile.agent.model || "gemini-2.5-flash"}
                      agentProvider="GOOGLE"
                    />
                  )}

                  {tab === "automation" && (
                    <AgentAutomationTab agent={selectedAgent} />
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          <AgentProfilesEmptyState
            loading={profileLoading || Boolean(agentsLoading && selectedId && !profile)}
            error={!profile ? profileError : null}
            selectedId={selectedId}
            onRetry={() => {
              if (selectedId) loadProfileData(selectedId);
            }}
            onOpenCreate={() => setCreateOpen(true)}
          />
        )}
      </main>

      {/* ── Create Agent Dialog ── */}
      <CreateAgentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        templates={templates}
        templatesLoading={templatesLoading}
        onCreated={(newId) => {
          toast.success(
            t("agentProfiles.toast.createSuccess", "تم إنشاء الوكيل بنجاح"),
          );
          loadAgents().then(() => {
            setSelectedId(newId);
          });
        }}
      />

      {/* ── Archive & Delete Confirmation Dialogs ── */}
      <AgentActionConfirmModals
        actionConfirm={actionConfirm}
        onClose={() => {
          if (!deleting) setActionConfirm(null);
        }}
        deleting={deleting}
        agentName={selectedAgent?.name || draftName}
        onArchive={handleArchiveAgent}
        onDelete={handleDeleteAgent}
      />
    </div>
  );
}
