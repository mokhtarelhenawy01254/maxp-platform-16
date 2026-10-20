import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { useDentalCaseDetail } from "./case-detail/hooks/useDentalCaseDetail";
import DentalCaseHeader from "./case-detail/components/DentalCaseHeader";
import DentalCaseAlertBanners from "./case-detail/components/DentalCaseAlertBanners";
import DentalCaseInfoCard from "./case-detail/components/DentalCaseInfoCard";
import DentalCaseTimelineCard from "./case-detail/components/DentalCaseTimelineCard";
import DentalCaseStagesCard from "./case-detail/components/DentalCaseStagesCard";
import DentalCaseTeamQualityCards from "./case-detail/components/DentalCaseTeamQualityCards";
import DentalCaseMaterialsCard from "./case-detail/components/DentalCaseMaterialsCard";
import DentalCaseFilesCard from "./case-detail/components/DentalCaseFilesCard";
import DentalCaseInvoicesCard from "./case-detail/components/DentalCaseInvoicesCard";

import DentalCaseAdvanceModal from "./case-detail/modals/DentalCaseAdvanceModal";
import DentalCaseEditModal from "./case-detail/modals/DentalCaseEditModal";
import DentalCaseAssignStageModal from "./case-detail/modals/DentalCaseAssignStageModal";
import {
  DentalCaseSendToTryInModal,
  DentalCaseReturnFromTryInModal,
} from "./case-detail/modals/DentalCaseTryInModals";
import DentalCaseOutsourceModal from "./case-detail/modals/DentalCaseOutsourceModal";
import DentalCasePaymentModal from "./case-detail/modals/DentalCasePaymentModal";
import DentalCaseQualityModal from "./case-detail/modals/DentalCaseQualityModal";
import DentalCaseRefabricationModal from "./case-detail/modals/DentalCaseRefabricationModal";
import DentalCaseMaterialConsumeModal from "./case-detail/modals/DentalCaseMaterialConsumeModal";
import { nextStatusOf } from "./shared";

