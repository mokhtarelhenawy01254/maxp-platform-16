import React from "react";
import { useTranslation } from "react-i18next";
import { QrCode } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SessionBaileysStepProps {
  newPhoneNumber: string;
  setNewPhoneNumber: (val: string) => void;
  newImportHistory: boolean;
  setNewImportHistory: (val: boolean) => void;
  newKeepHistoryOnDelete: boolean;
  setNewKeepHistoryOnDelete: (val: boolean) => void;
}

export const SessionBaileysStep: React.FC<SessionBaileysStepProps> = ({
  newPhoneNumber,
  setNewPhoneNumber,
  newImportHistory,
  setNewImportHistory,
  newKeepHistoryOnDelete,
  setNewKeepHistoryOnDelete,
}) => {
  const { t } = useTranslation();
  const ts = (key: string, opts?: Record<string, unknown>) =>
    (t(key, opts as any) as unknown) as string;

  return (
    <div className="space-y-4 animate-in fade-in-50 duration-200">
      <div className="space-y-2">
        <Label htmlFor="session-phone">
          {t("whatsappSettings.dialogs.phoneNumber")}
        </Label>
        <Input
          id="session-phone"
          value={newPhoneNumber}
          onChange={(event) => setNewPhoneNumber(event.target.value)}
          placeholder={
            ts("whatsappSettings.dialogs.phoneNumberPlaceholder") as string
          }
          className="h-11 bg-[color:var(--color-card)] font-mono tabular-nums"
          dir="ltr"
        />
        <p className="text-sm text-[color:var(--color-muted-foreground)]">
          {t("whatsappSettings.dialogs.phoneNumberHelper")}
        </p>
      </div>

      <label
        htmlFor="session-import-history"
        className="flex items-start gap-3 rounded-xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] p-4 cursor-pointer"
      >
        <Checkbox
          id="session-import-history"
          checked={newImportHistory}
          onCheckedChange={(checked) => setNewImportHistory(checked === true)}
          className="mt-0.5"
        />
        <span className="grid gap-1">
          <span className="text-sm font-semibold text-[color:var(--color-foreground)]">
            {t("whatsappSettings.dialogs.importHistory")}
          </span>
          <span className="text-xs leading-5 text-[color:var(--color-muted-foreground)]">
            {t("whatsappSettings.dialogs.importHistoryHelper")}
          </span>
        </span>
      </label>

      <label
        htmlFor="session-keep-history"
        className="flex items-start gap-3 rounded-xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] p-4 cursor-pointer"
      >
        <Checkbox
          id="session-keep-history"
          checked={newKeepHistoryOnDelete}
          onCheckedChange={(checked) =>
            setNewKeepHistoryOnDelete(checked === true)
          }
          className="mt-0.5"
        />
        <span className="grid gap-1">
          <span className="text-sm font-semibold text-[color:var(--color-foreground)]">
            {t("whatsappSettings.dialogs.keepHistoryOnDelete")}
          </span>
          <span className="text-xs leading-5 text-[color:var(--color-muted-foreground)]">
            {t("whatsappSettings.dialogs.keepHistoryOnDeleteHelper")}
          </span>
        </span>
      </label>

      <Alert className="rounded-2xl border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]">
        <QrCode className="size-4 text-[color:var(--color-primary)]" />
        <AlertTitle>QR Code</AlertTitle>
        <AlertDescription>
          A QR code will appear after creating the session.
        </AlertDescription>
      </Alert>
    </div>
  );
};
