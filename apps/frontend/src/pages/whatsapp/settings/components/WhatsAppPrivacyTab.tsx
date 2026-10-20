import React from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, RefreshCw, Save } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { WhatsAppSurfaceCard } from "../../components/WhatsAppPageShell";
import { getContactDisplayPhone } from "../../whatsappContactDisplay";
import type {
  PrivacySettingsState,
  Session,
} from "../types/whatsAppSettingsTypes";
import { privacyOptionKeys } from "../types/whatsAppSettingsTypes";
import {
  EmptyScopedSessionAlert,
  SessionScopeSelector,
} from "../utils/whatsAppSettingsUtils";

interface WhatsAppPrivacyTabProps {
  connectedSessions: Session[];
  scopedSessionId: string;
  onScopedSessionChange: (id: string) => void;
  currentScopedSession: Session | null;
  privacySettings: PrivacySettingsState | null;
  setPrivacySettings: React.Dispatch<
    React.SetStateAction<PrivacySettingsState | null>
  >;
  blocklist: string[];
  loadingPrivacy: boolean;
  saving: boolean;
  onSavePrivacy: () => void;
  onUnblock: (jid: string) => void;
}

export const WhatsAppPrivacyTab: React.FC<WhatsAppPrivacyTabProps> = ({
  connectedSessions,
  scopedSessionId,
  onScopedSessionChange,
  currentScopedSession,
  privacySettings,
  setPrivacySettings,
  blocklist,
  loadingPrivacy,
  saving,
  onSavePrivacy,
  onUnblock,
}) => {
  const { t } = useTranslation();
  const ts = (key: string, opts?: Record<string, unknown>) =>
    (t(key, opts as any) as unknown) as string;

  return (
    <div className="space-y-4">
      <WhatsAppSurfaceCard
        title={ts("whatsappSettings.privacySettings")}
        description={ts("whatsappSettings.privacySettings")}
        action={
          <SessionScopeSelector
            label={t("whatsappSettings.selectSession")}
            sessions={connectedSessions}
            value={scopedSessionId}
            onValueChange={onScopedSessionChange}
          />
        }
      >
        {connectedSessions.length === 0 ? (
          <EmptyScopedSessionAlert
            title={t("whatsappSettings.selectSession")}
            message={t("whatsappSettings.privacySettings")}
          />
        ) : loadingPrivacy ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <Skeleton className="h-80 rounded-3xl" />
            <Skeleton className="h-80 rounded-3xl" />
          </div>
        ) : privacySettings ? (
          <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-2xl border border-[color:color-mix(in_srgb,var(--shell-control-border)_80%,transparent)] bg-[color:var(--color-card)]/70 p-4 sm:p-5 space-y-4 shadow-none">
                <div className="border-b border-[color:color-mix(in_srgb,var(--shell-control-border)_60%,transparent)] pb-3">
                  <h3 className="text-sm font-semibold text-[color:var(--color-foreground)] sm:text-base">
                    {ts("whatsappSettings.privacySettings")}
                  </h3>
                  <p className="text-xs text-[color:var(--color-muted-foreground)]">
                    {currentScopedSession?.name ||
                      ts("whatsappSettings.privacy")}
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    { key: "lastSeen", label: t("whatsappSettings.lastSeen") },
                    {
                      key: "profilePhoto",
                      label: t("whatsappSettings.profilePhoto"),
                    },
                    { key: "status", label: t("whatsappSettings.status") },
                    { key: "groupAdd", label: t("whatsappSettings.groupAdd") },
                  ].map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label>{field.label}</Label>
                      <Select
                        value={
                          privacySettings[
                            field.key as keyof PrivacySettingsState
                          ] || "all"
                        }
                        onValueChange={(value) =>
                          setPrivacySettings((previous) =>
                            previous
                              ? {
                                  ...previous,
                                  [field.key]: value,
                                }
                              : previous,
                          )
                        }
                      >
                        <SelectTrigger className="h-11 bg-[color:var(--color-card)]">
                          <SelectValue placeholder={field.label} />
                        </SelectTrigger>
                        <SelectContent>
                          {privacyOptionKeys.map((optionKey) => (
                            <SelectItem key={optionKey} value={optionKey}>
                              {t(`whatsappSettings.privacyOptions.${optionKey}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[color:color-mix(in_srgb,var(--shell-control-border)_80%,transparent)] bg-[color:var(--color-card)]/70 p-4 sm:p-5 space-y-4 shadow-none">
                <div className="border-b border-[color:color-mix(in_srgb,var(--shell-control-border)_60%,transparent)] pb-3">
                  <h3 className="text-sm font-semibold text-[color:var(--color-foreground)] sm:text-base">
                    {ts("whatsappSettings.blocklist")}
                  </h3>
                  <p className="text-xs text-[color:var(--color-muted-foreground)]">
                    {ts("whatsappSettings.noBlocked")}
                  </p>
                </div>
                {blocklist.length === 0 ? (
                  <Alert className="rounded-2xl border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]">
                    <AlertCircle className="size-4 text-[color:var(--color-warning)]" />
                    <AlertTitle>{t("whatsappSettings.blocklist")}</AlertTitle>
                    <AlertDescription>
                      {t("whatsappSettings.noBlocked")}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {blocklist.map((jid) => (
                      <div
                        key={jid}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] px-4 py-3"
                      >
                        <div className="space-y-1">
                          <p
                            className="text-sm font-medium text-[color:var(--color-foreground)] font-mono tabular-nums"
                            dir="ltr"
                          >
                            {getContactDisplayPhone({ jid })}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)] hover:bg-[color:var(--color-card)]"
                          onClick={() => onUnblock(jid)}
                        >
                          {t("whatsappSettings.unblock")}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Button
              className="rounded-full bg-[color:var(--business-success)] px-5 text-white hover:brightness-90"
              onClick={onSavePrivacy}
              disabled={saving}
            >
              {saving ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {t("whatsappSettings.savePrivacy")}
            </Button>
          </div>
        ) : (
          <EmptyScopedSessionAlert
            title={t("whatsappSettings.selectSession")}
            message={t("whatsappSettings.selectSession")}
          />
        )}
      </WhatsAppSurfaceCard>
    </div>
  );
};
