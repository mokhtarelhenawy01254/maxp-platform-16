import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import FieldHint from "./FieldHint";
import MetaTemplateSelect from "./MetaTemplateSelect";
import TemplateSwitchMode from "./TemplateSwitchMode";
import TemplateButtonsBuilder from "./TemplateButtonsBuilder";
import TemplateHeaderMedia from "./TemplateHeaderMedia";
import TemplateContentEditor from "./TemplateContentEditor";
import TemplateEditFooter from "./TemplateEditFooter";
import type {
  TemplateSlot,
  StatusWithTemplate,
  TemplateScopeConfig,
  MetaSession,
  MetaAvailableTemplate,
  TemplateFormState,
  TemplateButton,
  Template,
  EventRow,
} from "../types";

export interface TemplateEditDialogProps {
  dialogOpen: boolean;
  onOpenChange: (open: boolean) => void;
  dialogMode: "create" | "edit" | "switch";
  dialogSlot: TemplateSlot;
  selectedStatus: StatusWithTemplate | null;
  statuses: StatusWithTemplate[];
  activeTab: string;
  config: TemplateScopeConfig;
  noun: { singular: string; plural: string };
  metaDialogTitle: string;
  isMetaBound: boolean;
  originalMetaTemplateName: string;
  metaSessions: MetaSession[];
  selectedMetaSession: string;
  onSelectMetaSession: (sessionId: string) => void;
  availableMetaTemplates: MetaAvailableTemplate[];
  loadingMetaTemplates: boolean;
  selectedTemplate: Template | null;
  templateForm: TemplateFormState;
  setTemplateForm: React.Dispatch<React.SetStateAction<TemplateFormState>>;
  sampleVariables: Record<string, string>;
  variableDescriptions?: Record<string, string>;
  metaVariableMismatch: { metaCount: number; localCount: number; missing: number } | null;
  saving: boolean;
  bindingId: string | null;
  publishingId: string | null;
  resubmittingMeta: boolean;
  metaContentChanged: boolean;
  metaBindingChanged: boolean;
  headerUploading: boolean;
  uploadHeaderMedia: (file: File) => void;
  statusOptions: Array<{ value: string; label: string }>;
  onSave: () => void;
  onCreateMetaTemplate: () => void;
  onResubmitMeta: () => void;
  onSelectMetaTemplate: (name: string) => void;
  addButton: () => void;
  addLinkButton: () => void;
  updateButton: (index: number, patch: Partial<TemplateButton>) => void;
  removeButton: (index: number) => void;
  onSelectStatus?: (status: StatusWithTemplate) => void;
  onClose: () => void;
  isFormDirty?: () => boolean;
}

