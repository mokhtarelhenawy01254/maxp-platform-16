import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Printer,
  RotateCcw,
  Stethoscope,
  X as XMarkIcon,
} from "lucide-react";
import { toast } from "sonner";
import { MODAL_CONTENT_CLS } from "./shared";
import { StepIndicator } from "./quick-order/components/StepIndicator";
import { QuickOrderStepDoctor } from "./quick-order/steps/QuickOrderStepDoctor";
import { QuickOrderStepWorkType } from "./quick-order/steps/QuickOrderStepWorkType";
import { QuickOrderStepPatientFiles } from "./quick-order/steps/QuickOrderStepPatientFiles";
import { useQuickOrderWizard } from "./quick-order/hooks/useQuickOrderWizard";
import type { QuickOrderModalProps, Step } from "./quick-order/types/quickOrderTypes";

export function QuickOrderModal({
  onClose,
  onSaved,
  preselectedDoctor,
}: QuickOrderModalProps) {
  const wizard = useQuickOrderWizard({
    preselectedDoctor,
    onClose,
    onSaved,
  });

  const {
    step,
    setStep,
    selectedDoctor,
    setSelectedDoctor,
    treatingDoctorName,
    setTreatingDoctorName,
    customDoctorInput,
    setCustomDoctorInput,
    showNewDoctor,
    setShowNewDoctor,
    doctorSearch,
    setDoctorSearch,
    doctorsLoading,
    bypassCreditCheck,
    setBypassCreditCheck,
    allDoctors,
    setAllDoctors,
    workTypes,
    technicians,
    doctorPricingMap,
    refsLoading,
    selectedServiceIds,
    toggleService,
    selectedTeeth,
    handleTeethChange,
    unitsCount,
    handleManualUnitsChange,
    shade,
    setShade,
    customShade,
    setCustomShade,
    material,
    setMaterial,
    impressionType,
    setImpressionType,
    caseIntent,
    setCaseIntent,
    priceSnapshot,
    setPriceSnapshot,
    discount,
    setDiscount,
    patientName,
    setPatientName,
    patientPhone,
    setPatientPhone,
    receivedDate,
    setReceivedDate,
    dueDate,
    setDueDate,
    isDueDateUserModified,
    dueDateReason,
    priority,
    setPriority,
    selectedTechnicianId,
    setSelectedTechnicianId,
    selectedTechnicianRole,
    setSelectedTechnicianRole,
    notes,
    setNotes,
    files,
    setFiles,
    submitting,
    submittingAndPrint,
    dragOver,
    setDragOver,
    fileInputRef,
    draftRestored,
    upProgress,
    upStatus,
    upTotalPct,
    upDoneCount,
    primaryWorkType,
    clearDraft,
    handleCancel,
    submitOrder,
  } = wizard;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3"
      onClick={() => !submitting && handleCancel()}
    >
      <div
        className={`${MODAL_CONTENT_CLS} !max-w-4xl max-h-[92vh] flex flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b dark:border-gray-700 shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-blue-600" />
                الطلب السريع لأمر الشغل
              </h3>
              {draftRestored && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-[11px] font-semibold border border-amber-200 dark:border-amber-800">
                  <span>مسودة مسترجعة</span>
                  <button
                    type="button"
                    onClick={clearDraft}
                    title="تفريغ المسودة وبدء طلب جديد"
                    className="hover:text-red-600 p-0.5"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              تسجيل حالة جديدة، تحديد الأسنان، التحقق من الائتمان، وإسناد الفني في 3 خطوات بسيطة
            </p>
          </div>
          <button
            type="button"
            onClick={() => !submitting && !submittingAndPrint && handleCancel()}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          <StepIndicator current={step} />

          {/* STEP 1: DOCTOR & FINANCIAL STATUS */}
          {step === 1 && (
            <QuickOrderStepDoctor
              doctorSearch={doctorSearch}
              onDoctorSearchChange={setDoctorSearch}
              filteredDoctors={allDoctors}
              selectedDoctor={selectedDoctor}
              onSelectDoctor={setSelectedDoctor}
              treatingDoctorName={treatingDoctorName}
              onTreatingDoctorNameChange={setTreatingDoctorName}
              customDoctorInput={customDoctorInput}
              onCustomDoctorInputChange={setCustomDoctorInput}
              showNewDoctor={showNewDoctor}
              onShowNewDoctorChange={setShowNewDoctor}
              doctorsLoading={doctorsLoading}
              bypassCreditCheck={bypassCreditCheck}
              onBypassCreditCheckChange={setBypassCreditCheck}
              onDoctorCreated={(doc) => {
                setAllDoctors((prev) => [doc, ...prev]);
                setSelectedDoctor(doc);
                setShowNewDoctor(false);
              }}
            />
          )}

          {/* STEP 2: SERVICES, ODONTOGRAM, SHADES & INTENT */}
          {step === 2 && (
            <QuickOrderStepWorkType
              workTypes={workTypes}
              selectedServiceIds={selectedServiceIds}
              onToggleService={toggleService}
              selectedTeeth={selectedTeeth}
              onTeethChange={handleTeethChange}
              unitsCount={unitsCount}
              onUnitsCountChange={handleManualUnitsChange}
              shade={shade}
              onShadeChange={setShade}
              customShade={customShade}
              onCustomShadeChange={setCustomShade}
              material={material}
              onMaterialChange={setMaterial}
              impressionType={impressionType}
              onImpressionTypeChange={setImpressionType}
              caseIntent={caseIntent}
              onCaseIntentChange={setCaseIntent}
              priceSnapshot={priceSnapshot}
              onPriceSnapshotChange={setPriceSnapshot}
              discount={discount}
              onDiscountChange={setDiscount}
              primaryService={primaryWorkType}
              doctorPricingMap={doctorPricingMap}
              refsLoading={refsLoading}
            />
          )}

          {/* STEP 3: PATIENT, DUE DATE, 3D FILES & DISPATCH */}
          {step === 3 && (
            <QuickOrderStepPatientFiles
              patientName={patientName}
              onPatientNameChange={setPatientName}
              patientPhone={patientPhone}
              onPatientPhoneChange={setPatientPhone}
              receivedDate={receivedDate}
              onReceivedDateChange={setReceivedDate}
              dueDate={dueDate}
              onDueDateChange={setDueDate}
              dueDateReason={dueDateReason}
              isDueDateUserModified={isDueDateUserModified}
              priority={priority}
              onPriorityChange={setPriority}
              technicians={technicians}
              selectedTechnicianId={selectedTechnicianId}
              onSelectedTechnicianIdChange={setSelectedTechnicianId}
              selectedTechnicianRole={selectedTechnicianRole}
              onSelectedTechnicianRoleChange={setSelectedTechnicianRole}
              notes={notes}
              onNotesChange={setNotes}
              files={files}
              onFilesChange={setFiles}
              fileInputRef={fileInputRef}
              dragOver={dragOver}
              onDragOverChange={setDragOver}
              upProgress={upProgress}
              upStatus={upStatus}
              upTotalPct={upTotalPct}
              upDoneCount={upDoneCount}
              selectedDoctor={selectedDoctor}
              primaryWorkType={primaryWorkType}
              selectedTeeth={selectedTeeth}
              unitsCount={unitsCount}
              shade={shade}
              customShade={customShade}
              priceSnapshot={priceSnapshot}
              discount={discount}
            />
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 border-t dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/60 shrink-0">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as Step)}
                disabled={submitting}
                className="px-4 py-2 border dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-1.5"
              >
                <ArrowRight className="w-4 h-4" />
                السابق
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={submitting}
              className="px-4 py-2 border dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              إلغاء
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && !selectedDoctor) {
                    toast.error("يرجى اختيار الطبيب للمتابعة");
                    return;
                  }
                  if (step === 2 && selectedServiceIds.length === 0) {
                    toast.error("يرجى اختيار نوع الشغل للمتابعة");
                    return;
                  }
                  setStep((s) => (s + 1) as Step);
                }}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1.5 shadow-sm"
              >
                التالي
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => submitOrder(true)}
                  disabled={submitting || submittingAndPrint || !patientName.trim()}
                  className="px-4 py-2 border border-emerald-600 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-lg text-sm font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                  title="حفظ أمر الشغل وفتح كارت الباركود فوراً للطباعة"
                >
                  {submittingAndPrint ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Printer className="w-4 h-4" />
                  )}
                  حفظ وطباعة الباركود
                </button>
                <button
                  type="button"
                  onClick={() => submitOrder(false)}
                  disabled={submitting || submittingAndPrint || !patientName.trim()}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  حفظ أمر الشغل
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuickOrderModal;
