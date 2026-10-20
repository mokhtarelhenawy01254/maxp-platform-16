import React from "react";
import LabelContactsDialog from "@/components/whatsapp/LabelContactsDialog";
import { WhatsAppCreateSessionDialog } from "./WhatsAppCreateSessionDialog";
import { WhatsAppEditSessionDialog } from "./WhatsAppEditSessionDialog";
import { WhatsAppQuickReplyDialog } from "./WhatsAppQuickReplyDialog";
import { WhatsAppLabelDialog } from "./WhatsAppLabelDialog";
import { WhatsAppQrDialog } from "./WhatsAppQrDialog";
import { WhatsAppWebhookDialog } from "./WhatsAppWebhookDialog";
import { WhatsAppDeleteDialog } from "./WhatsAppDeleteDialog";
import type { useWhatsAppSettingsData } from "../hooks/useWhatsAppSettingsData";

interface WhatsAppSettingsDialogsProps {
  data: ReturnType<typeof useWhatsAppSettingsData>;
}

export const WhatsAppSettingsDialogs: React.FC<
  WhatsAppSettingsDialogsProps
> = ({ data }) => {
  return (
    <>
      <WhatsAppCreateSessionDialog
        open={data.createSessionDialogOpen}
        onOpenChange={data.setCreateSessionDialogOpen}
        wizardStep={data.wizardStep}
        setWizardStep={data.setWizardStep}
        newSessionName={data.newSessionName}
        setNewSessionName={data.setNewSessionName}
        newPhoneNumber={data.newPhoneNumber}
        setNewPhoneNumber={data.setNewPhoneNumber}
        newImportHistory={data.newImportHistory}
        setNewImportHistory={data.setNewImportHistory}
        newKeepHistoryOnDelete={data.newKeepHistoryOnDelete}
        setNewKeepHistoryOnDelete={data.setNewKeepHistoryOnDelete}
        newSessionProvider={data.newSessionProvider}
        setNewSessionProvider={data.setNewSessionProvider}
        newMetaPhoneNumberId={data.newMetaPhoneNumberId}
        setNewMetaPhoneNumberId={data.setNewMetaPhoneNumberId}
        newMetaWabaId={data.newMetaWabaId}
        setNewMetaWabaId={data.setNewMetaWabaId}
        newMetaBusinessId={data.newMetaBusinessId}
        setNewMetaBusinessId={data.setNewMetaBusinessId}
        newMetaAccessToken={data.newMetaAccessToken}
        setNewMetaAccessToken={data.setNewMetaAccessToken}
        newMetaApiVersion={data.newMetaApiVersion}
        setNewMetaApiVersion={data.setNewMetaApiVersion}
        newMetaWebhookVerifyToken={data.newMetaWebhookVerifyToken}
        setNewMetaWebhookVerifyToken={data.setNewMetaWebhookVerifyToken}
        newMetaWebhookSecret={data.newMetaWebhookSecret}
        setNewMetaWebhookSecret={data.setNewMetaWebhookSecret}
        newMetaDisplayPhoneNumber={data.newMetaDisplayPhoneNumber}
        setNewMetaDisplayPhoneNumber={data.setNewMetaDisplayPhoneNumber}
        showAdvancedMeta={data.showAdvancedMeta}
        setShowAdvancedMeta={data.setShowAdvancedMeta}
        showManualMeta={data.showManualMeta}
        setShowManualMeta={data.setShowManualMeta}
        generateRandomVerifyToken={data.generateRandomVerifyToken}
        getMetaWebhookUrl={data.getMetaWebhookUrl}
        saving={data.saving}
        creatingSession={data.creatingSession}
        onCreateSession={() => void data.handleCreateSession()}
        onResetForm={data.resetNewSessionForm}
      />

      <WhatsAppEditSessionDialog
        editingSession={data.editingSession}
        setEditingSession={data.setEditingSession}
        saving={data.saving}
        onUpdateSession={() => void data.handleUpdateSession()}
        onClose={() => data.setEditingSession(null)}
        getMetaWebhookUrl={data.getMetaWebhookUrl}
      />

      <WhatsAppQuickReplyDialog
        open={data.quickReplyDialogOpen}
        onOpenChange={data.setQuickReplyDialogOpen}
        editingQuickReply={data.editingQuickReply}
        quickReplyForm={data.quickReplyForm}
        setQuickReplyForm={data.setQuickReplyForm}
        saving={data.saving}
        onSaveQuickReply={() => void data.handleSaveQuickReply()}
        onClose={() => {
          data.setQuickReplyDialogOpen(false);
          data.setEditingQuickReply(null);
        }}
      />

      <WhatsAppLabelDialog
        open={data.labelDialogOpen}
        onOpenChange={data.setLabelDialogOpen}
        labelForm={data.labelForm}
        setLabelForm={data.setLabelForm}
        saving={data.saving}
        onCreateLabel={() => void data.handleCreateLabel()}
        onClose={() => data.setLabelDialogOpen(false)}
      />

      <LabelContactsDialog
        open={Boolean(data.labelContactsLabel)}
        onClose={() => data.setLabelContactsLabel(null)}
        sessionId={data.scopedSessionId || ""}
        label={data.labelContactsLabel}
        onSynced={() => {
          if (data.scopedSessionId) {
            void data.loadLabels(data.scopedSessionId);
          }
        }}
      />

      <WhatsAppQrDialog
        open={data.qrDialogOpen}
        onOpenChange={data.setQrDialogOpen}
        currentQR={data.currentQR}
        currentPairingCode={data.currentPairingCode}
        currentPairingPhone={data.currentPairingPhone}
        qrRefreshed={data.qrRefreshed}
        onClose={() => data.setQrDialogOpen(false)}
      />

      <WhatsAppWebhookDialog
        open={data.webhookDetailsOpen}
        onOpenChange={data.setWebhookDetailsOpen}
        webhookDetailsSession={data.webhookDetailsSession}
        newMetaWebhookVerifyToken={data.newMetaWebhookVerifyToken}
        getMetaWebhookUrl={data.getMetaWebhookUrl}
        onClose={() => data.setWebhookDetailsOpen(false)}
      />

      <WhatsAppDeleteDialog
        open={!!data.deleteState}
        onOpenChange={(open) => {
          if (!open) {
            data.setDeleteState(null);
          }
        }}
        deleteState={data.deleteState}
        keepHistory={data.keepHistory}
        setKeepHistory={data.setKeepHistory}
        saving={data.saving}
        onConfirmDelete={() => void data.handleConfirmDelete()}
        onClose={() => data.setDeleteState(null)}
      />
    </>
  );
};