export default function TemplateEditDialog({
  dialogOpen,
  onOpenChange,
  dialogMode,
  dialogSlot,
  selectedStatus,
  statuses,
  activeTab,
  config,
  noun,
  metaDialogTitle,
  isMetaBound,
  originalMetaTemplateName,
  metaSessions,
  selectedMetaSession,
  onSelectMetaSession,
  availableMetaTemplates,
  loadingMetaTemplates,
  selectedTemplate,
  templateForm,
  setTemplateForm,
  sampleVariables,
  variableDescriptions,
  metaVariableMismatch,
  saving,
  bindingId,
  publishingId,
  resubmittingMeta,
  metaContentChanged,
  metaBindingChanged,
  headerUploading,
  uploadHeaderMedia,
  statusOptions,
  onSave,
  onCreateMetaTemplate,
  onResubmitMeta,
  onSelectMetaTemplate,
  addButton,
  addLinkButton,
  updateButton,
  removeButton,
  onSelectStatus,
  onClose,
  isFormDirty,
}: TemplateEditDialogProps) {
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

  const handleModalCloseRequest = (open: boolean) => {
    if (!open && isFormDirty?.()) {
      setConfirmCloseOpen(true);
    } else {
      onOpenChange(open);
    }
  };

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={handleModalCloseRequest}>
        <DialogContent
          data-testid="template-dialog"
          showCloseButton
          closeLabel="إغلاق"
          className="max-h-[90vh] max-w-2xl overflow-y-auto p-5 sm:max-w-2xl"
        >
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              {metaDialogTitle}
            </DialogTitle>
            <DialogDescription className="sr-only">
              نموذج إنشاء وتعديل قالب رسالة واتساب لل{noun.singular}
            </DialogDescription>
          </DialogHeader>

          {dialogOpen && selectedStatus && dialogMode === "switch" && (
            <TemplateSwitchMode
              selectedStatus={selectedStatus}
              noun={noun}
              isMetaBound={isMetaBound}
              originalMetaTemplateName={originalMetaTemplateName}
              metaSessions={metaSessions}
              selectedMetaSession={selectedMetaSession}
              onSelectMetaSession={onSelectMetaSession}
              availableMetaTemplates={availableMetaTemplates}
              loadingMetaTemplates={loadingMetaTemplates}
              templateForm={templateForm}
              setTemplateForm={setTemplateForm}
              sampleVariables={sampleVariables}
              variableDescriptions={variableDescriptions}
              metaVariableMismatch={metaVariableMismatch}
              saving={saving}
              onClose={onClose}
              onSave={onSave}
            />
          )}

          {dialogOpen && selectedStatus && dialogMode !== "switch" && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    نوع الحدث
                  </label>
                  {dialogMode === "create" ? (
                    <select
                      value={selectedStatus.code}
                      onChange={(e) => {
                        const next = statuses.find((s) => s.code === e.target.value);
                        if (next && onSelectStatus) {
                          onSelectStatus(next);
                        } else if (
                          (e.target.value.startsWith("CUSTOMER_OCCASION") ||
                            e.target.value.startsWith("NEW_PRODUCT")) &&
                          onSelectStatus
                        ) {
                          onSelectStatus({ ...selectedStatus, code: e.target.value });
                        }
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {statuses
                        .filter((s) => {
                          const def = config.tabs.find((tb) => tb.key === activeTab);
                          if (def?.kind === "list" && def.filter) return def.filter(s as EventRow);
                          return true;
                        })
                        .map((s) => (
                          <option key={s.code} value={s.code}>
                            {s.name} — {s.code}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={`${selectedStatus.name} — ${selectedStatus.code}`}
                      disabled
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                    />
                  )}
                </div>

                <div>
                  <label className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                    اسم القالب
                    {dialogSlot === "meta" && (
                      <FieldHint text="اسم محلي للعرض داخل المنصة فقط — ميتا بتولّد اسماً تقنياً يظهر على الكارت بعد النشر" />
                    )}
                  </label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    placeholder={config.scope === "customers" ? "مثال: قالب نقاط الولاء" : "مثال: قالب تأكيد الطلب"}
                  />
                </div>
              </div>

              {dialogSlot === "meta" && (
                <div className="space-y-3 rounded-lg border border-blue-200 p-3 dark:border-blue-800/40">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                        {dialogMode === "create" ? "حساب النشر على ميتا" : "اختر قالب ميتا المعتمد"}
                      </label>
                      <MetaTemplateSelect
                        metaSessions={metaSessions}
                        selectedMetaSession={selectedMetaSession}
                        onSessionChange={onSelectMetaSession}
                        availableMetaTemplates={availableMetaTemplates}
                        loadingMetaTemplates={loadingMetaTemplates}
                        selectedMetaTemplateName={templateForm.metaTemplateName}
                        onSelectTemplate={onSelectMetaTemplate}
                        showTemplates={dialogMode !== "create"}
                        enableMultiBind={config.features.enableMetaMultiBind}
                        excludeOtherBound={!config.features.enableMetaMultiBind}
                        selectedTemplateId={selectedTemplate?.id}
                        showMapping
                        localContent={templateForm.content}
                        sampleVariables={sampleVariables}
                        variableDescriptions={variableDescriptions}
                      />
                    </div>
                    {dialogMode === "create" && (
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                          فئة قالب ميتا (Category)
                        </label>
                        <select
                          value={templateForm.metaCategory || "UTILITY"}
                          onChange={(e) =>
                            setTemplateForm((p) => ({ ...p, metaCategory: e.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        >
                          <option value="UTILITY">UTILITY — تحديثات معاملات وطلبات</option>
                          <option value="MARKETING">MARKETING — عروض وتسويق</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <TemplateHeaderMedia
                dialogSlot={dialogSlot}
                templateForm={templateForm}
                setTemplateForm={setTemplateForm}
                headerUploading={headerUploading}
                uploadHeaderMedia={uploadHeaderMedia}
                config={config}
              />

              <TemplateContentEditor
                dialogSlot={dialogSlot}
                templateForm={templateForm}
                setTemplateForm={setTemplateForm}
                selectedTemplate={selectedTemplate}
                config={config}
                sampleVariables={sampleVariables}
              />

              <TemplateButtonsBuilder
                dialogSlot={dialogSlot}
                templateForm={templateForm}
                setTemplateForm={setTemplateForm}
                config={config}
                statusOptions={statusOptions}
                addButton={addButton}
                addLinkButton={addLinkButton}
                updateButton={updateButton}
                removeButton={removeButton}
              />

              <TemplateEditFooter
                dialogSlot={dialogSlot}
                templateForm={templateForm}
                setTemplateForm={setTemplateForm}
                isMetaBound={isMetaBound}
                metaContentChanged={metaContentChanged}
                metaBindingChanged={metaBindingChanged}
                saving={saving}
                resubmittingMeta={resubmittingMeta}
                bindingId={bindingId}
                publishingId={publishingId}
                metaSessions={metaSessions}
                metaVariableMismatch={metaVariableMismatch}
                config={config}
                onClose={onClose}
                onSave={onSave}
                onResubmitMeta={onResubmitMeta}
                onCreateMetaTemplate={onCreateMetaTemplate}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmCloseOpen}
        title="تجاهل التغييرات؟"
        content="في تعديلات على القالب مش محفوظة. تحب تقفل النافذة من غير ما تحفظ؟"
        confirmLabel="إغلاق بدون حفظ"
        cancelLabel="رجوع"
        confirmColor="warning"
        onConfirm={() => {
          onOpenChange(false);
          setConfirmCloseOpen(false);
        }}
        onCancel={() => setConfirmCloseOpen(false)}
      />
    </>
  );
}
