import React from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { WhatsAppProvider } from "../types/whatsAppSettingsTypes";
import { SessionBasicsStep } from "./create-session/SessionBasicsStep";
import { SessionBaileysStep } from "./create-session/SessionBaileysStep";
import { SessionMetaCloudStep } from "./create-session/SessionMetaCloudStep";
import { SessionReviewStep } from "./create-session/SessionReviewStep";

interface WhatsAppCreateSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wizardStep: number;
  setWizardStep: (step: number | ((prev: number) => number)) => void;
  newSessionName: string;
  setNewSessionName: (name: string) => void;
  newPhoneNumber: string;
  setNewPhoneNumber: (phone: string) => void;
  newImportHistory: boolean;
  setNewImportHistory: (val: boolean) => void;
  newKeepHistoryOnDelete: boolean;
  setNewKeepHistoryOnDelete: (val: boolean) => void;
  newSessionProvider: WhatsAppProvider;
  setNewSessionProvider: (provider: WhatsAppProvider) => void;
  newMetaPhoneNumberId: string;
  setNewMetaPhoneNumberId: (id: string) => void;
  newMetaWabaId: string;
  setNewMetaWabaId: (id: string) => void;
  newMetaBusinessId: string;
  setNewMetaBusinessId: (id: string) => void;
  newMetaAccessToken: string;
  setNewMetaAccessToken: (token: string) => void;
  newMetaApiVersion: string;
  setNewMetaApiVersion: (ver: string) => void;
  newMetaWebhookVerifyToken: string;
  setNewMetaWebhookVerifyToken: (token: string) => void;
  newMetaWebhookSecret: string;
  setNewMetaWebhookSecret: (sec: string) => void;
  newMetaDisplayPhoneNumber: string;
  setNewMetaDisplayPhoneNumber: (phone: string) => void;
  showAdvancedMeta: boolean;
  setShowAdvancedMeta: (show: boolean | ((prev: boolean) => boolean)) => void;
  showManualMeta: boolean;
  setShowManualMeta: (show: boolean | ((prev: boolean) => boolean)) => void;
  generateRandomVerifyToken: () => string;
  getMetaWebhookUrl: () => string;
  saving: boolean;
  creatingSession: boolean;
  onCreateSession: () => void;
  onResetForm: () => void;
}

export const WhatsAppCreateSessionDialog: React.FC<
  WhatsAppCreateSessionDialogProps
