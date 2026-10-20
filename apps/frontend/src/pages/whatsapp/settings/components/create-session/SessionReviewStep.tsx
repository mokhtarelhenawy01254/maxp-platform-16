import React from "react";
import { useTranslation } from "react-i18next";
import { Copy, Info } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { WhatsAppProvider } from "../../types/whatsAppSettingsTypes";

interface SessionReviewStepProps {
  newSessionName: string;
  newSessionProvider: WhatsAppProvider;
  newPhoneNumber: string;
  newImportHistory: boolean;
  newMetaPhoneNumberId: string;
  newMetaWabaId: string;
  newMetaBusinessId: string;
  newMetaApiVersion: string;
  newMetaDisplayPhoneNumber: string;
  newMetaWebhookVerifyToken: string;
  getMetaWebhookUrl: () => string;
}

export const SessionReviewStep: React.FC<SessionReviewStepProps> = ({
  newSessionName,
  newSessionProvider,
  newPhoneNumber,
  newImportHistory,
  newMetaPhoneNumberId,
  newMetaWabaId,
  newMetaBusinessId,
  newMetaApiVersion,
  newMetaDisplayPhoneNumber,
  newMetaWebhookVerifyToken,
  getMetaWebhookUrl,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 animate-in fade-in-50 duration-200">
      <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[color:var(--shell-control-border)] pb-4">
          <h4 className="font-semibold text-base text-[color:var(--color-foreground)]">
            {t("whatsappSettings.dialogs.reviewDetails")}
          </h4>
          <Badge
            variant="outline"
            className="px-3 py-1 font-medium bg-[var(--app-panel-bg)]"
          >
            {newSessionProvider === "META_CLOUD"
              ? "Meta Cloud API"
              : "Baileys"}
          </Badge>
        </div>

        <div className="grid gap-y-3 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-[color:var(--color-muted-foreground)]">
              {t("whatsappSettings.dialogs.sessionName")}
            </span>
            <span className="font-medium text-[color:var(--color-foreground)]">
              {newSessionName}
            </span>
          </div>

          {newSessionProvider === "BAILEYS" ? (
            <>
              <div className="flex justify-between py-1 border-t border-[color:color-mix(in_srgb,var(--shell-control-border)_40%,transparent)]">
                <span className="text-[color:var(--color-muted-foreground)]">
                  {t("whatsappSettings.dialogs.phoneNumber")}
                </span>
                <span
                  className="font-medium text-[color:var(--color-foreground)] font-mono tabular-nums"
                  dir="ltr"
                >
                  {newPhoneNumber || "-"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-t border-[color:color-mix(in_srgb,var(--shell-control-border)_40%,transparent)]">
                <span className="text-[color:var(--color-muted-foreground)]">
                  {t("whatsappSettings.dialogs.importHistory")}
                </span>
                <span className="font-medium text-[color:var(--color-foreground)]">
                  {newImportHistory ? t("common.yes") : t("common.no")}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between py-1 border-t border-[color:color-mix(in_srgb,var(--shell-control-border)_40%,transparent)]">
                <span className="text-[color:var(--color-muted-foreground)]">
                  Phone Number ID
                </span>
                <span
                  className="font-medium font-mono tabular-nums text-[color:var(--color-foreground)]"
                  dir="ltr"
                >
                  {newMetaPhoneNumberId}
                </span>
              </div>
              <div className="flex justify-between py-1 border-t border-[color:color-mix(in_srgb,var(--shell-control-border)_40%,transparent)]">
                <span className="text-[color:var(--color-muted-foreground)]">
                  WABA ID
                </span>
                <span
                  className="font-medium font-mono tabular-nums text-[color:var(--color-foreground)]"
                  dir="ltr"
                >
                  {newMetaWabaId}
                </span>
              </div>
              <div className="flex justify-between py-1 border-t border-[color:color-mix(in_srgb,var(--shell-control-border)_40%,transparent)]">
                <span className="text-[color:var(--color-muted-foreground)]">
                  Business ID
                </span>
                <span
                  className="font-medium font-mono tabular-nums text-[color:var(--color-foreground)]"
                  dir="ltr"
                >
                  {newMetaBusinessId}
                </span>
              </div>
              <div className="flex justify-between py-1 border-t border-[color:color-mix(in_srgb,var(--shell-control-border)_40%,transparent)]">
                <span className="text-[color:var(--color-muted-foreground)]">
                  API Version
                </span>
                <span
                  className="font-medium font-mono text-[color:var(--color-foreground)]"
                  dir="ltr"
                >
                  {newMetaApiVersion || "v25.0"}
                </span>
              </div>
              {newMetaDisplayPhoneNumber && (
                <div className="flex justify-between py-1 border-t border-[color:color-mix(in_srgb,var(--shell-control-border)_40%,transparent)]">
                  <span className="text-[color:var(--color-muted-foreground)]">
                    Display Phone
                  </span>
                  <span
                    className="font-medium font-mono tabular-nums text-[color:var(--color-foreground)]"
                    dir="ltr"
                  >
                    {newMetaDisplayPhoneNumber}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-1 border-t border-[color:color-mix(in_srgb,var(--shell-control-border)_40%,transparent)]">
                <span className="text-[color:var(--color-muted-foreground)]">
                  Webhook URL
                </span>
                <span
                  className="font-medium font-mono text-xs text-[color:var(--color-foreground)] flex items-center gap-1.5"
                  dir="ltr"
                >
                  {getMetaWebhookUrl()}
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(getMetaWebhookUrl());
                      toast.success("تم نسخ رابط الويب هوك");
                    }}
                    className="hover:text-primary cursor-pointer"
                    title="نسخ"
                  >
                    <Copy className="size-3.5" />
                  </button>
                </span>
              </div>
              <div className="flex justify-between py-1 border-t border-[color:color-mix(in_srgb,var(--shell-control-border)_40%,transparent)]">
                <span className="text-[color:var(--color-muted-foreground)]">
                  Verify Token
                </span>
                <span
                  className="font-medium font-mono text-xs text-[color:var(--color-foreground)] flex items-center gap-1.5"
                  dir="ltr"
                >
                  {newMetaWebhookVerifyToken || "-"}
                  {newMetaWebhookVerifyToken && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          newMetaWebhookVerifyToken,
                        );
                        toast.success("تم نسخ رمز التحقق");
                      }}
                      className="hover:text-primary cursor-pointer"
                      title="نسخ"
                    >
                      <Copy className="size-3.5" />
                    </button>
                  )}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <Alert className="rounded-2xl border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]">
        <Info className="size-4 text-[color:var(--color-primary)]" />
        <AlertDescription>
          {t("whatsappSettings.dialogs.confirmPrompt")}
        </AlertDescription>
      </Alert>
    </div>
  );
};