export default function DentalCaseDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  const detailState = useDentalCaseDetail(id);

  if (!id) {
    return (
      <div className="text-center py-16 text-gray-400 dark:text-gray-500">
        {t("dentalLab.common.noData")}
      </div>
    );
  }

  if (detailState.loading && !detailState.detail) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (detailState.error || !detailState.detail) {
    return (
      <div className="p-4 md:p-6 lg:p-8" dir="rtl">
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm mb-4">
          {detailState.error || t("dentalLab.common.noData")}
        </div>
        <Link to="/dental-lab/cases" className="text-blue-600 dark:text-blue-400 text-sm">
          {t("dentalLab.common.back")}
        </Link>
      </div>
    );
  }

  const c = detailState.detail;
  const next = nextStatusOf(c.status);

  const isOverdue = Boolean(
    c.dueDate &&
      !c.isDeleted &&
      !["DELIVERED", "CLOSED"].includes(c.status) &&
      new Date(c.dueDate) < new Date()
  );

  const daysOverdue =
    isOverdue && c.dueDate
      ? Math.max(1, Math.floor((Date.now() - new Date(c.dueDate).getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full h-full overflow-y-auto" dir="rtl">
      {/* Header Bar */}
      <DentalCaseHeader
        c={c}
        next={next}
        isOverdue={isOverdue}
        daysOverdue={daysOverdue}
        workOrderLoading={detailState.workOrderLoading}
        panLabelLoading={detailState.panLabelLoading}
        warrantyLoading={detailState.warrantyLoading}
        caseBusy={detailState.caseBusy}
        openWorkOrder={detailState.openWorkOrder}
        openPanLabel={detailState.openPanLabel}
        openWarrantyCertificate={detailState.openWarrantyCertificate}
        onRefresh={detailState.refresh}
        onOpenEdit={() => detailState.setStatusOpen(true)}
        onOpenAdvance={() => detailState.setAdvanceOpen(true)}
        onOpenTryInSend={() => detailState.setTryInSendOpen(true)}
        onOpenTryInReturn={() => detailState.setTryInReturnOpen(true)}
        onOpenOutsource={() => detailState.setOutsourceOpen(true)}
        onReturnFromOutsource={detailState.handleReturnFromOutsource}
        onTrash={detailState.handleTrash}
        onRestore={detailState.handleRestore}
        onPermanentDelete={detailState.handlePermanentDelete}
      />

      {/* Alert Banners */}
      <DentalCaseAlertBanners
        c={c}
        attachments={detailState.attachments}
        history={detailState.history}
        isOverdue={isOverdue}
        daysOverdue={daysOverdue}
        snoozing={detailState.snoozing}
        caseBusy={detailState.caseBusy}
        handleSnoozeOverdue={detailState.handleSnoozeOverdue}
        handleReturnFromOutsource={detailState.handleReturnFromOutsource}
        handleRestore={detailState.handleRestore}
        handlePermanentDelete={detailState.handlePermanentDelete}
        onOpenTryInReturn={() => detailState.setTryInReturnOpen(true)}
        onSelectModel={detailState.setSelectedModel}
      />

      {/* Main Grid Chassis */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <DentalCaseInfoCard c={c} />
          <DentalCaseTimelineCard history={detailState.history} />
          <DentalCaseStagesCard
            stages={detailState.stages}
            isDeleted={c.isDeleted}
            onAssignStage={(s) => detailState.setAssignStage(s)}
          />
          <DentalCaseTeamQualityCards
            assignments={c.assignments}
            qualityChecks={detailState.qualityChecks}
            refabrications={detailState.refabrications}
            latestCheck={detailState.latestCheck}
            refabBusyId={detailState.refabBusyId}
            onOpenQuality={() => detailState.setQualityOpen(true)}
            onOpenRefab={() => detailState.setRefabOpen(true)}
            onResolveRefab={detailState.handleResolveRefab}
          />
          <DentalCaseMaterialsCard
            materialUsages={detailState.materialUsages}
            isDeleted={c.isDeleted}
            materialBusy={detailState.materialBusy}
            onOpenConsume={detailState.handleOpenMaterialConsume}
            onDeleteUsage={detailState.handleDeleteMaterialUsage}
          />
        </div>

        <div className="space-y-6">
          <DentalCaseFilesCard
            caseId={c.id}
            caseNumber={c.caseNumber || c.id}
            attachments={detailState.attachments}
            uploading={detailState.uploading}
            uploadItems={detailState.uploadItems}
            uploadDragOver={detailState.uploadDragOver}
            fileInputRef={detailState.fileInputRef}
            designReviewInputRef={detailState.designReviewInputRef}
            handleUpload={detailState.handleUpload}
            handleDesignReviewUpload={detailState.handleDesignReviewUpload}
            handleUploadDragOver={detailState.handleUploadDragOver}
            handleUploadDragLeave={detailState.handleUploadDragLeave}
            handleUploadDrop={detailState.handleUploadDrop}
            retryUpload={detailState.retryUpload}
            clearFinishedUploads={detailState.clearFinishedUploads}
            onRefresh={detailState.refresh}
          />
          <DentalCaseInvoicesCard
            invoices={c.invoices}
            customValues={c.customValues}
            onAddPayment={(inv) => detailState.setPaymentInvoice(inv)}
          />
        </div>
      </div>

      {/* Modals */}
      {detailState.advanceOpen && next && (
        <DentalCaseAdvanceModal
          caseData={c}
          next={next}
          technicians={detailState.technicians}
          onClose={() => detailState.setAdvanceOpen(false)}
          onSaved={() => {
            detailState.setAdvanceOpen(false);
            detailState.refresh();
          }}
        />
      )}

      {detailState.statusOpen && (
        <DentalCaseEditModal
          caseData={c}
          doctors={detailState.doctors}
          workTypes={detailState.workTypes}
          onClose={() => detailState.setStatusOpen(false)}
          onSaved={() => {
            detailState.setStatusOpen(false);
            detailState.refresh();
          }}
        />
      )}

      {detailState.assignStage && (
        <DentalCaseAssignStageModal
          caseId={c.id}
          stage={
            (c.stages || []).find((s) => s.id === detailState.assignStage?.id) ||
            detailState.assignStage
          }
          technicians={detailState.technicians}
          onClose={() => detailState.setAssignStage(null)}
          onSaved={() => detailState.refresh()}
        />
      )}

      {detailState.tryInSendOpen && (
        <DentalCaseSendToTryInModal
          caseId={c.id}
          onClose={() => detailState.setTryInSendOpen(false)}
          onSaved={() => {
            detailState.setTryInSendOpen(false);
            detailState.refresh();
          }}
        />
      )}

      {detailState.tryInReturnOpen && (
        <DentalCaseReturnFromTryInModal
          caseId={c.id}
          onClose={() => detailState.setTryInReturnOpen(false)}
          onSaved={() => {
            detailState.setTryInReturnOpen(false);
            detailState.refresh();
          }}
        />
      )}

      {detailState.outsourceOpen && (
        <DentalCaseOutsourceModal
          caseId={c.id}
          onClose={() => detailState.setOutsourceOpen(false)}
          onSaved={() => {
            detailState.setOutsourceOpen(false);
            detailState.refresh();
          }}
        />
      )}

      {detailState.paymentInvoice && (
        <DentalCasePaymentModal
          invoice={detailState.paymentInvoice}
          onClose={() => detailState.setPaymentInvoice(null)}
          onSaved={() => {
            detailState.setPaymentInvoice(null);
            detailState.refresh();
          }}
        />
      )}

      {detailState.qualityOpen && (
        <DentalCaseQualityModal
          caseId={c.id}
          onClose={() => detailState.setQualityOpen(false)}
          onSaved={() => {
            detailState.setQualityOpen(false);
            detailState.refresh();
          }}
        />
      )}

      {detailState.refabOpen && (
        <DentalCaseRefabricationModal
          caseId={c.id}
          onClose={() => detailState.setRefabOpen(false)}
          onSaved={() => {
            detailState.setRefabOpen(false);
            detailState.refresh();
          }}
        />
      )}

      {detailState.materialConsumeOpen && (
        <DentalCaseMaterialConsumeModal
          materialsList={detailState.materialsList}
          selectedMatId={detailState.selectedMatId}
          selectedStockId={detailState.selectedStockId}
          consumeUnits={detailState.consumeUnits}
          consumeNotes={detailState.consumeNotes}
          materialBusy={detailState.materialBusy}
          onSelectMatId={detailState.setSelectedMatId}
          onSelectStockId={detailState.setSelectedStockId}
          onChangeUnits={detailState.setConsumeUnits}
          onChangeNotes={detailState.setConsumeNotes}
          onSubmit={detailState.handleConsumeSubmit}
          onClose={() => !detailState.materialBusy && detailState.setMaterialConsumeOpen(false)}
        />
      )}
    </div>
  );
}
