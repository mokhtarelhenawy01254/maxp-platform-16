import React from "react";
import {
  useWorkReportFormBuilderController,
  WorkReportFormHeader,
  WorkReportMetadataCard,
  WorkReportFieldCard,
  WorkReportBuilderSidebar,
} from "./form-builder/index";

const WorkReportFormBuilder: React.FC = () => {
  const {
    formId,
    isEditing,
    loading,
    saving,
    formState,
    setFormState,
    visibleCounts,
    applyDraft,
    updateField,
    addField,
    duplicateField,
    removeField,
    moveField,
    handleSave,
  } = useWorkReportFormBuilderController();

  if (loading) {
    return (
      <div
        className="min-h-[350px] flex items-center justify-center text-center text-sm text-muted-foreground w-full"
        dir="rtl"
      >
        جاري تحميل إعدادات الفورم...
      </div>
    );
  }

  return (
    <div
      className="space-y-6 w-full pb-8"
      dir="rtl"
    >
      <div className="mx-auto max-w-6xl 2xl:max-w-7xl space-y-6">
        <WorkReportFormHeader
          isEditing={isEditing}
          formId={formId}
          title={formState.title}
          saving={saving}
          onApplyPreset={applyDraft}
          onSave={handleSave}
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-4">
            <WorkReportMetadataCard
              formState={formState}
              onChange={setFormState}
              onAddField={addField}
            />

            {formState.fields.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                أضف أول حقل لبدء بناء الفورم.
              </div>
            ) : (
              <div className="space-y-4">
                {formState.fields.map((field, index) => (
                  <WorkReportFieldCard
                    key={`${field.key}-${index}`}
                    field={field}
                    index={index}
                    onUpdateField={updateField}
                    onMoveField={moveField}
                    onDuplicateField={duplicateField}
                    onRemoveField={removeField}
                  />
                ))}
              </div>
            )}
          </section>

          <WorkReportBuilderSidebar
            totalFields={formState.fields.length}
            visibleCounts={visibleCounts}
          />
        </div>
      </div>
    </div>
  );
};

export default WorkReportFormBuilder;