> = ({
  open,
  onOpenChange,
  wizardStep,
  setWizardStep,
  newSessionName,
  setNewSessionName,
  newPhoneNumber,
  setNewPhoneNumber,
  newImportHistory,
  setNewImportHistory,
  newKeepHistoryOnDelete,
  setNewKeepHistoryOnDelete,
  newSessionProvider,
  setNewSessionProvider,
  newMetaPhoneNumberId,
  setNewMetaPhoneNumberId,
  newMetaWabaId,
  setNewMetaWabaId,
  newMetaBusinessId,
  setNewMetaBusinessId,
  newMetaAccessToken,
  setNewMetaAccessToken,
  newMetaApiVersion,
  setNewMetaApiVersion,
  newMetaWebhookVerifyToken,
  setNewMetaWebhookVerifyToken,
  newMetaWebhookSecret,
  setNewMetaWebhookSecret,
  newMetaDisplayPhoneNumber,
  setNewMetaDisplayPhoneNumber,
  showAdvancedMeta,
  setShowAdvancedMeta,
  showManualMeta,
  setShowManualMeta,
  generateRandomVerifyToken,
  getMetaWebhookUrl,
  saving,
  creatingSession,
  onCreateSession,
  onResetForm,
}) => {
  const { t, i18n } = useTranslation();

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) {
          onResetForm();
        }
      }}
    >
      <DialogContent className="max-w-[calc(100%-1.5rem)] rounded-3xl border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-[color:color-mix(in_srgb,var(--shell-control-border)_72%,transparent)] px-6 pt-6">
          <DialogTitle>{t("whatsappSettings.dialogs.addSessionTitle")}</DialogTitle>
          <DialogDescription>{t("whatsappSettings.description")}</DialogDescription>
        </DialogHeader>

        {/* Stepper progress indicator */}
        <div className="px-6 pt-4">
          <div className="relative flex items-center justify-between px-2 pt-2">
            <div className="absolute top-[18px] left-[10%] right-[10%] h-0.5 bg-[color:var(--shell-control-border)] -z-10 overflow-hidden">
              <div
                className="h-full bg-[color:var(--color-primary)] transition-all duration-300"
                style={{
                  width: `${((wizardStep - 1) / 2) * 100}%`,
                  float: i18n.dir() === "rtl" ? "right" : "left",
                }}
              />
            </div>

            {[
              { number: 1, label: t("whatsappSettings.dialogs.stepBasics") },
              { number: 2, label: t("whatsappSettings.dialogs.stepConnection") },
              { number: 3, label: t("whatsappSettings.dialogs.stepReview") },
            ].map((step) => {
              const isCompleted = wizardStep > step.number;
              const isActive = wizardStep === step.number;
              return (
                <div key={step.number} className="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    disabled={step.number > wizardStep && !newSessionName.trim()}
                    onClick={() => setWizardStep(step.number)}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all",
                      isCompleted
                        ? "border-[color:var(--color-primary)] bg-[color:var(--color-primary)] text-white"
                        : isActive
                        ? "border-[color:var(--color-primary)] bg-[var(--app-panel-bg)] text-[color:var(--color-primary)] ring-4 ring-primary/15"
                        : "border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] text-[color:var(--color-muted-foreground)]",
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="size-5 fill-white text-[color:var(--color-primary)]" />
                    ) : (
                      step.number
                    )}
                  </button>
                  <span
                    className={cn(
                      "text-[11px] sm:text-xs font-medium text-center",
                      isActive
                        ? "text-[color:var(--color-primary)] font-semibold"
                        : "text-[color:var(--color-muted-foreground)]",
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4 px-6 py-6 max-h-[60vh] overflow-y-auto">
          {wizardStep === 1 && (
            <SessionBasicsStep
              newSessionName={newSessionName}
              setNewSessionName={setNewSessionName}
              newSessionProvider={newSessionProvider}
              setNewSessionProvider={setNewSessionProvider}
              onSelectMetaCloud={() => {
                if (!newMetaWebhookVerifyToken) {
                  generateRandomVerifyToken();
                }
              }}
            />
          )}

          {wizardStep === 2 && newSessionProvider === "BAILEYS" && (
            <SessionBaileysStep
              newPhoneNumber={newPhoneNumber}
              setNewPhoneNumber={setNewPhoneNumber}
              newImportHistory={newImportHistory}
              setNewImportHistory={setNewImportHistory}
              newKeepHistoryOnDelete={newKeepHistoryOnDelete}
              setNewKeepHistoryOnDelete={setNewKeepHistoryOnDelete}
            />
          )}

          {wizardStep === 2 && newSessionProvider === "META_CLOUD" && (
            <SessionMetaCloudStep
              newSessionName={newSessionName}
              newMetaPhoneNumberId={newMetaPhoneNumberId}
              setNewMetaPhoneNumberId={setNewMetaPhoneNumberId}
              newMetaWabaId={newMetaWabaId}
              setNewMetaWabaId={setNewMetaWabaId}
              newMetaBusinessId={newMetaBusinessId}
              setNewMetaBusinessId={setNewMetaBusinessId}
              newMetaAccessToken={newMetaAccessToken}
              setNewMetaAccessToken={setNewMetaAccessToken}
              newMetaApiVersion={newMetaApiVersion}
              setNewMetaApiVersion={setNewMetaApiVersion}
              newMetaWebhookVerifyToken={newMetaWebhookVerifyToken}
              setNewMetaWebhookVerifyToken={setNewMetaWebhookVerifyToken}
              newMetaWebhookSecret={newMetaWebhookSecret}
              setNewMetaWebhookSecret={setNewMetaWebhookSecret}
              newMetaDisplayPhoneNumber={newMetaDisplayPhoneNumber}
              setNewMetaDisplayPhoneNumber={setNewMetaDisplayPhoneNumber}
              showManualMeta={showManualMeta}
              setShowManualMeta={setShowManualMeta}
              showAdvancedMeta={showAdvancedMeta}
              setShowAdvancedMeta={setShowAdvancedMeta}
              generateRandomVerifyToken={generateRandomVerifyToken}
              getMetaWebhookUrl={getMetaWebhookUrl}
            />
          )}

          {wizardStep === 3 && (
            <SessionReviewStep
              newSessionName={newSessionName}
              newSessionProvider={newSessionProvider}
              newPhoneNumber={newPhoneNumber}
              newImportHistory={newImportHistory}
              newMetaPhoneNumberId={newMetaPhoneNumberId}
              newMetaWabaId={newMetaWabaId}
              newMetaBusinessId={newMetaBusinessId}
              newMetaApiVersion={newMetaApiVersion}
              newMetaDisplayPhoneNumber={newMetaDisplayPhoneNumber}
              newMetaWebhookVerifyToken={newMetaWebhookVerifyToken}
              getMetaWebhookUrl={getMetaWebhookUrl}
            />
          )}
        </div>

        <DialogFooter className="px-6 border-t border-[color:color-mix(in_srgb,var(--shell-control-border)_40%,transparent)] pt-4 pb-6 flex items-center justify-between sm:justify-between">
          <div>
            {wizardStep > 1 ? (
              <Button
                variant="outline"
                className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] hover:bg-[color:var(--color-card)] cursor-pointer"
                onClick={() => setWizardStep((prev) => prev - 1)}
              >
                <ChevronLeft className="size-4 rtl:rotate-180" />
                {t("whatsappSettings.dialogs.back")}
              </Button>
            ) : (
              <Button
                variant="outline"
                className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] hover:bg-[color:var(--color-card)] cursor-pointer"
                onClick={() => onOpenChange(false)}
              >
                {t("whatsappSettings.dialogs.cancel")}
              </Button>
            )}
          </div>

          <div>
            {wizardStep < 3 ? (
              <Button
                className="rounded-full bg-[color:var(--color-primary)] px-5 text-white hover:brightness-90 cursor-pointer"
                onClick={() => setWizardStep((prev) => prev + 1)}
                disabled={
                  wizardStep === 1
                    ? !newSessionName.trim()
                    : wizardStep === 2 && newSessionProvider === "META_CLOUD"
                    ? !newMetaPhoneNumberId.trim() ||
                      !newMetaAccessToken.trim() ||
                      !newMetaWabaId.trim() ||
                      !newMetaBusinessId.trim()
                    : false
                }
              >
                {t("whatsappSettings.dialogs.next")}
                <ChevronRight className="size-4 rtl:rotate-180" />
              </Button>
            ) : (
              <Button
                className="rounded-full bg-[color:var(--business-success)] px-5 text-white hover:brightness-90 cursor-pointer"
                onClick={onCreateSession}
                disabled={saving || creatingSession}
              >
                {creatingSession || saving ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                {creatingSession
                  ? t("whatsappSettings.connecting")
                  : t("whatsappSettings.dialogs.create")}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
