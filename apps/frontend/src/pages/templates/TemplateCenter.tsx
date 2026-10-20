import React from "react";
import { toast } from "sonner";
import {
  DocumentTextIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { Skeleton } from "@/components/ui/skeleton";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import MetaTemplatesModal from "../customers/components/MetaTemplatesModal";
import { useTemplateCenterData } from "./hooks/useTemplateCenterData";
import GroupHeader from "./components/GroupHeader";
import StatusRow from "./components/StatusRow";
import StatusReportTab from "./components/StatusReportTab";
import TemplateSettingsTab from "./components/TemplateSettingsTab";
import TemplateScheduleTab from "./components/TemplateScheduleTab";
import TemplateEditDialog from "./components/TemplateEditDialog";
import TemplateFilterBar from "./components/TemplateFilterBar";
import TemplateBatchPublishBanner from "./components/TemplateBatchPublishBanner";
import TemplateTestBar from "./components/TemplateTestBar";
import TemplateOccasionsSection from "./components/TemplateOccasionsSection";
import WhatsAppBubblePreview from "./components/WhatsAppBubblePreview";
import { resolveVariablesForPreview, buildLocalContentFromMetaBody } from "./utils";
import type { TemplateScopeConfig, EventRow } from "./types";

// Re-export for backward-compatibility with existing consumers
export { WhatsAppBubblePreview, resolveVariablesForPreview, buildLocalContentFromMetaBody };

const LARGE_GROUP_THRESHOLD = 4;

export default function TemplateCenter({ config }: { config: TemplateScopeConfig }) {
  const d = useTemplateCenterData(config);

  return (
    <div className="mx-auto max-w-6xl px-4 py-4">
      {/* Header */}
      <div className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {config.title}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {config.description}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {d.anyBoundMeta && d.metaOps.metaSessions.length > 0 && (
              <button
                type="button"
                onClick={() => d.metaOps.syncMetaStatuses(false)}
                disabled={d.metaOps.syncingStatus}
                title="تحديث حالة قوالب ميتا من ميتا مباشرة"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <ArrowPathIcon className={`h-3.5 w-3.5 ${d.metaOps.syncingStatus ? "animate-spin" : ""}`} />
                مزامنة حالات ميتا
              </button>
            )}
          </div>
        </div>
      </div>

      {/* شريط إرسال القوالب لميتا لأول مرة */}
      <TemplateBatchPublishBanner
        unsubmittedCount={d.unsubmittedMetaTemplates.length}
        metaSessions={d.metaOps.metaSessions}
        selectedMetaSession={d.metaOps.selectedMetaSession}
        onSelectMetaSession={d.metaOps.setSelectedMetaSession}
        batchPublishing={d.metaOps.batchPublishing}
        onBatchPublish={d.handleBatchPublish}
      />

      {/* شريط الإرسال التجريبي */}
      {config.features.enableTestSender && (
        <TemplateTestBar
          testPhone={d.testPhone}
          setTestPhone={d.setTestPhone}
          testEvent={d.testEvent}
          setTestEvent={d.setTestEvent}
          testing={d.testing}
          onSendTest={d.sendTest}
          statuses={d.statuses}
        />
      )}

      {/* Tabs list */}
      <div role="tablist" className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-700">
        {config.tabs.map((tab) => {
          const isReports = tab.kind === "reports";
          const isSettings = tab.kind === "settings";
          const isSchedule = tab.kind === "schedule";
          const count = isSchedule
            ? d.filters.scheduleCountLabel
            : isReports || isSettings
              ? 0
              : tab.count
                ? tab.count(d.statuses as EventRow[])
                : d.filters.notifiableCount;

          return (
            <button
              key={tab.key}
              role="tab"
              id={`tab-${tab.key}`}
              aria-selected={d.activeTab === tab.key}
              tabIndex={d.activeTab === tab.key ? 0 : -1}
              onClick={() => d.setActiveTab(tab.key)}
              className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
                d.activeTab === tab.key
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              }`}
            >
              {isReports && <DocumentTextIcon className="me-1.5 inline h-4 w-4" />}
              {isSettings && <Cog6ToothIcon className="me-1.5 inline h-4 w-4" />}
              {tab.label}
              {!isReports && !isSettings && (
                <span className="ms-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] tabular-nums font-mono dark:bg-slate-800">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Load error banner */}
      {!d.loading && d.loadError && (
        <div
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-300"
          role="alert"
        >
          <span>فشل تحميل البيانات — اتأكد من الاتصال وحاول تاني.</span>
          <button
            type="button"
            onClick={() => d.fetchData()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700"
          >
            <ArrowPathIcon className="h-3.5 w-3.5" />
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Tab Panels */}
      <div id={`panel-${d.activeTab}`} role="tabpanel" aria-labelledby={`tab-${d.activeTab}`}>
        {d.activeTab === "reports" ? (
          <StatusReportTab statuses={d.statuses} config={config} />
        ) : d.activeTab === "settings" && config.features.enableSettings ? (
          <TemplateSettingsTab
            settings={d.settings}
            settingsLoading={d.settingsLoading}
            settingsSaving={d.settingsSaving}
            settingsSessions={d.settingsSessions}
            defaultSessionInfo={d.defaultSessionInfo}
            deliveryPreview={d.deliveryPreview}
            syncingStatus={d.metaOps.syncingStatus}
            onUpdateSettings={d.setSettings}
            onSaveSettings={d.handleSaveSettings}
            onSyncMetaStatuses={() => d.metaOps.syncMetaStatuses(false)}
          />
        ) : d.activeTab === "schedule" && config.features.enableSchedule ? (
          <TemplateScheduleTab
            statuses={d.statuses}
            editingSchedule={d.editingSchedule}
            savingSchedule={d.savingSchedule}
            onSetEditingSchedule={d.setEditingSchedule}
            onSaveScheduleRow={d.saveScheduleRow}
            onToggleScheduleNotify={d.toggleScheduleNotify}
          />
        ) : (
          <>
            <TemplateFilterBar
              searchQuery={d.filters.searchQuery}
              setSearchQuery={d.filters.setSearchQuery}
              activeChip={d.filters.activeChip}
              setActiveChip={d.filters.setActiveChip}
              sortMode={d.filters.sortMode}
              setSortMode={d.filters.setSortMode}
              showInternal={d.filters.showInternal}
              setShowInternal={d.filters.setShowInternal}
              internalCount={d.filters.internalCount}
              config={config}
              activeTabDef={d.filters.activeTabDef}
              activeTab={d.activeTab}
              filteredStatuses={d.filters.filteredStatuses}
              visibleStatuses={d.filters.visibleStatuses}
              topCreateEvent={d.topCreateEvent}
              setTopCreateEvent={d.setTopCreateEvent}
              handleTopCreate={d.handleTopCreate}
              noun={d.noun}
              t={d.t}
            />

            {config.scope === "customers" && d.activeTab === "occasions" && (
              <TemplateOccasionsSection
                liveOccasions={d.liveOccasions}
                linkedOccasionId={d.linkedOccasionId}
                onStartLinking={d.setLinkingOccasion}
              />
            )}

            {d.loading ? (
              <div data-testid="status-skeleton" className="space-y-2" aria-busy="true" aria-live="polite">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-lg border border-slate-200/70 bg-white p-3.5 dark:border-white/10 dark:bg-slate-900/50"
                  >
                    <Skeleton className="h-7 w-7 shrink-0 rounded-md" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-1/3" />
                      <Skeleton className="h-2.5 w-1/4" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            ) : d.filters.filteredByChipAndSearch.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200/70 py-16 text-center dark:border-white/10">
                <DocumentTextIcon className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-300">
                  {d.filters.searchQuery || d.filters.activeChip !== "all"
                    ? `لا توجد ${d.noun.plural} مطابقة لبحثك`
                    : `لا توجد ${d.noun.plural} بعد`}
                </p>
                <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
                  {d.filters.searchQuery || d.filters.activeChip !== "all"
                    ? "جرّب تغيير كلمات البحث أو إلغاء الفلاتر لرؤية كل النتائج."
                    : config.scope === "customers"
                      ? "قوالب إشعارات العملاء ستظهر هنا بمجرد إضافتها."
                      : `ال${d.noun.plural} ستظهر هنا بمجرد إضافتها.`}
                </p>
                {(d.filters.searchQuery || d.filters.activeChip !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      d.filters.setSearchQuery("");
                      d.filters.setActiveChip("all");
                    }}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-indigo-700"
                  >
                    <XCircleIcon className="h-3.5 w-3.5" />
                    مسح الفلاتر
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {d.filters.groupKeys.map((groupKey) => {
                  const members = d.filters.groupedStatuses.get(groupKey) || [];
                  const isLarge = members.length > LARGE_GROUP_THRESHOLD;
                  const isCollapsed = isLarge && d.collapsedGroups[groupKey] !== false;
                  const isNoTemplate = groupKey === "__no-template__";

                  if (isCollapsed) {
                    return (
                      <GroupHeader
                        key={groupKey}
                        members={members}
                        isNoTemplate={isNoTemplate}
                        onExpand={() => d.setCollapsedGroups((p) => ({ ...p, [groupKey]: false }))}
                      />
                    );
                  }

                  return members.map((status) => (
                    <StatusRow
                      key={status.id}
                      status={status}
                      deliveryPreview={d.deliveryPreview}
                      isRegularPreviewExpanded={d.expandedPreviews.has(`regular-${status.id}`)}
                      isMetaPreviewExpanded={d.expandedPreviews.has(`meta-${status.id}`)}
                      isMobile={d.isMobile}
                      togglingId={d.togglingId}
                      onTogglePreview={(slot) => d.togglePreview(`${slot}-${status.id}`)}
                      onToggleNotify={d.toggleNotify}
                      onOpenEdit={d.crud.openEditDialog}
                      onOpenCreate={d.crud.openCreateDialog}
                      onOpenSwitch={d.crud.openSwitchDialog}
                      onUnbindMeta={d.metaOps.requestUnbindMeta}
                      sampleVariables={d.sampleVariables}
                      enableMetaSwitch={config.features.enableMetaSwitch}
                    />
                  ));
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit / Create / Switch Dialog */}
      <TemplateEditDialog
        dialogOpen={d.crud.dialogOpen}
        onOpenChange={d.crud.setDialogOpen}
        dialogMode={d.crud.dialogMode}
        dialogSlot={d.crud.dialogSlot}
        selectedStatus={d.crud.selectedStatus}
        statuses={d.statuses}
        activeTab={d.activeTab}
        config={config}
        noun={d.noun}
        metaDialogTitle={d.crud.metaDialogTitle}
        isMetaBound={d.crud.isMetaBound}
        originalMetaTemplateName={d.crud.originalMetaTemplateName}
        metaSessions={d.metaOps.metaSessions}
        selectedMetaSession={d.metaOps.selectedMetaSession}
        onSelectMetaSession={d.metaOps.setSelectedMetaSession}
        availableMetaTemplates={d.metaOps.availableMetaTemplates}
        loadingMetaTemplates={d.metaOps.loadingMetaTemplates}
        selectedTemplate={d.crud.selectedTemplate}
        templateForm={d.crud.templateForm}
        setTemplateForm={d.crud.setTemplateForm}
        sampleVariables={d.sampleVariables}
        variableDescriptions={d.variableDescriptions}
        metaVariableMismatch={d.crud.metaVariableMismatch}
        saving={d.crud.saving}
        bindingId={d.metaOps.bindingId}
        publishingId={d.metaOps.publishingId}
        resubmittingMeta={d.metaOps.resubmittingMeta}
        metaContentChanged={d.crud.metaContentChanged}
        metaBindingChanged={d.crud.metaBindingChanged}
        headerUploading={d.metaOps.headerUploading}
        uploadHeaderMedia={d.uploadHeaderMedia}
        statusOptions={d.statusOptions}
        onSave={d.handleSave}
        onCreateMetaTemplate={d.metaOps.createMetaTemplate}
        onResubmitMeta={d.metaOps.handleResubmitMeta}
        onSelectMetaTemplate={d.crud.handleMetaTemplateSelect}
        addButton={d.crud.addButton}
        addLinkButton={d.crud.addLinkButton}
        updateButton={d.crud.updateButton}
        removeButton={d.crud.removeButton}
        onSelectStatus={d.crud.setSelectedStatus}
        onClose={() => d.crud.setDialogOpen(false)}
        isFormDirty={d.crud.isFormDirty}
      />

      {/* Unbind confirmation dialog */}
      <ConfirmDialog
        open={!!d.metaOps.unbindTarget}
        title="فك ربط القالب بقالب ميتا"
        content="هل تريد فك ربط هذا القالب بقالب ميتا؟ بعد الفك، الرسالة ستُرسل كـ واتساب عادي."
        confirmLabel="نعم، فك الربط"
        cancelLabel="إلغاء"
        confirmColor="error"
        onConfirm={() => d.metaOps.unbindTarget && d.metaOps.unbindMeta(d.metaOps.unbindTarget)}
        onCancel={() => d.metaOps.setUnbindTarget(null)}
      />

      {/* Linking occasion modal */}
      {d.linkingOccasion && (
        <MetaTemplatesModal
          open={!!d.linkingOccasion}
          onClose={() => d.setLinkingOccasion(null)}
          onPick={async (_content: string, template?: { id?: string }) => {
            if (!template?.id) {
              toast.error("اختاري قالب ميتا معتمد");
              return;
            }
            const occ = d.linkingOccasion;
            d.setLinkingOccasion(null);
            if (occ) {
              await d.linkOccasionToTemplate(occ.id, template.id);
            }
          }}
          title={`ربط مناسبة: ${d.linkingOccasion.name}`}
        />
      )}
    </div>
  );
}
