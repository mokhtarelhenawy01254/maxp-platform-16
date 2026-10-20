import React from "react";
import { useTranslation } from "react-i18next";
import { Globe, Smartphone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { WhatsAppProvider } from "../../types/whatsAppSettingsTypes";

interface SessionBasicsStepProps {
  newSessionName: string;
  setNewSessionName: (val: string) => void;
  newSessionProvider: WhatsAppProvider;
  setNewSessionProvider: (val: WhatsAppProvider) => void;
  onSelectMetaCloud: () => void;
}

export const SessionBasicsStep: React.FC<SessionBasicsStepProps> = ({
  newSessionName,
  setNewSessionName,
  newSessionProvider,
  setNewSessionProvider,
  onSelectMetaCloud,
}) => {
  const { t } = useTranslation();
  const ts = (key: string, opts?: Record<string, unknown>) =>
    (t(key, opts as any) as unknown) as string;

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <div className="space-y-2">
        <Label className="flex items-center gap-1" htmlFor="session-name">
          {t("whatsappSettings.dialogs.sessionName")}
          <span className="text-red-500">*</span>
        </Label>
        <Input
          id="session-name"
          autoFocus
          value={newSessionName}
          onChange={(event) => setNewSessionName(event.target.value)}
          placeholder={
            ts("whatsappSettings.dialogs.sessionNamePlaceholder") as string
          }
          className="h-11 bg-[color:var(--color-card)]"
        />
      </div>

      <div className="space-y-3">
        <Label className="block">
          {t("whatsappSettings.dialogs.providerRadioLabel")}
        </Label>
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setNewSessionProvider("BAILEYS")}
            className={cn(
              "flex flex-col items-start gap-3 rounded-2xl border p-5 text-start transition-all cursor-pointer",
              newSessionProvider === "BAILEYS"
                ? "border-[color:var(--color-primary)] bg-primary/8 ring-2 ring-[color:var(--color-primary)]"
                : "border-[color:var(--shell-control-border)] hover:bg-[color:var(--color-muted)]",
            )}
          >
            <div
              className={cn(
                "rounded-full p-2.5",
                newSessionProvider === "BAILEYS"
                  ? "bg-[color:var(--color-primary)] text-white"
                  : "bg-[color:var(--color-card)] text-[color:var(--color-muted-foreground)]",
              )}
            >
              <Smartphone className="size-5" />
            </div>
            <div>
              <h4 className="font-semibold text-[color:var(--color-foreground)]">
                {t("whatsappSettings.dialogs.providerBaileysTitle")}
              </h4>
              <p className="mt-1 text-xs leading-5 text-[color:var(--color-muted-foreground)]">
                {t("whatsappSettings.dialogs.providerBaileysDesc")}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setNewSessionProvider("META_CLOUD");
              onSelectMetaCloud();
            }}
            className={cn(
              "flex flex-col items-start gap-3 rounded-2xl border p-5 text-start transition-all cursor-pointer",
              newSessionProvider === "META_CLOUD"
                ? "border-[color:var(--color-primary)] bg-primary/8 ring-2 ring-[color:var(--color-primary)]"
                : "border-[color:var(--shell-control-border)] hover:bg-[color:var(--color-muted)]",
            )}
          >
            <div
              className={cn(
                "rounded-full p-2.5",
                newSessionProvider === "META_CLOUD"
                  ? "bg-[color:var(--color-primary)] text-white"
                  : "bg-[color:var(--color-card)] text-[color:var(--color-muted-foreground)]",
              )}
            >
              <Globe className="size-5" />
            </div>
            <div>
              <h4 className="font-semibold text-[color:var(--color-foreground)]">
                {t("whatsappSettings.dialogs.providerMetaTitle")}
              </h4>
              <p className="mt-1 text-xs leading-5 text-[color:var(--color-muted-foreground)]">
                {t("whatsappSettings.dialogs.providerMetaDesc")}
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
